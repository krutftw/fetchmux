import { type FetchLike, searchRequestSchema } from "@fetchmux/core";
import { describe, expect, it } from "vitest";
import { createTavilyProfile, TavilySearchAdapter } from "../src/tavily.js";

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

describe("TavilySearchAdapter", () => {
  it("builds a documented advanced search request", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;
    const adapter = new TavilySearchAdapter({
      apiKey: "tvly-test-key",
      fetch: responseFetch({ query: "q", results: [] }, (input, init) => {
        capturedUrl = String(input);
        capturedInit = init;
      }),
    });
    const request = searchRequestSchema.parse({
      query: "privacy reform",
      priority: "quality",
      freshness: "30d",
      limit: 7,
      country: "AU",
      includeDomains: ["oaic.gov.au"],
    });

    await adapter.search(request, {
      signal: new AbortController().signal,
      traceId: "rt_test",
    });

    expect(capturedUrl).toBe("https://api.tavily.com/search");
    expect(capturedInit?.method).toBe("POST");
    expect(new Headers(capturedInit?.headers).get("Authorization")).toBe("Bearer tvly-test-key");
    expect(JSON.parse(String(capturedInit?.body))).toEqual({
      query: "privacy reform",
      search_depth: "advanced",
      max_results: 7,
      include_answer: false,
      include_raw_content: false,
      time_range: "month",
      country: "australia",
      include_domains: ["oaic.gov.au"],
    });
  });

  it.each([
    { priority: "latency" as const, expected: "ultra-fast" },
    { priority: "cost" as const, expected: "basic" },
    { priority: "balanced" as const, expected: "basic" },
  ])("maps $priority priority to $expected depth", async ({ priority, expected }) => {
    let body: Record<string, unknown> = {};
    const adapter = new TavilySearchAdapter({
      apiKey: "key",
      fetch: responseFetch({ query: "q", results: [] }, (_input, init) => {
        body = JSON.parse(String(init?.body));
      }),
    });

    await adapter.search(searchRequestSchema.parse({ query: "q", priority }), {
      signal: new AbortController().signal,
      traceId: "rt_test",
    });

    expect(body.search_depth).toBe(expected);
  });

  it("uses advanced depth for a deep-research task", async () => {
    let body: Record<string, unknown> = {};
    const adapter = new TavilySearchAdapter({
      apiKey: "key",
      fetch: responseFetch({ query: "q", results: [] }, (_input, init) => {
        body = JSON.parse(String(init?.body));
      }),
    });

    await adapter.search(searchRequestSchema.parse({ query: "q", task: "deep_research" }), {
      signal: new AbortController().signal,
      traceId: "rt_test",
    });

    expect(body.search_depth).toBe("advanced");
  });

  it.each([
    { freshness: "24h" as const, expected: "day" },
    { freshness: "7d" as const, expected: "week" },
    { freshness: "1y" as const, expected: "year" },
  ])("maps $freshness to Tavily $expected range", async ({ freshness, expected }) => {
    let body: Record<string, unknown> = {};
    const adapter = new TavilySearchAdapter({
      apiKey: "key",
      fetch: responseFetch({ query: "q", results: [] }, (_input, init) => {
        body = JSON.parse(String(init?.body));
      }),
    });

    await adapter.search(searchRequestSchema.parse({ query: "q", freshness }), {
      signal: new AbortController().signal,
      traceId: "rt_test",
    });

    expect(body.time_range).toBe(expected);
  });

  it("passes excluded domains without changing query text", async () => {
    let body: Record<string, unknown> = {};
    const adapter = new TavilySearchAdapter({
      apiKey: "key",
      fetch: responseFetch({ query: "q", results: [] }, (_input, init) => {
        body = JSON.parse(String(init?.body));
      }),
    });

    await adapter.search(
      searchRequestSchema.parse({ query: "q", excludeDomains: ["spam.example"] }),
      { signal: new AbortController().signal, traceId: "rt_test" },
    );

    expect(body).toMatchObject({ query: "q", exclude_domains: ["spam.example"] });
  });

  it("normalizes results and preserves usage as provider metadata", async () => {
    const adapter = new TavilySearchAdapter({
      apiKey: "key",
      fetch: responseFetch({
        query: "q",
        results: [
          {
            title: "Tavily source",
            url: "https://example.com/tavily",
            content: "Relevant content",
            score: 0.91,
            published_date: "2026-07-14T03:00:00Z",
          },
          {
            title: "Undated",
            url: "https://example.com/undated",
            content: "No date",
            score: 0.5,
            published_date: "yesterday",
          },
        ],
        response_time: "1.67",
        request_id: "req_tavily",
        usage: { credits: 2 },
      }),
    });

    const response = await adapter.search(searchRequestSchema.parse({ query: "q" }), {
      signal: new AbortController().signal,
      traceId: "rt_test",
    });

    expect(response.results).toEqual([
      {
        title: "Tavily source",
        url: "https://example.com/tavily",
        snippet: "Relevant content",
        publishedAt: "2026-07-14T03:00:00.000Z",
        providerScore: 0.91,
      },
      {
        title: "Undated",
        url: "https://example.com/undated",
        snippet: "No date",
        providerScore: 0.5,
      },
    ]);
    expect(response.metadata).toEqual({
      creditsUsed: 2,
      requestId: "req_tavily",
      responseTimeSeconds: 1.67,
    });
  });

  it("rejects an unsupported upstream response shape", async () => {
    const adapter = new TavilySearchAdapter({
      apiKey: "key",
      fetch: responseFetch({ results: [{ title: "Missing URL", content: "x", score: 1 }] }),
    });

    await expect(
      adapter.search(searchRequestSchema.parse({ query: "q" }), {
        signal: new AbortController().signal,
        traceId: "rt_test",
      }),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE", retryable: false });
  });
});

describe("createTavilyProfile", () => {
  it("prices documented advanced depth at two configured credits", () => {
    const profile = createTavilyProfile({ costPerCreditUsd: 0.01 });

    expect(
      profile.estimateCostUsd(searchRequestSchema.parse({ query: "q", priority: "quality" })),
    ).toBe(0.02);
    expect(profile.estimateCostUsd(searchRequestSchema.parse({ query: "q" }))).toBe(0.01);
    expect(
      createTavilyProfile({ costPerCreditUsd: null }).estimateCostUsd(
        searchRequestSchema.parse({ query: "q" }),
      ),
    ).toBeNull();
    expect(profile.supportedTasks).not.toContain("page_content");
  });
});
