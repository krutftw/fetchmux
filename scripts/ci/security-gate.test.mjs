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

const finding = (severity) => ({ severity });

const cleanReports = () => ({
  "gl-sast-report.json": report("sast"),
  "gl-secret-detection-report.json": report("secret_detection"),
  "gl-dependency-scanning-report.json": report("dependency_scanning"),
  "gl-container-scanning-report.json": report("container_scanning"),
});

const runGate = (reports) => {
  const directory = mkdtempSync(join(tmpdir(), "fetchmux-security-gate-"));

  try {
    for (const [name, contents] of Object.entries(reports)) {
      writeFileSync(join(directory, name), JSON.stringify(contents), "utf8");
    }

    return spawnSync(process.execPath, [gatePath], {
      cwd: directory,
      encoding: "utf8",
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

describe("security report gate", () => {
  it("passes when every required scanner succeeded with no findings", () => {
    const result = runGate(cleanReports());

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      "Security gate passed: 0 blocking findings; 0 advisory findings.",
    );
  });

  it("reports medium and low findings without blocking the pipeline", () => {
    const reports = cleanReports();
    reports["gl-container-scanning-report.json"] = report("container_scanning", [
      finding("Medium"),
      finding("Low"),
    ]);

    const result = runGate(reports);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("container_scanning: 2 findings (0 blocking, 2 advisory)");
    expect(result.stdout).toContain(
      "Security gate passed: 0 blocking findings; 2 advisory findings.",
    );
  });

  it("blocks every secret finding regardless of its reported severity", () => {
    const reports = cleanReports();
    reports["gl-secret-detection-report.json"] = report("secret_detection", [finding("Low")]);

    const result = runGate(reports);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Security gate failed: 1 blocking finding.");
  });

  it("blocks critical and high application, dependency, and container findings", () => {
    const reports = cleanReports();
    reports["gl-sast-report.json"] = report("sast", [finding("High")]);
    reports["gl-dependency-scanning-report.json"] = report("dependency_scanning", [
      finding("Critical"),
    ]);
    reports["gl-container-scanning-report.json"] = report("container_scanning", [finding("High")]);

    const result = runGate(reports);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Security gate failed: 3 blocking findings.");
  });

  it("blocks findings with an unknown severity instead of silently downgrading them", () => {
    const reports = cleanReports();
    reports["gl-sast-report.json"] = report("sast", [finding("Unknown")]);

    const result = runGate(reports);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Security gate failed: 1 blocking finding.");
  });

  it("continues with the free-tier baseline when the Ultimate dependency report is missing", () => {
    const reports = cleanReports();
    delete reports["gl-dependency-scanning-report.json"];

    const result = runGate(reports);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      "dependency_scanning: report unavailable (Ultimate enhancement skipped)",
    );
  });

  it("fails closed when a required free-tier report is missing", () => {
    const reports = cleanReports();
    delete reports["gl-container-scanning-report.json"];

    const result = runGate(reports);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Security gate failed: Missing required report gl-container-scanning-report.json.",
    );
  });

  it("fails closed when a scanner did not report success", () => {
    const reports = cleanReports();
    reports["gl-sast-report.json"] = report("sast", [], "failure");

    const result = runGate(reports);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Security gate failed: sast scan status was failure.");
  });

  it("fails closed when a report does not match its required scanner type", () => {
    const reports = cleanReports();
    reports["gl-sast-report.json"] = report("container_scanning");

    const result = runGate(reports);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Security gate failed: gl-sast-report.json reported container_scanning instead of sast.",
    );
  });
});
