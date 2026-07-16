import { type FetchLike, searchRequestSchema } from "@fetchmux/core";
import { describe, expect, it } from "vitest";
import { BraveSearchAdapter, createBraveProfile } from "../src/brave.js";

function responseFetch(
  payload: unknown,
  capture?: (url: URL, init?: RequestInit) => void,
): FetchLike {
  return async (input, init) => {
    capture?.(new URL(input instanceof Request ? input.url : input), init);
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
}

describe("BraveSearchAdapter", () => {
  it("builds the documented web-search request", async () => {
    let capturedUrl: URL | undefined;
    let capturedInit: RequestInit | undefined;
    const adapter = new BraveSearchAdapter({
      apiKey: "brave-test-key",
      fetch: responseFetch({ web: { results: [] } }, (url, init) => {
        capturedUrl = url;
        capturedInit = init;
      }),
    });
    const request = searchRequestSchema.parse({
      query: "privacy reform",
      limit: 6,
      freshness: "7d",
      country: "au",
      language: "en",
      includeDomains: ["oaic.gov.au", "ag.gov.au"],
      fetchContent: true,
    });

    await adapter.search(request, {
      signal: new AbortController().signal,
      traceId: "rt_test",
    });

    expect(capturedUrl?.origin).toBe("https://api.search.brave.com");
    expect(capturedUrl?.pathname).toBe("/res/v1/web/search");
    expect(capturedUrl?.searchParams.get("q")).toBe(
      "privacy reform (site:oaic.gov.au OR site:ag.gov.au)",
    );
    expect(capturedUrl?.searchParams.get("count")).toBe("6");
    expect(capturedUrl?.searchParams.get("freshness")).toBe("pw");
    expect(capturedUrl?.searchParams.get("country")).toBe("AU");
    expect(capturedUrl?.searchParams.get("search_lang")).toBe("en");
    expect(capturedUrl?.searchParams.get("extra_snippets")).toBe("true");
    expect(new Headers(capturedInit?.headers).get("X-Subscription-Token")).toBe("brave-test-key");
    expect(capturedInit?.method).toBe("GET");
  });

  it("normalizes web results without inventing dates", async () => {
    const adapter = new BraveSearchAdapter({
      apiKey: "key",
      fetch: responseFetch({
        web: {
          results: [
            {
              title: "Current source",
              url: "https://example.com/current",
              description: "Current evidence",
              page_age: "2026-07-15T00:00:00.000Z",
              extra_snippets: ["Extra one", "Extra two"],
            },
            {
              title: "Undated source",
              url: "https://example.com/undated",
              description: "No machine date",
              age: "two days ago",
              page_age: "not-an-iso-date",
            },
          ],
        },
      }),
    });

    const response = await adapter.search(searchRequestSchema.parse({ query: "q" }), {
      signal: new AbortController().signal,
      traceId: "rt_test",
    });

    expect(response.results).toEqual([
      {
        title: "Current source",
        url: "https://example.com/current",
        snippet: "Current evidence\n\nExtra one\n\nExtra two",
        publishedAt: "2026-07-15T00:00:00.000Z",
      },
      {
        title: "Undated source",
        url: "https://example.com/undated",
        snippet: "No machine date",
      },
    ]);
  });

  it("maps excluded domains to Brave search operators", async () => {
    let query: string | null = null;
    const adapter = new BraveSearchAdapter({
      apiKey: "key",
      fetch: responseFetch({ web: { results: [] } }, (url) => {
        query = url.searchParams.get("q");
      }),
    });

    await adapter.search(
      searchRequestSchema.parse({
        query: "agent search",
        excludeDomains: ["spam.example", "*.ads.example"],
      }),
      { signal: new AbortController().signal, traceId: "rt_test" },
    );

    expect(query).toBe("agent search -site:spam.example -site:ads.example");
  });

  it("rejects an unsupported upstream response shape", async () => {
    const adapter = new BraveSearchAdapter({
      apiKey: "key",
      fetch: responseFetch({ web: { results: [{ title: 42, url: "https://example.com" }] } }),
    });

    await expect(
      adapter.search(searchRequestSchema.parse({ query: "q" }), {
        signal: new AbortController().signal,
        traceId: "rt_test",
      }),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE", retryable: false });
  });
});

describe("createBraveProfile", () => {
  it("uses only configured customer-plan cost", () => {
    const unknown = createBraveProfile({ costPerRequestUsd: null });
    const configured = createBraveProfile({ costPerRequestUsd: 0.005 });
    const request = searchRequestSchema.parse({ query: "q" });

    expect(unknown.estimateCostUsd(request)).toBeNull();
    expect(configured.estimateCostUsd(request)).toBe(0.005);
    expect(configured.supportedTasks).not.toContain("page_content");
  });
});
