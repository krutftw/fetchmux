import type { FetchLike, RoutePreview, SearchResponse } from "@fetchmux/core";
import { describe, expect, it } from "vitest";
import { FetchMux, FetchMuxClientError } from "../src/client.js";

const searchResponse: SearchResponse = {
  results: [
    {
      title: "SDK evidence",
      url: "https://example.com/sdk",
      provider: "brave",
      rank: 1,
    },
  ],
  route: {
    selectedProvider: "brave",
    attemptedProviders: ["brave"],
    attempts: [
      {
        provider: "brave",
        startedAt: "2026-07-16T08:00:00.000Z",
        endedAt: "2026-07-16T08:00:00.020Z",
        latencyMs: 20,
        estimatedCostUsd: 0.005,
        outcome: "success",
      },
    ],
    reasonCodes: ["TASK_MATCH", "QUALITY_PRIORITY", "RELIABILITY_WEIGHT"],
    estimatedCostUsd: 0.005,
    latencyMs: 20,
    fallbackUsed: false,
    traceId: "rt_sdk",
  },
};

const previewResponse: RoutePreview = {
  candidates: [
    {
      providerId: "brave",
      estimatedCostUsd: 0.005,
      estimatedLatencyMs: 800,
      totalScore: 0.9,
      components: { quality: 0.8, reliability: 0.99, cost: 1, latency: 1 },
      reasonCodes: ["TASK_MATCH", "QUALITY_PRIORITY", "RELIABILITY_WEIGHT"],
    },
  ],
};

function responseFetch(
  payload: unknown,
  status = 200,
  capture?: (input: string | URL | Request, init?: RequestInit) => void,
): FetchLike {
  return async (input, init) => {
    capture?.(input, init);
    return new Response(JSON.stringify(payload), {
      status,
      headers: { "content-type": "application/json" },
    });
  };
}

describe("FetchMux", () => {
  it("joins the base URL, authenticates, and validates a search response", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;
    const client = new FetchMux({
      baseUrl: "http://localhost:8787/gateway/",
      apiKey: "sdk-secret",
      fetch: responseFetch({ data: searchResponse }, 200, (input, init) => {
        capturedUrl = String(input);
        capturedInit = init;
      }),
    });

    const result = await client.search({
      query: "latest privacy reform",
      priority: "quality",
      maxCostUsd: 0.02,
    });

    expect(capturedUrl).toBe("http://localhost:8787/gateway/v1/search");
    expect(new Headers(capturedInit?.headers).get("Authorization")).toBe("Bearer sdk-secret");
    expect(JSON.parse(String(capturedInit?.body))).toEqual({
      query: "latest privacy reform",
      priority: "quality",
      maxCostUsd: 0.02,
    });
    expect(result).toEqual(searchResponse);
  });

  it("omits authorization when no client key is configured", async () => {
    let headers = new Headers();
    const client = new FetchMux({
      baseUrl: "http://localhost:8787",
      fetch: responseFetch({ data: previewResponse }, 200, (_input, init) => {
        headers = new Headers(init?.headers);
      }),
    });

    await client.preview({ query: "q" });

    expect(headers.has("Authorization")).toBe(false);
  });

  it("validates and returns a route preview", async () => {
    const client = new FetchMux({
      baseUrl: "http://localhost:8787",
      apiKey: "key",
      fetch: responseFetch({ data: previewResponse }),
    });

    await expect(client.preview({ query: "q" })).resolves.toEqual(previewResponse);
  });

  it("forwards an external abort signal", async () => {
    const controller = new AbortController();
    let capturedSignal: AbortSignal | null | undefined;
    const client = new FetchMux({
      baseUrl: "http://localhost:8787",
      fetch: responseFetch({ data: searchResponse }, 200, (_input, init) => {
        capturedSignal = init?.signal;
      }),
    });

    await client.search({ query: "q" }, { signal: controller.signal });

    expect(capturedSignal).toBe(controller.signal);
  });

  it("decodes a FetchMux API error", async () => {
    const client = new FetchMux({
      baseUrl: "http://localhost:8787",
      apiKey: "key",
      fetch: responseFetch(
        {
          error: {
            code: "BUDGET_EXHAUSTED",
            message: "No fallback provider fits the remaining retrieval budget",
            traceId: "rt_budget",
            details: { remainingBudgetUsd: 0.004 },
          },
        },
        422,
      ),
    });

    await expect(client.search({ query: "q" })).rejects.toMatchObject({
      name: "FetchMuxClientError",
      code: "BUDGET_EXHAUSTED",
      statusCode: 422,
      traceId: "rt_budget",
      details: { remainingBudgetUsd: 0.004 },
    });
  });

  it("rejects an invalid success envelope as a protocol error", async () => {
    const client = new FetchMux({
      baseUrl: "http://localhost:8787",
      fetch: responseFetch({ data: { results: "not-an-array" } }),
    });

    await expect(client.search({ query: "q" })).rejects.toMatchObject({
      code: "FETCHMUX_PROTOCOL_ERROR",
      statusCode: 502,
    });
  });

  it("does not expose client keys or raw error bodies", async () => {
    const client = new FetchMux({
      baseUrl: "http://localhost:8787",
      apiKey: "sdk-super-secret",
      fetch: responseFetch({ raw: "provider raw sk-upstream-secret" }, 500),
    });

    try {
      await client.search({ query: "q" });
      throw new Error("Expected client search to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(FetchMuxClientError);
      expect(JSON.stringify(error)).not.toContain("sdk-super-secret");
      expect(JSON.stringify(error)).not.toContain("sk-upstream-secret");
      expect((error as Error).cause).toBeUndefined();
    }
  });

  it("wraps a secret-bearing transport failure safely", async () => {
    const fetch: FetchLike = async () => {
      throw new TypeError("socket failed near sdk-super-secret");
    };
    const client = new FetchMux({
      baseUrl: "http://localhost:8787",
      apiKey: "sdk-super-secret",
      fetch,
    });

    await expect(client.search({ query: "q" })).rejects.toMatchObject({
      code: "FETCHMUX_NETWORK_ERROR",
      statusCode: 503,
      message: "FetchMux could not be reached",
    });
    await client.search({ query: "q" }).catch((error: unknown) => {
      expect(JSON.stringify(error)).not.toContain("sdk-super-secret");
    });
  });
});
