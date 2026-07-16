import { type Clock, type FetchLike, searchRequestSchema } from "@fetchmux/core";
import { describe, expect, it } from "vitest";
import { buildProviderRegistry } from "../src/config.js";

const clock: Clock = { now: () => Date.parse("2026-07-16T08:00:00.000Z") };
const unusedFetch: FetchLike = async () => {
  throw new Error("No provider call expected in configuration tests");
};

describe("buildProviderRegistry", () => {
  it("reports every provider unavailable when keys are absent", () => {
    const registry = buildProviderRegistry({ env: {}, fetch: unusedFetch, clock });

    expect(registry.providers).toEqual([]);
    expect(registry.statuses).toHaveLength(4);
    expect(registry.statuses.every((status) => !status.available)).toBe(true);
    expect(registry.statuses.map((status) => status.id)).toEqual([
      "brave",
      "tavily",
      "exa",
      "firecrawl",
    ]);
  });

  it("builds four matched adapters and profiles from customer-owned keys", () => {
    const registry = buildProviderRegistry({
      env: {
        BRAVE_API_KEY: "brave-secret",
        BRAVE_COST_PER_REQUEST_USD: "0.005",
        TAVILY_API_KEY: "tavily-secret",
        TAVILY_COST_PER_CREDIT_USD: "0.008",
        EXA_API_KEY: "exa-secret",
        EXA_COST_PER_REQUEST_USD: "0.007",
        FIRECRAWL_API_KEY: "firecrawl-secret",
        FIRECRAWL_COST_PER_REQUEST_USD: "0.012",
      },
      fetch: unusedFetch,
      clock,
    });

    expect(registry.providers).toHaveLength(4);
    expect(registry.providers.every(({ adapter, profile }) => adapter.id === profile.id)).toBe(
      true,
    );
    expect(registry.statuses.every((status) => status.available)).toBe(true);
    expect(registry.statuses.every((status) => status.costConfigured)).toBe(true);

    const qualityRequest = searchRequestSchema.parse({ query: "q", priority: "quality" });
    const costs = Object.fromEntries(
      registry.providers.map(({ profile }) => [
        profile.id,
        profile.estimateCostUsd(qualityRequest),
      ]),
    );
    expect(costs).toEqual({
      brave: 0.005,
      tavily: 0.016,
      exa: 0.007,
      firecrawl: 0.012,
    });
  });

  it("treats a whitespace-only key as unavailable", () => {
    const registry = buildProviderRegistry({
      env: { BRAVE_API_KEY: "   " },
      fetch: unusedFetch,
      clock,
    });

    expect(registry.providers).toEqual([]);
    expect(registry.statuses.find((status) => status.id === "brave")).toMatchObject({
      available: false,
      costConfigured: false,
      issues: ["BRAVE_API_KEY is not configured"],
    });
  });

  it("marks invalid customer cost as unknown without exposing configuration values", () => {
    const registry = buildProviderRegistry({
      env: {
        EXA_API_KEY: "exa-super-secret",
        EXA_COST_PER_REQUEST_USD: "-not-a-price-secret",
      },
      fetch: unusedFetch,
      clock,
    });
    const exa = registry.providers.find(({ profile }) => profile.id === "exa");
    const status = registry.statuses.find((candidate) => candidate.id === "exa");

    expect(exa?.profile.estimateCostUsd(searchRequestSchema.parse({ query: "q" }))).toBeNull();
    expect(status).toMatchObject({
      available: true,
      costConfigured: false,
      issues: ["EXA_COST_PER_REQUEST_USD must be a positive number"],
    });
    const serialized = JSON.stringify(registry.statuses);
    expect(serialized).not.toContain("exa-super-secret");
    expect(serialized).not.toContain("not-a-price-secret");
  });
});
