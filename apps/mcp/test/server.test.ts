import type { RoutePreview, SearchResponse } from "@fetchmux/core";
import { type FetchMux, FetchMuxClientError } from "@fetchmux/sdk";
import { describe, expect, it } from "vitest";
import { createMcpServer, createToolHandlers } from "../src/server.js";

const searchResponse: SearchResponse = {
  results: [
    {
      title: "MCP evidence",
      url: "https://example.com/mcp",
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
    traceId: "rt_mcp",
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

describe("FetchMux MCP tool handlers", () => {
  it("forwards search_web and returns normalized JSON content", async () => {
    let received: unknown;
    const handlers = createToolHandlers({
      search: async (request) => {
        received = request;
        return searchResponse;
      },
      preview: async () => previewResponse,
    } as Pick<FetchMux, "search" | "preview">);

    const result = await handlers.searchWeb({
      query: "latest privacy reform",
      priority: "quality",
      maxCostUsd: 0.02,
    });

    expect(received).toEqual({
      query: "latest privacy reform",
      priority: "quality",
      maxCostUsd: 0.02,
    });
    expect(result).toEqual({
      content: [{ type: "text", text: JSON.stringify(searchResponse) }],
    });
  });

  it("forwards preview_search_route without calling search", async () => {
    let previewCalls = 0;
    let searchCalls = 0;
    const handlers = createToolHandlers({
      search: async () => {
        searchCalls += 1;
        return searchResponse;
      },
      preview: async () => {
        previewCalls += 1;
        return previewResponse;
      },
    } as Pick<FetchMux, "search" | "preview">);

    const result = await handlers.previewRoute({ query: "q", maxCostUsd: 0.01 });

    expect(previewCalls).toBe(1);
    expect(searchCalls).toBe(0);
    expect(result).toEqual({
      content: [{ type: "text", text: JSON.stringify(previewResponse) }],
    });
  });

  it("returns a safe typed tool error", async () => {
    const handlers = createToolHandlers({
      search: async () => {
        throw new FetchMuxClientError({
          code: "BUDGET_EXHAUSTED",
          message: "No fallback provider fits the remaining retrieval budget",
          statusCode: 422,
          traceId: "rt_budget",
        });
      },
      preview: async () => previewResponse,
    } as Pick<FetchMux, "search" | "preview">);

    const result = await handlers.searchWeb({ query: "q" });

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: {
              code: "BUDGET_EXHAUSTED",
              message: "No fallback provider fits the remaining retrieval budget",
              traceId: "rt_budget",
            },
          }),
        },
      ],
    });
  });

  it("hides unknown tool errors and secret-bearing messages", async () => {
    const handlers = createToolHandlers({
      search: async () => {
        throw new Error("Authorization Bearer mcp-super-secret raw body");
      },
      preview: async () => previewResponse,
    } as Pick<FetchMux, "search" | "preview">);

    const result = await handlers.searchWeb({ query: "q" });

    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).not.toContain("mcp-super-secret");
    expect(JSON.stringify(result)).toContain("MCP_TOOL_ERROR");
  });
});

describe("createMcpServer", () => {
  it("registers the two intended read-only tools", () => {
    const bundle = createMcpServer({
      client: {
        search: async () => searchResponse,
        preview: async () => previewResponse,
      } as Pick<FetchMux, "search" | "preview">,
      version: "0.1.0-test",
    });

    expect(bundle.registeredTools).toEqual({
      searchWeb: expect.objectContaining({ enabled: true }),
      previewRoute: expect.objectContaining({ enabled: true }),
    });
    expect(bundle.registeredTools.searchWeb.annotations).toMatchObject({
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: true,
    });
    expect(bundle.registeredTools.previewRoute.annotations).toMatchObject({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    });
  });
});
