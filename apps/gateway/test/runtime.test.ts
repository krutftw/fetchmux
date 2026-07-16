import type { FetchLike } from "@fetchmux/core";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { createGatewayRuntime, parseServerAddress } from "../src/runtime.js";

const openApps: FastifyInstance[] = [];

afterEach(async () => {
  await Promise.all(openApps.splice(0).map((app) => app.close()));
});

const braveFetch: FetchLike = async () =>
  new Response(
    JSON.stringify({
      web: {
        results: [
          {
            title: "Runtime evidence",
            url: "https://example.com/runtime",
            description: "Fixture-backed evidence",
          },
        ],
      },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );

describe("createGatewayRuntime", () => {
  it("wires environment BYOK configuration through a real local search", async () => {
    const events: unknown[] = [];
    const runtime = createGatewayRuntime({
      env: {
        FETCHMUX_API_KEY: "gateway-secret",
        BRAVE_API_KEY: "brave-secret",
        BRAVE_COST_PER_REQUEST_USD: "0.005",
      },
      fetch: braveFetch,
      logger: false,
      version: "0.1.0-runtime-test",
      warningSink: () => undefined,
      eventSink: (event) => events.push(event),
    });
    openApps.push(runtime.app);

    const response = await runtime.app.inject({
      method: "POST",
      url: "/v1/search",
      headers: { authorization: "Bearer gateway-secret" },
      payload: { query: "runtime", maxCostUsd: 0.01 },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({
      results: [{ provider: "brave", title: "Runtime evidence", rank: 1 }],
      route: {
        selectedProvider: "brave",
        estimatedCostUsd: 0.005,
        fallbackUsed: false,
      },
    });
    expect(response.json().data.route.traceId).toMatch(/^rt_[0-9a-f-]{36}$/);
    expect(runtime.registry.providers).toHaveLength(1);
    expect(events).toHaveLength(1);
  });

  it("supports comma-separated rotation keys and explicit auth bypass parsing", async () => {
    const warnings: string[] = [];
    const runtime = createGatewayRuntime({
      env: {
        FETCHMUX_API_KEYS: " old-key, new-key, old-key ",
        FETCHMUX_AUTH_DISABLED: "false",
      },
      fetch: braveFetch,
      logger: false,
      version: "test",
      warningSink: (warning) => warnings.push(warning),
      eventSink: () => undefined,
    });
    openApps.push(runtime.app);

    const response = await runtime.app.inject({
      method: "GET",
      url: "/v1/providers",
      headers: { authorization: "Bearer new-key" },
    });

    expect(response.statusCode).toBe(200);
    expect(runtime.apiKeys).toEqual(["old-key", "new-key"]);
    expect(runtime.authDisabled).toBe(false);
    expect(warnings).toEqual([]);
  });

  it("requires the exact true value to disable auth", () => {
    const runtime = createGatewayRuntime({
      env: { FETCHMUX_AUTH_DISABLED: "TRUE" },
      fetch: braveFetch,
      logger: false,
      version: "test",
      warningSink: () => undefined,
      eventSink: () => undefined,
    });
    openApps.push(runtime.app);

    expect(runtime.authDisabled).toBe(false);
  });
});

describe("parseServerAddress", () => {
  it("uses local-only defaults", () => {
    expect(parseServerAddress({})).toEqual({ host: "127.0.0.1", port: 8_787 });
  });

  it("accepts an explicit host and valid TCP port", () => {
    expect(parseServerAddress({ FETCHMUX_HOST: "0.0.0.0", FETCHMUX_PORT: "9000" })).toEqual({
      host: "0.0.0.0",
      port: 9_000,
    });
  });

  it.each(["0", "65536", "not-a-port", "1.5"])("rejects invalid port %s", (port) => {
    expect(() => parseServerAddress({ FETCHMUX_PORT: port })).toThrow(
      "FETCHMUX_PORT must be an integer from 1 to 65535",
    );
  });
});
