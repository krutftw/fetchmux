import type { FetchLike } from "@fetchmux/core";
import { ProviderError } from "@fetchmux/core";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { requestJson } from "../src/http.js";

const responseSchema = z.object({ ok: z.boolean() });

function fetchResponse(response: Response): FetchLike {
  return async () => response;
}

function execute(fetch: FetchLike, init: RequestInit = {}) {
  return requestJson({
    provider: "brave",
    url: "https://api.example.test/search",
    init,
    fetch,
    signal: new AbortController().signal,
    schema: responseSchema,
  });
}

describe("requestJson", () => {
  it("returns schema-validated JSON", async () => {
    const value = await execute(
      fetchResponse(
        new Response(JSON.stringify({ ok: true, ignored: "removed" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    expect(value).toEqual({ ok: true });
  });

  it.each([
    { status: 429, code: "RATE_LIMITED", retryable: true },
    { status: 408, code: "TIMEOUT", retryable: true },
    { status: 500, code: "UPSTREAM_UNAVAILABLE", retryable: true },
    { status: 503, code: "UPSTREAM_UNAVAILABLE", retryable: true },
    { status: 400, code: "INVALID_REQUEST", retryable: false },
    { status: 401, code: "AUTHENTICATION_FAILED", retryable: false },
    { status: 403, code: "AUTHENTICATION_FAILED", retryable: false },
  ])("classifies HTTP $status as $code", async ({ status, code, retryable }) => {
    await expect(
      execute(fetchResponse(new Response("upstream body", { status }))),
    ).rejects.toMatchObject({
      provider: "brave",
      code,
      retryable,
      statusCode: status,
    });
  });

  it("does not expose authorization headers or an upstream response body", async () => {
    const pending = execute(
      fetchResponse(new Response("raw sk-upstream-secret body", { status: 429 })),
      { headers: { Authorization: "Bearer sk-client-secret" } },
    );

    try {
      await pending;
      throw new Error("Expected requestJson to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError);
      const serialized = JSON.stringify(error);
      expect(serialized).not.toContain("sk-upstream-secret");
      expect(serialized).not.toContain("sk-client-secret");
      expect((error as Error).cause).toBeUndefined();
    }
  });

  it("classifies invalid JSON as a terminal provider response", async () => {
    await expect(
      execute(fetchResponse(new Response("not-json", { status: 200 }))),
    ).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
      retryable: false,
    });
  });

  it("classifies a schema mismatch as a terminal provider response", async () => {
    await expect(
      execute(
        fetchResponse(
          new Response(JSON.stringify({ ok: "yes" }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        ),
      ),
    ).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
      retryable: false,
    });
  });

  it("classifies an aborted fetch without exposing the abort reason", async () => {
    const controller = new AbortController();
    controller.abort("secret deadline context");
    const fetch: FetchLike = async () => {
      throw new DOMException("secret upstream abort body", "AbortError");
    };

    const pending = requestJson({
      provider: "exa",
      url: "https://api.example.test/search",
      fetch,
      signal: controller.signal,
      schema: responseSchema,
    });

    await expect(pending).rejects.toMatchObject({ code: "ABORTED", retryable: true });
    await pending.catch((error: unknown) => {
      expect(JSON.stringify(error)).not.toContain("secret");
    });
  });

  it("classifies an unhandled fetch failure as retryable network failure", async () => {
    const fetch: FetchLike = async () => {
      throw new TypeError("socket contained sensitive diagnostic data");
    };

    await expect(execute(fetch)).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      retryable: true,
    });
  });
});
