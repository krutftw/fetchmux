import type {
  ConfiguredProvider,
  ProviderExecutionContext,
  ProviderProfile,
  ProviderSearchResponse,
  SearchRequest,
} from "@fetchmux/core";
import { ProviderError } from "@fetchmux/core";
import { describe, expect, it } from "vitest";
import type { BenchmarkProvider } from "../src/run.js";
import { runBenchmark } from "../src/run.js";
import type { BenchmarkWorkloadInput } from "../src/schema.js";

type SearchBehavior = (
  request: SearchRequest,
  context: ProviderExecutionContext,
) => Promise<ProviderSearchResponse>;

function provider(id: string, behavior: SearchBehavior, cost = 0.01): BenchmarkProvider {
  const profile: ProviderProfile = {
    id,
    displayName: id.toUpperCase(),
    supportedTasks: ["balanced", "fresh_facts", "deep_research", "page_content"],
    supportedFreshness: ["24h", "7d", "30d", "1y"],
    qualityByTask: {
      balanced: 0.8,
      fresh_facts: 0.8,
      deep_research: 0.8,
      page_content: 0.8,
    },
    baselineReliability: 0.98,
    baselineP95LatencyMs: 1_000,
    estimateCostUsd: () => cost,
  };
  const configured: ConfiguredProvider = {
    adapter: { id, search: behavior },
    profile,
  };
  return {
    id,
    configured,
    configurationHash: `sha256:test-${id}`,
    costProfileSource: "test-fixture",
  };
}

function workload(overrides: Partial<BenchmarkWorkloadInput> = {}): BenchmarkWorkloadInput {
  return {
    schemaVersion: 1,
    id: "runner-test",
    title: "Runner test",
    description: "A non-sensitive test workload.",
    providers: ["alpha", "beta"],
    repetitions: 1,
    seed: 8842,
    fetchPolicies: {
      fresh_facts: {
        priority: "balanced",
        maxLatencyMs: 5_000,
        limit: 3,
        fetchContent: false,
      },
      technical_docs: {
        priority: "quality",
        maxLatencyMs: 8_000,
        limit: 3,
        fetchContent: false,
      },
      deep_research: {
        priority: "quality",
        maxLatencyMs: 12_000,
        limit: 3,
        fetchContent: false,
      },
      page_content: {
        priority: "quality",
        maxLatencyMs: 15_000,
        limit: 3,
        fetchContent: true,
      },
    },
    cases: [
      {
        id: "fresh-1",
        query: "current release information",
        workloadClass: "fresh_facts",
        task: "fresh_facts",
        freshness: "7d",
        expectedSourceHints: ["example.com"],
        humanLabels: {
          alpha: { relevance: 4, answerAccuracy: null, notes: "Reviewed fixture" },
        },
      },
      {
        id: "docs-1",
        query: "official configuration reference",
        workloadClass: "technical_docs",
        task: "balanced",
        expectedSourceHints: ["docs.example.org"],
      },
    ],
    ...overrides,
  };
}

function monotonicClock(): () => number {
  let value = 100;
  return () => {
    value += 5;
    return value;
  };
}

describe("runBenchmark", () => {
  it("executes every case/provider pair under the same class policy in seeded order", async () => {
    const firstCalls: Array<{ provider: string; request: SearchRequest }> = [];
    const makeProviders = (calls: Array<{ provider: string; request: SearchRequest }>) => [
      provider("alpha", async (request) => {
        calls.push({ provider: "alpha", request });
        return {
          results: [
            {
              title: "One",
              url: "https://Example.com/path?utm_source=test&b=2&a=1#section",
            },
            { title: "Two", url: "https://example.com/other?fbclid=tracking" },
            { title: "Three", url: "https://docs.example.org/item" },
          ],
        };
      }),
      provider("beta", async (request) => {
        calls.push({ provider: "beta", request });
        return { results: [{ title: "Beta", url: "https://beta.example.net/result" }] };
      }),
    ];

    const first = await runBenchmark({
      workload: workload(),
      providers: makeProviders(firstCalls),
      mode: "live",
      reportMode: "public",
      codeVersion: "test-commit",
      generatedAt: "2026-07-16T08:00:00.000Z",
      monotonicNow: monotonicClock(),
    });
    const secondCalls: Array<{ provider: string; request: SearchRequest }> = [];
    const second = await runBenchmark({
      workload: workload(),
      providers: makeProviders(secondCalls),
      mode: "live",
      reportMode: "public",
      codeVersion: "test-commit",
      generatedAt: "2026-07-16T08:00:00.000Z",
      monotonicNow: monotonicClock(),
    });

    expect(first.records).toHaveLength(4);
    expect(firstCalls.map(({ provider: id }) => id)).toEqual(
      secondCalls.map(({ provider: id }) => id),
    );
    expect(first.records.map(({ executionOrder }) => executionOrder)).toEqual([1, 2, 3, 4]);
    for (const testCase of workload().cases) {
      expect(
        first.records
          .filter(({ caseId }) => caseId === testCase.id)
          .map(({ providerId }) => providerId)
          .sort(),
      ).toEqual(["alpha", "beta"]);
    }

    const freshRequests = firstCalls
      .filter(({ request }) => request.query === "current release information")
      .map(({ request }) => request);
    expect(freshRequests).toHaveLength(2);
    expect(freshRequests[0]).toEqual(freshRequests[1]);
    expect(freshRequests[0]).toMatchObject({
      task: "fresh_facts",
      freshness: "7d",
      maxLatencyMs: 5_000,
      limit: 3,
      fetchContent: false,
    });

    const alpha = first.records.find(
      ({ providerId, caseId }) => providerId === "alpha" && caseId === "fresh-1",
    );
    expect(alpha?.measured).toEqual({
      latencyMs: 5,
      estimatedCostUsd: 0.01,
      resultCount: 3,
      domainDiversity: 2 / 3,
      normalizedUrls: [
        "https://example.com/path?a=1&b=2",
        "https://example.com/other",
        "https://docs.example.org/item",
      ],
    });
    expect(alpha?.humanLabel).toEqual({
      relevance: 4,
      answerAccuracy: null,
      notes: "Reviewed fixture",
    });
    expect(alpha?.measured).not.toHaveProperty("relevance");
    expect(alpha?.measured).not.toHaveProperty("answerAccuracy");
    expect(first.metadata.seed).toBe(8842);
    expect(first.metadata.mode).toBe("live");
    expect(first.illustrative).toBe(false);
    expect(second.records.map(({ providerId }) => providerId)).toEqual(
      first.records.map(({ providerId }) => providerId),
    );
  });

  it("continues after classified provider failures and keeps missing metrics null", async () => {
    let successfulCalls = 0;
    const providers = [
      provider("alpha", async () => {
        throw new ProviderError({
          provider: "alpha",
          code: "RATE_LIMITED",
          message: "fixture rate limit",
          retryable: true,
          statusCode: 429,
        });
      }),
      provider("beta", async () => {
        successfulCalls += 1;
        return { results: [{ title: "Result", url: "https://example.net/result" }] };
      }),
    ];

    const result = await runBenchmark({
      workload: workload(),
      providers,
      mode: "live",
      reportMode: "public",
      codeVersion: "test-commit",
      generatedAt: "2026-07-16T08:00:00.000Z",
      monotonicNow: monotonicClock(),
    });

    expect(result.records).toHaveLength(4);
    expect(successfulCalls).toBe(2);
    const failures = result.records.filter(({ status }) => status === "error");
    expect(failures).toHaveLength(2);
    expect(failures[0]).toMatchObject({
      providerId: "alpha",
      errorCode: "RATE_LIMITED",
      measured: {
        latencyMs: 5,
        estimatedCostUsd: 0.01,
        resultCount: null,
        domainDiversity: null,
        normalizedUrls: [],
      },
    });
  });

  it("redacts query text in private reports and plans dry-runs without network calls", async () => {
    let calls = 0;
    const providers = [
      provider("alpha", async () => {
        calls += 1;
        return { results: [] };
      }),
      provider("beta", async () => {
        calls += 1;
        return { results: [] };
      }),
    ];
    const privateWorkload = workload({
      cases: [
        {
          id: "private-1",
          query: "confidential customer acquisition query",
          workloadClass: "deep_research",
          task: "deep_research",
        },
      ],
    });

    const result = await runBenchmark({
      workload: privateWorkload,
      providers,
      mode: "dry-run",
      reportMode: "private",
      codeVersion: "test-commit",
      generatedAt: "2026-07-16T08:00:00.000Z",
    });

    expect(calls).toBe(0);
    expect(result.records).toHaveLength(2);
    expect(result.records.every(({ status }) => status === "planned")).toBe(true);
    expect(result.records.every(({ queryText }) => queryText === null)).toBe(true);
    expect(result.metadata.plannedCalls).toBe(2);
    expect(result.metadata.executedCalls).toBe(0);
    expect(JSON.stringify(result)).not.toContain("confidential customer acquisition query");
  });
});
