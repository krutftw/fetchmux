import type { RetrievalRouter } from "@fetchmux/core";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

const openApps: FastifyInstance[] = [];

afterEach(async () => {
  await Promise.all(openApps.splice(0).map((app) => app.close()));
});

function app(
  options: { apiKeys?: readonly string[]; authDisabled?: boolean; warnings?: string[] } = {},
) {
  const instance = buildApp({
    router: {
      preview: () => ({ candidates: [] }),
      search: async () => {
        throw new Error("Search not expected");
      },
    } as Pick<RetrievalRouter, "preview" | "search">,
    providerStatuses: [],
    apiKeys: options.apiKeys ?? ["fetchmux-test-key"],
    authDisabled: options.authDisabled ?? false,
    warningSink: (warning) => options.warnings?.push(warning),
    logger: false,
    version: "0.1.0-test",
  });
  openApps.push(instance);
  return instance;
}

describe("gateway authentication", () => {
  it("keeps the health endpoint public", async () => {
    const response = await app().inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ data: { status: "ok" } });
  });

  it("rejects a protected route without bearer authentication", async () => {
    const response = await app().inject({ method: "GET", url: "/v1/providers" });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: { code: "UNAUTHORIZED", message: "A valid FetchMux API key is required" },
    });
  });

  it.each(["Basic abc", "Bearer wrong-key", "Bearer "])(
    "rejects malformed or incorrect authorization %s",
    async (authorization) => {
      const response = await app().inject({
        method: "GET",
        url: "/v1/providers",
        headers: { authorization },
      });

      expect(response.statusCode).toBe(401);
      expect(JSON.stringify(response.json())).not.toContain("wrong-key");
    },
  );

  it("accepts any configured key to support rotation", async () => {
    const response = await app({ apiKeys: ["old-key", "new-key"] }).inject({
      method: "GET",
      url: "/v1/providers",
      headers: { authorization: "Bearer new-key" },
    });

    expect(response.statusCode).toBe(200);
  });

  it("refuses protected routes when authentication has no configured keys", async () => {
    const response = await app({ apiKeys: [] }).inject({
      method: "GET",
      url: "/v1/providers",
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      error: { code: "NOT_READY", message: "FetchMux authentication is not configured" },
    });
  });

  it("bypasses authentication only when explicitly disabled and emits a warning", async () => {
    const warnings: string[] = [];
    const response = await app({ apiKeys: [], authDisabled: true, warnings }).inject({
      method: "GET",
      url: "/v1/providers",
    });

    expect(response.statusCode).toBe(200);
    expect(warnings).toEqual([
      "FETCHMUX_AUTH_DISABLED=true: protected routes are running without authentication",
    ]);
  });
});
