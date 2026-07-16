import { readFileSync } from "node:fs";

const ultimateExpectation = process.env.FETCHMUX_EXPECT_ULTIMATE_SECURITY;
const expectUltimate = ultimateExpectation === "true";

const pluralize = (count, singular, plural = `${singular}s`) => (count === 1 ? singular : plural);

const fail = (message) => {
  console.error(`Security gate failed: ${message}`);
  process.exitCode = 1;
};

if (ultimateExpectation !== "true" && ultimateExpectation !== "false") {
  fail('FETCHMUX_EXPECT_ULTIMATE_SECURITY must be exactly "true" or "false".');
}

const reports = [
  {
    fileName: "gl-sast-advanced-report.json",
    expectedType: "sast",
    label: "sast_advanced",
    required: expectUltimate,
    unavailableMessage: "Ultimate enhancement skipped",
  },
  {
    fileName: "gl-sast-semgrep-report.json",
    expectedType: "sast",
    label: "sast_standard",
    required: false,
    unavailableMessage: "not selected for this source set",
  },
  {
    fileName: "gl-secret-detection-report.json",
    expectedType: "secret_detection",
    label: "secret_detection",
    required: true,
  },
  {
    fileName: "gl-dependency-scanning-report.json",
    expectedType: "dependency_scanning",
    label: "dependency_scanning",
    required: expectUltimate,
    unavailableMessage: "Ultimate enhancement skipped",
  },
  {
    fileName: "gl-container-scanning-report.json",
    expectedType: "container_scanning",
    label: "container_scanning",
    required: true,
  },
];

const universallyBlockingSeverities = new Set(["critical", "high", "unknown"]);
const advisorySeverities = new Set(["info", "low", "medium"]);

let blockingFindings = 0;
let advisoryFindings = 0;
let validSastReports = 0;

for (const definition of reports) {
  let report;

  try {
    report = JSON.parse(readFileSync(definition.fileName, "utf8"));
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;

    if (code === "ENOENT" && !definition.required) {
      console.log(`${definition.label}: report unavailable (${definition.unavailableMessage})`);
      continue;
    }

    fail(
      code === "ENOENT"
        ? `Missing required report ${definition.fileName}.`
        : `Could not read required report ${definition.fileName}.`,
    );
    continue;
  }

  if (report?.scan?.type !== definition.expectedType) {
    fail(
      `${definition.fileName} reported ${String(report?.scan?.type)} instead of ${definition.expectedType}.`,
    );
    continue;
  }

  if (report.scan.status !== "success") {
    fail(`${definition.label} scan status was ${String(report.scan.status)}.`);
    continue;
  }

  if (!Array.isArray(report.vulnerabilities)) {
    fail(`${definition.label} report did not contain a vulnerabilities array.`);
    continue;
  }

  if (definition.expectedType === "sast") validSastReports += 1;

  let reportBlocking = 0;
  let reportAdvisory = 0;

  for (const finding of report.vulnerabilities) {
    const severity = String(finding?.severity ?? "unknown").toLowerCase();
    const isBlocking =
      definition.expectedType === "secret_detection" ||
      universallyBlockingSeverities.has(severity) ||
      (definition.expectedType === "sast" && severity === "medium") ||
      !advisorySeverities.has(severity);

    if (isBlocking) reportBlocking += 1;
    else reportAdvisory += 1;
  }

  blockingFindings += reportBlocking;
  advisoryFindings += reportAdvisory;
  console.log(
    `${definition.label}: ${report.vulnerabilities.length} ${pluralize(report.vulnerabilities.length, "finding")} (${reportBlocking} blocking, ${reportAdvisory} advisory)`,
  );
}

if (validSastReports === 0) fail("No SAST report was available.");
if (blockingFindings > 0) {
  fail(`${blockingFindings} blocking ${pluralize(blockingFindings, "finding")}.`);
}

if (!process.exitCode) {
  console.log(
    `Security gate passed: 0 blocking findings; ${advisoryFindings} advisory ${pluralize(advisoryFindings, "finding")}.`,
  );
}
