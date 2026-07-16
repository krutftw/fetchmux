import {
  FetchMuxError,
  type RetrievalRouter,
  type RoutePreview,
  type SearchRequest,
  type SearchResponse,
} from "@fetchmux/core";
import type { ProviderStatus } from "@fetchmux/providers";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp, type GatewayEvent } from "../src/app.js";

const authorization = { authorization: "Bearer fetchmux-test-key" };
const openApps: FastifyInstance[] = [];

afterEach(async () => {
  await Promise.all(openApps.splice(0).map((app) => app.close()));
});

const availableStatus: ProviderStatus = {
  id: "brave",
  displayName: "Brave Search",
  available: true,
  costConfigured: true,
  supportedTasks: ["balanced", "fresh_facts", "deep_research"],
  issues: [],
};

const unavailableStatus: ProviderStatus = {
  id: "exa",
  displayName: "Exa Search",
  available: false,
  costConfigured: false,
  supportedTasks: ["balanced", "fresh_facts", "deep_research", "page_content"],
  issues: ["EXA_API_KEY is not configured"],
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

const searchResponse: SearchResponse = {
  results: [
    {
      title: "Evidence",
      url: "https://example.com/evidence",
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
    traceId: "rt_gateway",
  },
};

interface TestAppOptions {
  statuses?: readonly ProviderStatus[];
  preview?: (request: SearchRequest) => RoutePreview;
  search?: (request: SearchRequest) => Promise<SearchResponse>;
  allowedOrigins?: readonly string[];
  events?: GatewayEvent[];
}

function app(options: TestAppOptions = {}): FastifyInstance {
  const router = {
    preview: options.preview ?? (() => previewResponse),
    search: options.search ?? (async () => searchResponse),
  } as Pick<RetrievalRouter, "preview" | "search">;
  const instance = buildApp({
    router,
    providerStatuses: options.statuses ?? [availableStatus, unavailableStatus],
    apiKeys: ["fetchmux-test-key"],
    authDisabled: false,
    warningSink: () => undefined,
    eventSink: (event) => options.events?.push(event),
    allowedOrigins: options.allowedOrigins ?? [],
    logger: false,
    version: "0.1.0-test",
  });
  openApps.push(instance);
  return instance;
}

describe("gateway application", () => {
  it("returns health, version, and a response request ID", async () => {
    const response = await app().inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: { status: "ok", version: "0.1.0-test" } });
    expect(response.headers["x-request-id"]).toMatch(/^req-/);
  });

  it("returns 503 readiness when no provider is configured", async () => {
    const response = await app({ statuses: [unavailableStatus] }).inject({
      method: "GET",
      url: "/ready",
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      data: { status: "not_ready", availableProviders: [] },
    });
  });

  it("returns ready with available provider IDs only", async () => {
    const response = await app().inject({ method: "GET", url: "/ready" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: { status: "ready", availableProviders: ["brave"] },
    });
  });

  it("returns provider capability status without credentials", async () => {
    const response = await app().inject({
      method: "GET",
      url: "/v1/providers",
      headers: authorization,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: { providers: [availableStatus, unavailableStatus] },
    });
    expect(JSON.stringify(response.json())).not.toContain("fetchmux-test-key");
  });

  it("validates and delegates a no-spend route preview", async () => {
    let received: SearchRequest | undefined;
    const response = await app({
      preview: (request) => {
        received = request;
        return previewResponse;
      },
    }).inject({
      method: "POST",
      url: "/v1/route/preview",
      headers: authorization,
      payload: { query: "privacy reform", priority: "quality" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: previewResponse });
    expect(received).toMatchObject({
      query: "privacy reform",
      priority: "quality",
      task: "balanced",
      limit: 8,
    });
  });

  it("rejects invalid search input before delegation", async () => {
    let calls = 0;
    const response = await app({
      preview: () => {
        calls += 1;
        return previewResponse;
      },
    }).inject({
      method: "POST",
      url: "/v1/route/preview",
      headers: authorization,
      payload: { query: "   " },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: { code: "VALIDATION_ERROR", message: "Invalid retrieval request" },
    });
    expect(response.json().error.details).toBeInstanceOf(Array);
    expect(calls).toBe(0);
  });

  it("delegates search once and returns the stable data envelope", async () => {
    let calls = 0;
    const response = await app({
      search: async () => {
        calls += 1;
        return searchResponse;
      },
    }).inject({
      method: "POST",
      url: "/v1/search",
      headers: authorization,
      payload: { query: "privacy reform", maxCostUsd: 0.02 },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: searchResponse });
    expect(calls).toBe(1);
  });

  it("maps FetchMux errors to safe API errors", async () => {
    const response = await app({
      search: async () => {
        throw new FetchMuxError({
          code: "BUDGET_EXHAUSTED",
          message: "No fallback provider fits the remaining retrieval budget",
          statusCode: 422,
          traceId: "rt_budget",
          details: { remainingBudgetUsd: 0.004 },
        });
      },
    }).inject({
      method: "POST",
      url: "/v1/search",
      headers: authorization,
      payload: { query: "q" },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      error: {
        code: "BUDGET_EXHAUSTED",
        message: "No fallback provider fits the remaining retrieval budget",
        traceId: "rt_budget",
        details: { remainingBudgetUsd: 0.004 },
      },
    });
  });

  it("hides unknown errors and their secret-bearing messages", async () => {
    const response = await app({
      search: async () => {
        throw new Error("Authorization Bearer sk-secret raw query data");
      },
    }).inject({
      method: "POST",
      url: "/v1/search",
      headers: authorization,
      payload: { query: "q" },
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: { code: "INTERNAL_ERROR", message: "The request could not be completed" },
    });
    expect(response.body).not.toContain("sk-secret");
  });

  it("rejects payloads above the configured body limit", async () => {
    const response = await app().inject({
      method: "POST",
      url: "/v1/search",
      headers: authorization,
      payload: { query: "q", padding: "x".repeat(70_000) },
    });

    expect(response.statusCode).toBe(413);
    expect(response.json()).toEqual({
      error: { code: "PAYLOAD_TOO_LARGE", message: "The request body is too large" },
    });
  });

  it("adds CORS only for an explicitly allowed origin", async () => {
    const instance = app({ allowedOrigins: ["https://console.example.com"] });
    const allowed = await instance.inject({
      method: "OPTIONS",
      url: "/v1/search",
      headers: {
        origin: "https://console.example.com",
        "access-control-request-method": "POST",
      },
    });
    const denied = await instance.inject({
      method: "OPTIONS",
      url: "/v1/search",
      headers: {
        origin: "https://attacker.example",
        "access-control-request-method": "POST",
      },
    });

    expect(allowed.headers["access-control-allow-origin"]).toBe("https://console.example.com");
    expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("emits allowlisted route telemetry without the query", async () => {
    const events: GatewayEvent[] = [];
    await app({ events }).inject({
      method: "POST",
      url: "/v1/search",
      headers: authorization,
      payload: { query: "private customer query" },
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      method: "POST",
      route: "/v1/search",
      statusCode: 200,
      selectedProvider: "brave",
      estimatedCostUsd: 0.005,
    });
    expect(JSON.stringify(events)).not.toContain("private customer query");
  });
});
