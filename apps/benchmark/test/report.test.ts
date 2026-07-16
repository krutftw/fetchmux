import { describe, expect, it } from "vitest";
import { createBenchmarkReport } from "../src/report.js";
import type { BenchmarkRun, BenchmarkRunRecord } from "../src/run.js";

function record(
  overrides: Partial<BenchmarkRunRecord> &
    Pick<BenchmarkRunRecord, "providerId" | "workloadClass" | "status">,
): BenchmarkRunRecord {
  const { providerId, workloadClass, status, ...rest } = overrides;
  return {
    caseId: "case-1",
    queryText: "fixture query",
    privateQueryRef: null,
    providerId,
    workloadClass,
    repetition: 1,
    executionOrder: 1,
    status,
    errorCode: null,
    measured: {
      latencyMs: null,
      estimatedCostUsd: null,
      resultCount: null,
      domainDiversity: null,
      normalizedUrls: [],
    },
    humanLabel: null,
    ...rest,
  };
}

function run(records: readonly BenchmarkRunRecord[], illustrative = false): BenchmarkRun {
  return {
    schemaVersion: 1,
    illustrative,
    metadata: {
      workloadId: "report-test",
      workloadHash: "sha256:workload",
      generatedAt: "2026-07-16T08:00:00.000Z",
      codeVersion: "test-commit",
      seed: 42,
      mode: illustrative ? "illustrative" : "live",
      reportMode: "public",
      repetitions: 1,
      plannedCalls: records.length,
      executedCalls: records.filter(({ status }) => status !== "planned").length,
      providerConfigurations: [
        {
          providerId: "alpha",
          configurationHash: "sha256:test-alpha",
          costProfileSource: "test-fixture",
        },
      ],
    },
    records,
    limitations: ["Fixture data only."],
  };
}

describe("createBenchmarkReport", () => {
  it("uses declared class weights and exposes honest metric sample counts", () => {
    const records = [
      record({
        providerId: "alpha",
        workloadClass: "fresh_facts",
        status: "success",
        measured: {
          latencyMs: 100,
          estimatedCostUsd: 0.01,
          resultCount: 8,
          domainDiversity: 0.5,
          normalizedUrls: [],
        },
      }),
      record({
        caseId: "case-2",
        providerId: "alpha",
        workloadClass: "fresh_facts",
        status: "success",
        measured: {
          latencyMs: 100,
          estimatedCostUsd: null,
          resultCount: 6,
          domainDiversity: 0.75,
          normalizedUrls: [],
        },
      }),
      record({
        caseId: "case-3",
        providerId: "alpha",
        workloadClass: "deep_research",
        status: "success",
        measured: {
          latencyMs: 300,
          estimatedCostUsd: 0.03,
          resultCount: 4,
          domainDiversity: 1,
          normalizedUrls: [],
        },
      }),
    ];

    const report = createBenchmarkReport(run(records), {
      classWeights: { fresh_facts: 3, deep_research: 1 },
    });
    const summary = report.providers[0];

    expect(summary?.sampleCount).toBe(3);
    expect(summary?.metricSampleCounts).toEqual({
      latencyMs: 3,
      estimatedCostUsd: 2,
      resultCount: 3,
      domainDiversity: 3,
    });
    expect(summary?.weightedMeans.latencyMs).toBe(150);
    expect(summary?.weightedMeans.resultCount).toBe(6.25);
    expect(summary?.weightedMeans.estimatedCostUsd).toBe(0.015);
    expect(summary?.classSummaries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ workloadClass: "fresh_facts", sampleCount: 2 }),
        expect.objectContaining({ workloadClass: "deep_research", sampleCount: 1 }),
      ]),
    );
    expect(report.statisticalTreatment).toBe("descriptive_only_no_bootstrap");
  });

  it("uses executed calls as the error-rate denominator and ignores planned calls", () => {
    const records = [
      record({ providerId: "alpha", workloadClass: "fresh_facts", status: "success" }),
      record({
        caseId: "case-2",
        providerId: "alpha",
        workloadClass: "fresh_facts",
        status: "error",
        errorCode: "RATE_LIMITED",
      }),
      record({
        caseId: "case-3",
        providerId: "alpha",
        workloadClass: "fresh_facts",
        status: "planned",
      }),
    ];

    const summary = createBenchmarkReport(run(records)).providers[0];

    expect(summary).toMatchObject({
      sampleCount: 2,
      successCount: 1,
      errorCount: 1,
      errorRate: 0.5,
      plannedCount: 1,
    });
  });

  it("renders unavailable measured aggregates as null", () => {
    const summary = createBenchmarkReport(
      run([
        record({
          providerId: "alpha",
          workloadClass: "technical_docs",
          status: "error",
          errorCode: "NETWORK_ERROR",
        }),
      ]),
    ).providers[0];

    expect(summary?.weightedMeans).toEqual({
      latencyMs: null,
      estimatedCostUsd: null,
      resultCount: null,
      domainDiversity: null,
    });
  });

  it("adds a prominent non-comparison banner to illustrative reports", () => {
    const report = createBenchmarkReport(run([], true));

    expect(report.illustrative).toBe(true);
    expect(report.banner).toBe("ILLUSTRATIVE — NOT LIVE PROVIDER RESULTS OR A PROVIDER COMPARISON");
    expect(report.comparisonAllowed).toBe(false);
    expect(report.providers.every(({ illustrative }) => illustrative)).toBe(true);
  });
});
