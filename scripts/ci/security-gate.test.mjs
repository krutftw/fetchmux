import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const gatePath = fileURLToPath(new URL("./security-gate.mjs", import.meta.url));

const report = (type, vulnerabilities = [], status = "success") => ({
  scan: { type, status },
  vulnerabilities,
});

const finding = (severity) => (severity === undefined ? {} : { severity });

const baselineReports = () => ({
  "gl-sast-semgrep-report.json": report("sast"),
  "gl-secret-detection-report.json": report("secret_detection"),
  "gl-container-scanning-report.json": report("container_scanning"),
});

const ultimateReports = () => ({
  "gl-sast-advanced-report.json": report("sast"),
  "gl-secret-detection-report.json": report("secret_detection"),
  "gl-dependency-scanning-report.json": report("dependency_scanning"),
  "gl-container-scanning-report.json": report("container_scanning"),
});

const runGate = (reports, { expectUltimate = false, ultimateExpectation } = {}) => {
  const directory = mkdtempSync(join(tmpdir(), "fetchmux-security-gate-"));

  try {
    for (const [name, contents] of Object.entries(reports)) {
      writeFileSync(
        join(directory, name),
        typeof contents === "string" ? contents : JSON.stringify(contents),
        "utf8",
      );
    }

    return spawnSync(process.execPath, [gatePath], {
      cwd: directory,
      encoding: "utf8",
      env: {
        ...process.env,
        FETCHMUX_EXPECT_ULTIMATE_SECURITY: ultimateExpectation ?? String(expectUltimate),
      },
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

describe("security report gate", () => {
  it("passes the required Free-tier baseline without Ultimate reports", () => {
    const result = runGate(baselineReports());

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      "dependency_scanning: report unavailable (Ultimate enhancement skipped)",
    );
    expect(result.stdout).toContain(
      "Security gate passed: 0 blocking findings; 0 advisory findings.",
    );
  });

  it("requires Advanced SAST and dependency scanning while Ultimate is expected", () => {
    const result = runGate(ultimateReports(), { expectUltimate: true });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("sast_advanced: 0 findings (0 blocking, 0 advisory)");
    expect(result.stdout).toContain("dependency_scanning: 0 findings (0 blocking, 0 advisory)");
  });

  it("rejects an ambiguous Ultimate expectation", () => {
    const result = runGate(baselineReports(), { ultimateExpectation: "yes" });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'Security gate failed: FETCHMUX_EXPECT_ULTIMATE_SECURITY must be exactly "true" or "false".',
    );
  });

  it("evaluates Advanced and standard SAST reports independently when both exist", () => {
    const reports = ultimateReports();
    reports["gl-sast-semgrep-report.json"] = report("sast", [finding("High")]);

    const result = runGate(reports, { expectUltimate: true });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("sast_advanced: 0 findings (0 blocking, 0 advisory)");
    expect(result.stdout).toContain("sast_standard: 1 finding (1 blocking, 0 advisory)");
    expect(result.stderr).toContain("Security gate failed: 1 blocking finding.");
  });

  it("reports medium and low container findings without blocking the pipeline", () => {
    const reports = baselineReports();
    reports["gl-container-scanning-report.json"] = report("container_scanning", [
      finding("Medium"),
      finding("Low"),
    ]);

    const result = runGate(reports);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("container_scanning: 2 findings (0 blocking, 2 advisory)");
  });

  it("reports medium dependency findings without blocking the pipeline", () => {
    const reports = ultimateReports();
    reports["gl-dependency-scanning-report.json"] = report("dependency_scanning", [
      finding("Medium"),
    ]);

    const result = runGate(reports, { expectUltimate: true });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("dependency_scanning: 1 finding (0 blocking, 1 advisory)");
  });

  it("blocks medium SAST findings", () => {
    const reports = baselineReports();
    reports["gl-sast-semgrep-report.json"] = report("sast", [finding("Medium")]);

    const result = runGate(reports);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Security gate failed: 1 blocking finding.");
  });

  it("blocks every secret finding regardless of its reported severity", () => {
    const reports = baselineReports();
    reports["gl-secret-detection-report.json"] = report("secret_detection", [finding("Low")]);

    const result = runGate(reports);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Security gate failed: 1 blocking finding.");
  });

  it("blocks critical and high application, dependency, and container findings", () => {
    const reports = ultimateReports();
    reports["gl-sast-advanced-report.json"] = report("sast", [finding("High")]);
    reports["gl-dependency-scanning-report.json"] = report("dependency_scanning", [
      finding("Critical"),
    ]);
    reports["gl-container-scanning-report.json"] = report("container_scanning", [finding("High")]);

    const result = runGate(reports, { expectUltimate: true });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Security gate failed: 3 blocking findings.");
  });

  it("blocks findings whose severity is missing", () => {
    const reports = baselineReports();
    reports["gl-container-scanning-report.json"] = report("container_scanning", [finding()]);

    const result = runGate(reports);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Security gate failed: 1 blocking finding.");
  });

  it("fails closed on malformed report JSON", () => {
    const reports = baselineReports();
    reports["gl-container-scanning-report.json"] = "{not-json";

    const result = runGate(reports);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Security gate failed: Could not read required report gl-container-scanning-report.json.",
    );
  });

  it("fails closed when an Ultimate report is absent while Ultimate is expected", () => {
    const reports = ultimateReports();
    delete reports["gl-dependency-scanning-report.json"];

    const result = runGate(reports, { expectUltimate: true });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Security gate failed: Missing required report gl-dependency-scanning-report.json.",
    );
  });

  it("fails closed when a required baseline report is missing", () => {
    const reports = baselineReports();
    delete reports["gl-container-scanning-report.json"];

    const result = runGate(reports);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Security gate failed: Missing required report gl-container-scanning-report.json.",
    );
  });

  it("fails closed when no SAST report is available", () => {
    const reports = baselineReports();
    delete reports["gl-sast-semgrep-report.json"];

    const result = runGate(reports);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Security gate failed: No SAST report was available.");
  });

  it("fails closed when a scanner did not report success", () => {
    const reports = baselineReports();
    reports["gl-sast-semgrep-report.json"] = report("sast", [], "failure");

    const result = runGate(reports);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Security gate failed: sast_standard scan status was failure.");
  });

  it("fails closed when a report does not match its required scanner type", () => {
    const reports = baselineReports();
    reports["gl-sast-semgrep-report.json"] = report("container_scanning");

    const result = runGate(reports);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Security gate failed: gl-sast-semgrep-report.json reported container_scanning instead of sast.",
    );
  });
});
