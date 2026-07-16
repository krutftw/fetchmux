import { type FetchLike, searchRequestSchema } from "@fetchmux/core";
import { describe, expect, it } from "vitest";
import { createFirecrawlProfile, FirecrawlSearchAdapter } from "../src/firecrawl.js";

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

describe("FirecrawlSearchAdapter", () => {
  it("builds the documented v2 page-content search request", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;
    const adapter = new FirecrawlSearchAdapter({
      apiKey: "fc-test-key",
      fetch: responseFetch({ success: true, data: { web: [] } }, (input, init) => {
        capturedUrl = String(input);
        capturedInit = init;
      }),
    });
    const request = searchRequestSchema.parse({
      query: "retrieval routing",
      task: "page_content",
      freshness: "7d",
      limit: 6,
      country: "AU",
      includeDomains: ["docs.example.com"],
      maxLatencyMs: 8_000,
    });

    await adapter.search(request, {
      signal: new AbortController().signal,
      traceId: "rt_test",
    });

    expect(capturedUrl).toBe("https://api.firecrawl.dev/v2/search");
    expect(capturedInit?.method).toBe("POST");
    expect(new Headers(capturedInit?.headers).get("Authorization")).toBe("Bearer fc-test-key");
    expect(JSON.parse(String(capturedInit?.body))).toEqual({
      query: "retrieval routing",
      limit: 6,
      sources: ["web"],
      includeDomains: ["docs.example.com"],
      tbs: "qdr:w",
      country: "AU",
      timeout: 8_000,
      ignoreInvalidURLs: true,
      scrapeOptions: { formats: [{ type: "markdown" }] },
    });
  });

  it.each([
    { freshness: "24h" as const, expected: "qdr:d" },
    { freshness: "30d" as const, expected: "qdr:m" },
    { freshness: "1y" as const, expected: "qdr:y" },
  ])("maps $freshness to Firecrawl $expected", async ({ freshness, expected }) => {
    let body: Record<string, unknown> = {};
    const adapter = new FirecrawlSearchAdapter({
      apiKey: "key",
      fetch: responseFetch({ success: true, data: { web: [] } }, (_input, init) => {
        body = JSON.parse(String(init?.body));
      }),
    });

    await adapter.search(searchRequestSchema.parse({ query: "q", freshness }), {
      signal: new AbortController().signal,
      traceId: "rt_test",
    });

    expect(body.tbs).toBe(expected);
  });

  it("omits scrape options for a normal search", async () => {
    let body: Record<string, unknown> = {};
    const adapter = new FirecrawlSearchAdapter({
      apiKey: "key",
      fetch: responseFetch({ success: true, data: { web: [] } }, (_input, init) => {
        body = JSON.parse(String(init?.body));
      }),
    });

    await adapter.search(searchRequestSchema.parse({ query: "q" }), {
      signal: new AbortController().signal,
      traceId: "rt_test",
    });

    expect(body).not.toHaveProperty("scrapeOptions");
  });

  it("passes excluded domains with Firecrawl field casing", async () => {
    let body: Record<string, unknown> = {};
    const adapter = new FirecrawlSearchAdapter({
      apiKey: "key",
      fetch: responseFetch({ success: true, data: { web: [] } }, (_input, init) => {
        body = JSON.parse(String(init?.body));
      }),
    });

    await adapter.search(
      searchRequestSchema.parse({ query: "q", excludeDomains: ["spam.example"] }),
      { signal: new AbortController().signal, traceId: "rt_test" },
    );

    expect(body.excludeDomains).toEqual(["spam.example"]);
  });

  it("normalizes search results and accounting metadata", async () => {
    const adapter = new FirecrawlSearchAdapter({
      apiKey: "key",
      fetch: responseFetch({
        success: true,
        data: {
          web: [
            {
              title: "Firecrawl page",
              url: "https://example.com/page",
              description: "Short description",
              markdown: "# Full page\n\nEvidence.",
            },
            {
              title: "Description only",
              url: "https://example.com/description",
              description: "Description evidence",
            },
          ],
        },
        id: "job_firecrawl",
        creditsUsed: 3,
      }),
    });

    const response = await adapter.search(
      searchRequestSchema.parse({ query: "q", fetchContent: true }),
      { signal: new AbortController().signal, traceId: "rt_test" },
    );

    expect(response.results).toEqual([
      {
        title: "Firecrawl page",
        url: "https://example.com/page",
        snippet: "# Full page\n\nEvidence.",
      },
      {
        title: "Description only",
        url: "https://example.com/description",
        snippet: "Description evidence",
      },
    ]);
    expect(response.metadata).toEqual({ creditsUsed: 3, jobId: "job_firecrawl" });
  });

  it("rejects an unsupported upstream response shape", async () => {
    const adapter = new FirecrawlSearchAdapter({
      apiKey: "key",
      fetch: responseFetch({ success: true, data: { web: [{ title: "Missing URL" }] } }),
    });

    await expect(
      adapter.search(searchRequestSchema.parse({ query: "q" }), {
        signal: new AbortController().signal,
        traceId: "rt_test",
      }),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE", retryable: false });
  });
});

describe("createFirecrawlProfile", () => {
  it("uses only configured customer-plan cost and supports page content", () => {
    const request = searchRequestSchema.parse({ query: "q" });
    const unknown = createFirecrawlProfile({ costPerRequestUsd: null });
    const configured = createFirecrawlProfile({ costPerRequestUsd: 0.01 });

    expect(unknown.estimateCostUsd(request)).toBeNull();
    expect(configured.estimateCostUsd(request)).toBe(0.01);
    expect(configured.supportedTasks).toContain("page_content");
  });
});
