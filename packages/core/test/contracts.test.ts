import { describe, expect, it } from "vitest";
import { routeReceiptSchema, searchRequestSchema, searchResponseSchema } from "../src/contracts.js";

describe("searchRequestSchema", () => {
  it("applies safe defaults", () => {
    const value = searchRequestSchema.parse({ query: "latest privacy law" });

    expect(value).toEqual({
      query: "latest privacy law",
      priority: "balanced",
      task: "balanced",
      limit: 8,
      maxLatencyMs: 10_000,
      fetchContent: false,
    });
  });

  it("trims the query and normalizes the country", () => {
    const value = searchRequestSchema.parse({
      query: "  latest privacy law  ",
      country: "au",
    });

    expect(value.query).toBe("latest privacy law");
    expect(value.country).toBe("AU");
  });

  it("rejects an empty query", () => {
    expect(() => searchRequestSchema.parse({ query: "   " })).toThrow();
  });

  it("rejects a query longer than 400 characters", () => {
    expect(() => searchRequestSchema.parse({ query: "q".repeat(401) })).toThrow();
  });

  it("rejects conflicting domain filters", () => {
    expect(() =>
      searchRequestSchema.parse({
        query: "q",
        includeDomains: ["example.com"],
        excludeDomains: ["example.org"],
      }),
    ).toThrow();
  });

  it.each(["https://example.com", "example.com/path", "not a domain", "localhost"])(
    "rejects invalid provider domain filter %s",
    (domain) => {
      expect(() => searchRequestSchema.parse({ query: "q", includeDomains: [domain] })).toThrow();
    },
  );

  it("accepts a hostname and wildcard subdomain filter", () => {
    const value = searchRequestSchema.parse({
      query: "q",
      includeDomains: ["example.com", "*.docs.example.org"],
    });

    expect(value.includeDomains).toEqual(["example.com", "*.docs.example.org"]);
  });

  it.each([0, 21, 1.5])("rejects invalid result limit %s", (limit) => {
    expect(() => searchRequestSchema.parse({ query: "q", limit })).toThrow();
  });

  it.each([{ maxCostUsd: 0 }, { maxCostUsd: -1 }, { maxLatencyMs: 0 }, { maxLatencyMs: 120_001 }])(
    "rejects invalid hard limit $maxCostUsd $maxLatencyMs",
    (limits) => {
      expect(() => searchRequestSchema.parse({ query: "q", ...limits })).toThrow();
    },
  );
});

describe("routeReceiptSchema", () => {
  it("rejects a negative cost estimate", () => {
    expect(() =>
      routeReceiptSchema.parse({
        selectedProvider: "brave",
        attemptedProviders: ["brave"],
        attempts: [
          {
            provider: "brave",
            startedAt: "2026-07-16T08:00:00.000Z",
            endedAt: "2026-07-16T08:00:00.010Z",
            latencyMs: 10,
            estimatedCostUsd: -0.01,
            outcome: "success",
          },
        ],
        reasonCodes: ["WITHIN_BUDGET"],
        estimatedCostUsd: -0.01,
        latencyMs: 10,
        fallbackUsed: false,
        traceId: "rt_test",
      }),
    ).toThrow();
  });
});

describe("searchResponseSchema", () => {
  const route = {
    selectedProvider: "brave",
    attemptedProviders: ["brave"],
    attempts: [
      {
        provider: "brave",
        startedAt: "2026-07-16T08:00:00.000Z",
        endedAt: "2026-07-16T08:00:00.020Z",
        latencyMs: 20,
        estimatedCostUsd: 0.005,
        outcome: "success" as const,
      },
    ],
    reasonCodes: ["WITHIN_BUDGET" as const],
    estimatedCostUsd: 0.005,
    latencyMs: 20,
    fallbackUsed: false,
    traceId: "rt_test",
  };

  it("accepts a normalized evidence response", () => {
    const value = searchResponseSchema.parse({
      results: [
        {
          title: "Privacy Act Review",
          url: "https://example.gov/privacy",
          snippet: "A current review.",
          publishedAt: "2026-07-10T00:00:00.000Z",
          provider: "brave",
          rank: 1,
        },
      ],
      route,
    });

    expect(value.results[0]?.provider).toBe("brave");
  });

  it("rejects a malformed evidence URL", () => {
    expect(() =>
      searchResponseSchema.parse({
        results: [
          {
            title: "Bad source",
            url: "javascript:alert(1)",
            provider: "brave",
            rank: 1,
          },
        ],
        route,
      }),
    ).toThrow();
  });

  it("serializes absent optional evidence fields without placeholders", () => {
    const value = searchResponseSchema.parse({
      results: [
        {
          title: "Minimal source",
          url: "https://example.com/source",
          provider: "exa",
          rank: 1,
        },
      ],
      route: { ...route, selectedProvider: "exa", attemptedProviders: ["exa"] },
    });

    const serialized = JSON.stringify(value);
    expect(serialized).not.toContain("snippet");
    expect(serialized).not.toContain("publishedAt");
    expect(serialized).not.toContain("undefined");
  });
});
