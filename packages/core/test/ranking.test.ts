import { describe, expect, it } from "vitest";
import { type SearchRequest, searchRequestSchema } from "../src/contracts.js";
import { FetchMuxError } from "../src/errors.js";
import type { ProviderProfile, RetrievalTask } from "../src/index.js";
import { type RankableProvider, rankProviders } from "../src/ranking.js";

const tasks: readonly RetrievalTask[] = [
  "balanced",
  "fresh_facts",
  "deep_research",
  "page_content",
  "scholarly",
];

function request(overrides: Partial<SearchRequest> = {}): SearchRequest {
  return searchRequestSchema.parse({ query: "latest retrieval research", ...overrides });
}

interface ProfileOverrides {
  tasks?: readonly RetrievalTask[];
  quality?: Partial<Record<RetrievalTask, number>>;
  cost?: number | null;
  latency?: number;
  reliability?: number;
  supportsRequest?: (request: SearchRequest) => boolean;
}

function profile(id: string, overrides: ProfileOverrides = {}): ProviderProfile {
  return {
    id,
    displayName: id.toUpperCase(),
    supportedTasks: overrides.tasks ?? tasks,
    supportedFreshness: ["24h", "7d", "30d", "1y"],
    ...(overrides.supportsRequest === undefined
      ? {}
      : { supportsRequest: overrides.supportsRequest }),
    qualityByTask: {
      balanced: 0.7,
      fresh_facts: 0.7,
      deep_research: 0.7,
      page_content: 0.7,
      scholarly: 0.7,
      ...overrides.quality,
    },
    baselineReliability: overrides.reliability ?? 0.98,
    baselineP95LatencyMs: overrides.latency ?? 1_000,
    estimateCostUsd: () => overrides.cost ?? null,
  };
}

function candidate(id: string, overrides: ProfileOverrides = {}): RankableProvider {
  return { profile: profile(id, overrides) };
}

describe("rankProviders", () => {
  it("selects the strongest task quality for quality priority", () => {
    const ranked = rankProviders(request({ priority: "quality", task: "deep_research" }), [
      candidate("shallow", { quality: { deep_research: 0.4 }, cost: 0.001 }),
      candidate("research", { quality: { deep_research: 0.95 }, cost: 0.02 }),
    ]);

    expect(ranked[0]?.providerId).toBe("research");
  });

  it("selects the cheapest known candidate for cost priority", () => {
    const ranked = rankProviders(request({ priority: "cost" }), [
      candidate("premium", { cost: 0.02, quality: { balanced: 0.95 } }),
      candidate("economy", { cost: 0.002, quality: { balanced: 0.55 } }),
    ]);

    expect(ranked[0]?.providerId).toBe("economy");
  });

  it("selects lower observed p95 latency for latency priority", () => {
    const ranked = rankProviders(request({ priority: "latency" }), [
      { ...candidate("slow", { latency: 3_000 }), observedP95LatencyMs: 4_000 },
      { ...candidate("fast", { latency: 1_000 }), observedP95LatencyMs: 250 },
    ]);

    expect(ranked[0]?.providerId).toBe("fast");
  });

  it("excludes providers that do not support the requested task", () => {
    const ranked = rankProviders(request({ task: "page_content" }), [
      candidate("search-only", { tasks: ["balanced", "fresh_facts"], cost: 0.001 }),
      candidate("content", { tasks: ["balanced", "page_content"], cost: 0.01 }),
    ]);

    expect(ranked.map((entry) => entry.providerId)).toEqual(["content"]);
  });

  it("excludes providers that cannot honor provider-specific request controls", () => {
    expect.assertions(2);

    try {
      rankProviders(request({ task: "scholarly", includeDomains: ["example.org"] }), [
        candidate("metadata-only", {
          tasks: ["scholarly"],
          cost: 0,
          supportsRequest: (candidateRequest) => candidateRequest.includeDomains === undefined,
        }),
      ]);
    } catch (error) {
      expect(error).toMatchObject({ code: "NO_ELIGIBLE_PROVIDER", statusCode: 422 });
      expect((error as FetchMuxError).details).toEqual({
        exclusions: { "metadata-only": ["UNSUPPORTED_CONTROLS"] },
      });
    }
  });

  it("excludes unknown costs from a hard-dollar route", () => {
    const ranked = rankProviders(request({ maxCostUsd: 0.01 }), [
      candidate("unknown", { cost: null }),
      candidate("known", { cost: 0.005 }),
    ]);

    expect(ranked.map((entry) => entry.providerId)).toEqual(["known"]);
  });

  it("excludes a provider above the hard-dollar budget", () => {
    const ranked = rankProviders(request({ maxCostUsd: 0.01 }), [
      candidate("over", { cost: 0.02 }),
      candidate("within", { cost: 0.006 }),
    ]);

    expect(ranked.map((entry) => entry.providerId)).toEqual(["within"]);
  });

  it("uses remaining budget when prior attempts have reserved cost", () => {
    const ranked = rankProviders(
      request({ maxCostUsd: 0.02 }),
      [candidate("too-late", { cost: 0.012 }), candidate("fits", { cost: 0.009 })],
      { remainingBudgetUsd: 0.01 },
    );

    expect(ranked.map((entry) => entry.providerId)).toEqual(["fits"]);
  });

  it("respects an explicit provider allowlist", () => {
    const ranked = rankProviders(request({ providerAllowlist: ["tavily"] }), [
      candidate("brave", { cost: 0.001 }),
      candidate("tavily", { cost: 0.01 }),
    ]);

    expect(ranked.map((entry) => entry.providerId)).toEqual(["tavily"]);
  });

  it("breaks exact ties by provider ID", () => {
    const ranked = rankProviders(request(), [
      candidate("zeta", { cost: 0.005 }),
      candidate("alpha", { cost: 0.005 }),
    ]);

    expect(ranked.map((entry) => entry.providerId)).toEqual(["alpha", "zeta"]);
  });

  it("returns inspectable component scores and reason codes", () => {
    const [first] = rankProviders(request({ maxCostUsd: 0.01, priority: "quality" }), [
      candidate("exa", { cost: 0.007 }),
    ]);

    expect(first).toMatchObject({
      providerId: "exa",
      estimatedCostUsd: 0.007,
      reasonCodes: [
        "TASK_MATCH",
        "QUALITY_PRIORITY",
        "RELIABILITY_WEIGHT",
        "WITHIN_BUDGET",
        "ONLY_ELIGIBLE_PROVIDER",
      ],
      components: {
        cost: 1,
        latency: 1,
        quality: 0.7,
        reliability: 0.98,
      },
    });
    expect(first?.totalScore).toBeGreaterThan(0);
    expect(first?.totalScore).toBeLessThanOrEqual(1);
  });

  it("reports safe exclusion codes when nothing is eligible", () => {
    expect.assertions(3);

    try {
      rankProviders(request({ maxCostUsd: 0.005 }), [
        candidate("unknown", { cost: null }),
        candidate("expensive", { cost: 0.02 }),
      ]);
    } catch (error) {
      expect(error).toBeInstanceOf(FetchMuxError);
      expect(error).toMatchObject({ code: "NO_ELIGIBLE_PROVIDER", statusCode: 422 });
      expect((error as FetchMuxError).details).toEqual({
        exclusions: {
          expensive: ["COST_EXCEEDS_BUDGET"],
          unknown: ["COST_UNKNOWN"],
        },
      });
    }
  });
});
