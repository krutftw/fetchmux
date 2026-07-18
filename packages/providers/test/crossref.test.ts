import { type Clock, type FetchLike, searchRequestSchema } from "@fetchmux/core";
import { describe, expect, it } from "vitest";
import { CrossrefSearchAdapter, createCrossrefProfile } from "../src/crossref.js";

const clock: Clock = { now: () => Date.parse("2026-07-18T08:00:00.000Z") };

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

const validResponse = {
  status: "ok",
  "message-type": "work-list",
  "message-version": "1.0.0",
  message: {
    "total-results": 1,
    items: [
      {
        DOI: "10.1000/fetchmux",
        title: ["Evidence-aware retrieval for tool-using agents"],
        URL: "https://doi.org/10.1000/fetchmux",
        author: [{ given: "Ada", family: "Lovelace" }, { name: "Retrieval Lab" }],
        published: { "date-parts": [[2026, 7, 18]] },
        "container-title": ["Journal of Agent Systems"],
        publisher: "Example Press",
        type: "journal-article",
        score: 42.5,
      },
    ],
  },
} as const;

describe("CrossrefSearchAdapter", () => {
  it("builds an identified, bounded scholarly metadata request", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;
    const adapter = new CrossrefSearchAdapter({
      contactEmail: "hello@fetchmux.com",
      fetch: responseFetch(validResponse, (input, init) => {
        capturedUrl = String(input);
        capturedInit = init;
      }),
      clock,
    });

    await adapter.search(
      searchRequestSchema.parse({
        query: "retrieval agents",
        task: "scholarly",
        freshness: "7d",
        limit: 3,
      }),
      { signal: new AbortController().signal, traceId: "rt_test" },
    );

    const url = new URL(capturedUrl);
    expect(`${url.origin}${url.pathname}`).toBe("https://api.crossref.org/v1/works");
    expect(url.searchParams.get("query.bibliographic")).toBe("retrieval agents");
    expect(url.searchParams.get("rows")).toBe("3");
    expect(url.searchParams.get("filter")).toBe("from-pub-date:2026-07-11");
    expect(url.searchParams.get("mailto")).toBe("hello@fetchmux.com");
    expect(url.searchParams.get("select")).toContain("DOI,title,URL");
    expect(capturedInit?.method).toBe("GET");
    expect(new Headers(capturedInit?.headers).get("User-Agent")).toBe(
      "FetchMuxBot/0.1 (https://fetchmux.com; mailto:hello@fetchmux.com)",
    );
    expect(new Headers(capturedInit?.headers).has("Authorization")).toBe(false);
  });

  it("normalizes bibliographic metadata without copying abstracts", async () => {
    const adapter = new CrossrefSearchAdapter({
      contactEmail: "hello@fetchmux.com",
      fetch: responseFetch(validResponse),
      clock,
    });

    const response = await adapter.search(
      searchRequestSchema.parse({ query: "retrieval agents", task: "scholarly" }),
      { signal: new AbortController().signal, traceId: "rt_test" },
    );

    expect(response).toEqual({
      results: [
        {
          title: "Evidence-aware retrieval for tool-using agents",
          url: "https://doi.org/10.1000/fetchmux",
          snippet:
            "Published in Journal of Agent Systems. Publisher: Example Press. DOI: 10.1000/fetchmux.",
          publishedAt: "2026-07-18T00:00:00.000Z",
          author: "Ada Lovelace; Retrieval Lab",
          providerScore: 42.5,
          metadata: {
            doi: "10.1000/fetchmux",
            type: "journal-article",
            publisher: "Example Press",
            containerTitle: "Journal of Agent Systems",
          },
        },
      ],
      metadata: { totalResults: 1 },
    });
    expect(JSON.stringify(response)).not.toContain("abstract");
  });

  it("maps 24-hour freshness to the previous UTC publication date", async () => {
    let capturedUrl = "";
    const adapter = new CrossrefSearchAdapter({
      contactEmail: "hello@fetchmux.com",
      fetch: responseFetch(validResponse, (input) => {
        capturedUrl = String(input);
      }),
      clock,
    });

    await adapter.search(
      searchRequestSchema.parse({ query: "retrieval agents", task: "scholarly", freshness: "24h" }),
      { signal: new AbortController().signal, traceId: "rt_test" },
    );

    expect(new URL(capturedUrl).searchParams.get("filter")).toBe("from-pub-date:2026-07-17");
  });

  it("enforces Crossref's documented local concurrency ceiling", async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    const fetch: FetchLike = async () => {
      calls += 1;
      await gate;
      return new Response(JSON.stringify(validResponse), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };
    const adapter = new CrossrefSearchAdapter({
      contactEmail: "hello@fetchmux.com",
      fetch,
      clock,
    });
    const request = searchRequestSchema.parse({ query: "q", task: "scholarly" });
    const context = { signal: new AbortController().signal, traceId: "rt_test" };
    const active = [
      adapter.search(request, context),
      adapter.search(request, context),
      adapter.search(request, context),
    ];

    expect(calls).toBe(3);
    await expect(adapter.search(request, context)).rejects.toMatchObject({
      code: "RATE_LIMITED",
      retryable: true,
    });
    expect(calls).toBe(3);

    release?.();
    await Promise.all(active);
  });

  it("enforces Crossref's documented local rolling request rate", async () => {
    let calls = 0;
    const adapter = new CrossrefSearchAdapter({
      contactEmail: "hello@fetchmux.com",
      fetch: responseFetch(validResponse, () => {
        calls += 1;
      }),
      clock,
    });
    const request = searchRequestSchema.parse({ query: "q", task: "scholarly" });
    const context = { signal: new AbortController().signal, traceId: "rt_test" };

    for (let index = 0; index < 10; index += 1) await adapter.search(request, context);
    await expect(adapter.search(request, context)).rejects.toMatchObject({
      code: "RATE_LIMITED",
      retryable: true,
    });
    expect(calls).toBe(10);
  });

  it("rejects an unsupported upstream response shape", async () => {
    const adapter = new CrossrefSearchAdapter({
      contactEmail: "hello@fetchmux.com",
      fetch: responseFetch({ status: "ok", message: { items: [{ title: ["Missing DOI"] }] } }),
      clock,
    });

    await expect(
      adapter.search(searchRequestSchema.parse({ query: "q", task: "scholarly" }), {
        signal: new AbortController().signal,
        traceId: "rt_test",
      }),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE", retryable: false });
  });
});

describe("createCrossrefProfile", () => {
  it("is a zero-provider-charge scholarly metadata route", () => {
    const profile = createCrossrefProfile();
    const request = searchRequestSchema.parse({ query: "q", task: "scholarly" });

    expect(profile.supportedTasks).toEqual(["scholarly"]);
    expect(profile.estimateCostUsd(request)).toBe(0);
    expect(profile.qualityByTask.scholarly).toBeGreaterThan(0);
  });
});
