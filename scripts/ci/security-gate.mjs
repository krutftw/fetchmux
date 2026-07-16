import { readFileSync } from "node:fs";

const requiredReports = [
  ["gl-sast-report.json", "sast", true],
  ["gl-secret-detection-report.json", "secret_detection", true],
  ["gl-dependency-scanning-report.json", "dependency_scanning", false],
  ["gl-container-scanning-report.json", "container_scanning", true],
];

const advisorySeverities = new Set(["info", "low", "medium"]);
const blockingSeverities = new Set(["critical", "high", "unknown"]);

const pluralize = (count, singular, plural = `${singular}s`) => (count === 1 ? singular : plural);

const fail = (message) => {
  console.error(`Security gate failed: ${message}`);
  process.exitCode = 1;
};

let blockingFindings = 0;
let advisoryFindings = 0;

for (const [fileName, expectedType, required] of requiredReports) {
  let report;

  try {
    report = JSON.parse(readFileSync(fileName, "utf8"));
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    if (code === "ENOENT" && !required) {
      console.log(`${expectedType}: report unavailable (Ultimate enhancement skipped)`);
      continue;
    }
    fail(
      code === "ENOENT"
        ? `Missing required report ${fileName}.`
        : `Could not read required report ${fileName}.`,
    );
    continue;
  }

  if (report?.scan?.type !== expectedType) {
    fail(`${fileName} reported ${String(report?.scan?.type)} instead of ${expectedType}.`);
    continue;
  }

  if (report.scan.status !== "success") {
    fail(`${expectedType} scan status was ${String(report.scan.status)}.`);
    continue;
  }

  if (!Array.isArray(report.vulnerabilities)) {
    fail(`${expectedType} report did not contain a vulnerabilities array.`);
    continue;
  }

  let reportBlocking = 0;
  let reportAdvisory = 0;

  for (const finding of report.vulnerabilities) {
    const severity = String(finding?.severity ?? "unknown").toLowerCase();

    if (expectedType === "secret_detection" || blockingSeverities.has(severity)) {
      reportBlocking += 1;
    } else if (advisorySeverities.has(severity)) {
      reportAdvisory += 1;
    } else {
      reportBlocking += 1;
    }
  }

  blockingFindings += reportBlocking;
  advisoryFindings += reportAdvisory;
  console.log(
    `${expectedType}: ${report.vulnerabilities.length} ${pluralize(report.vulnerabilities.length, "finding")} (${reportBlocking} blocking, ${reportAdvisory} advisory)`,
  );
}

if (process.exitCode) {
  // A report was missing or malformed. The precise error was emitted at the point of failure.
} else if (blockingFindings > 0) {
  fail(`${blockingFindings} blocking ${pluralize(blockingFindings, "finding")}.`);
} else {
  console.log(
    `Security gate passed: 0 blocking findings; ${advisoryFindings} advisory ${pluralize(advisoryFindings, "finding")}.`,
  );
}
