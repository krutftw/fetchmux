import { type Clock, type FetchLike, searchRequestSchema } from "@fetchmux/core";
import { describe, expect, it } from "vitest";
import { createExaProfile, ExaSearchAdapter } from "../src/exa.js";

const fixedNow = Date.parse("2026-07-16T08:00:00.000Z");
const clock: Clock = { now: () => fixedNow };

function responseFetch(
  payload: unknown,
  capture?: (input: string | URL | Request, init?: RequestInit) => void,
): FetchLike {
  return async (input, init) => {
    capture?.(input, init);
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
}

describe("ExaSearchAdapter", () => {
  it("builds the documented search request with nested contents", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;
    const adapter = new ExaSearchAdapter({
      apiKey: "exa-test-key",
      clock,
      fetch: responseFetch({ requestId: "req", results: [] }, (input, init) => {
        capturedUrl = String(input);
        capturedInit = init;
      }),
    });
    const request = searchRequestSchema.parse({
      query: "retrieval routing",
      priority: "quality",
      freshness: "7d",
      limit: 9,
      country: "AU",
      includeDomains: ["arxiv.org"],
      fetchContent: true,
    });

    await adapter.search(request, {
      signal: new AbortController().signal,
      traceId: "rt_test",
    });

    expect(capturedUrl).toBe("https://api.exa.ai/search");
    expect(capturedInit?.method).toBe("POST");
    expect(new Headers(capturedInit?.headers).get("x-api-key")).toBe("exa-test-key");
    expect(JSON.parse(String(capturedInit?.body))).toEqual({
      query: "retrieval routing",
      type: "auto",
      numResults: 9,
      userLocation: "AU",
      includeDomains: ["arxiv.org"],
      startPublishedDate: "2026-07-09T08:00:00.000Z",
      contents: { highlights: true, maxAgeHours: 168 },
    });
  });

  it.each([
    { priority: "latency" as const, expected: "instant" },
    { priority: "cost" as const, expected: "fast" },
    { priority: "balanced" as const, expected: "fast" },
  ])("maps $priority priority to Exa $expected mode", async ({ priority, expected }) => {
    let body: Record<string, unknown> = {};
    const adapter = new ExaSearchAdapter({
      apiKey: "key",
      clock,
      fetch: responseFetch({ results: [] }, (_input, init) => {
        body = JSON.parse(String(init?.body));
      }),
    });

    await adapter.search(searchRequestSchema.parse({ query: "q", priority }), {
      signal: new AbortController().signal,
      traceId: "rt_test",
    });

    expect(body.type).toBe(expected);
    expect(body).not.toHaveProperty("useAutoprompt");
    expect(body).not.toHaveProperty("tokensNum");
  });

  it("uses auto mode for a deep-research task", async () => {
    let body: Record<string, unknown> = {};
    const adapter = new ExaSearchAdapter({
      apiKey: "key",
      clock,
      fetch: responseFetch({ results: [] }, (_input, init) => {
        body = JSON.parse(String(init?.body));
      }),
    });

    await adapter.search(searchRequestSchema.parse({ query: "q", task: "deep_research" }), {
      signal: new AbortController().signal,
      traceId: "rt_test",
    });

    expect(body.type).toBe("auto");
  });

  it.each([
    { freshness: "24h" as const, hours: 24 },
    { freshness: "30d" as const, hours: 720 },
    { freshness: "1y" as const, hours: 8_760 },
  ])("uses a $hours-hour freshness window for $freshness", async ({ freshness, hours }) => {
    let body: Record<string, unknown> = {};
    const adapter = new ExaSearchAdapter({
      apiKey: "key",
      clock,
      fetch: responseFetch({ results: [] }, (_input, init) => {
        body = JSON.parse(String(init?.body));
      }),
    });

    await adapter.search(searchRequestSchema.parse({ query: "q", freshness, fetchContent: true }), {
      signal: new AbortController().signal,
      traceId: "rt_test",
    });

    expect(body.contents).toEqual({ highlights: true, maxAgeHours: hours });
    expect(Date.parse(String(body.startPublishedDate))).toBe(fixedNow - hours * 60 * 60 * 1_000);
  });

  it("requests highlights for page-content tasks without top-level content fields", async () => {
    let body: Record<string, unknown> = {};
    const adapter = new ExaSearchAdapter({
      apiKey: "key",
      clock,
      fetch: responseFetch({ results: [] }, (_input, init) => {
        body = JSON.parse(String(init?.body));
      }),
    });

    await adapter.search(searchRequestSchema.parse({ query: "q", task: "page_content" }), {
      signal: new AbortController().signal,
      traceId: "rt_test",
    });

    expect(body.contents).toEqual({ highlights: true });
    expect(body).not.toHaveProperty("highlights");
    expect(body).not.toHaveProperty("text");
  });

  it("passes excluded domains using Exa field names", async () => {
    let body: Record<string, unknown> = {};
    const adapter = new ExaSearchAdapter({
      apiKey: "key",
      clock,
      fetch: responseFetch({ results: [] }, (_input, init) => {
        body = JSON.parse(String(init?.body));
      }),
    });

    await adapter.search(
      searchRequestSchema.parse({ query: "q", excludeDomains: ["spam.example"] }),
      { signal: new AbortController().signal, traceId: "rt_test" },
    );

    expect(body.excludeDomains).toEqual(["spam.example"]);
  });

  it("normalizes search results and provider accounting metadata", async () => {
    const adapter = new ExaSearchAdapter({
      apiKey: "key",
      clock,
      fetch: responseFetch({
        requestId: "req_exa",
        results: [
          {
            id: "exa-1",
            title: "Exa source",
            url: "https://example.com/exa",
            publishedDate: "2026-07-13T00:00:00Z",
            author: "Researcher",
            score: 0.88,
            highlights: ["First excerpt", "Second excerpt"],
          },
          {
            id: "exa-2",
            title: "Undated",
            url: "https://example.com/undated",
            publishedDate: "unknown",
          },
        ],
        costDollars: { total: 0.014 },
        searchTime: 612,
      }),
    });

    const response = await adapter.search(searchRequestSchema.parse({ query: "q" }), {
      signal: new AbortController().signal,
      traceId: "rt_test",
    });

    expect(response.results).toEqual([
      {
        title: "Exa source",
        url: "https://example.com/exa",
        snippet: "First excerpt\n\nSecond excerpt",
        publishedAt: "2026-07-13T00:00:00.000Z",
        author: "Researcher",
        providerScore: 0.88,
        metadata: { exaId: "exa-1" },
      },
      {
        title: "Undated",
        url: "https://example.com/undated",
        metadata: { exaId: "exa-2" },
      },
    ]);
    expect(response.metadata).toEqual({
      actualCostUsd: 0.014,
      requestId: "req_exa",
      searchTimeMs: 612,
    });
  });

  it("rejects an unsupported upstream response shape", async () => {
    const adapter = new ExaSearchAdapter({
      apiKey: "key",
      clock,
      fetch: responseFetch({ results: [{ title: "Missing URL" }] }),
    });

    await expect(
      adapter.search(searchRequestSchema.parse({ query: "q" }), {
        signal: new AbortController().signal,
        traceId: "rt_test",
      }),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE", retryable: false });
  });
});

describe("createExaProfile", () => {
  it("uses only configured customer-plan cost and supports page content", () => {
    const request = searchRequestSchema.parse({ query: "q" });
    const unknown = createExaProfile({ costPerRequestUsd: null });
    const configured = createExaProfile({ costPerRequestUsd: 0.007 });

    expect(unknown.estimateCostUsd(request)).toBeNull();
    expect(configured.estimateCostUsd(request)).toBe(0.007);
    expect(configured.supportedTasks).toContain("page_content");
  });
});
