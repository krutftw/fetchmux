import { describe, expect, it } from "vitest";
import { FetchMuxError, ProviderError } from "../src/errors.js";

describe("FetchMuxError", () => {
  it("uses a safe internal-error status by default", () => {
    const error = new FetchMuxError({
      code: "INTERNAL_ERROR",
      message: "The request could not be completed",
    });

    expect(error).toMatchObject({
      name: "FetchMuxError",
      code: "INTERNAL_ERROR",
      message: "The request could not be completed",
      statusCode: 500,
    });
    expect(error).not.toHaveProperty("traceId");
    expect(error).not.toHaveProperty("details");
  });

  it("retains explicitly safe response context", () => {
    const error = new FetchMuxError({
      code: "NO_ELIGIBLE_PROVIDER",
      message: "No configured provider satisfies this policy",
      statusCode: 422,
      traceId: "rt_test",
      details: { reasonCodes: ["COST_UNKNOWN"] },
    });

    expect(error).toMatchObject({
      statusCode: 422,
      traceId: "rt_test",
      details: { reasonCodes: ["COST_UNKNOWN"] },
    });
  });
});

describe("ProviderError", () => {
  it("carries retry classification without an upstream body", () => {
    const error = new ProviderError({
      provider: "brave",
      code: "RATE_LIMITED",
      message: "Brave rate limited the request",
      retryable: true,
      statusCode: 429,
    });

    expect(error).toMatchObject({
      name: "ProviderError",
      provider: "brave",
      code: "RATE_LIMITED",
      retryable: true,
      statusCode: 429,
    });
    expect(Object.keys(error)).not.toContain("body");
    expect(Object.keys(error)).not.toContain("headers");
  });

  it("omits status when a network failure has none", () => {
    const error = new ProviderError({
      provider: "exa",
      code: "NETWORK_ERROR",
      message: "Exa could not be reached",
      retryable: true,
    });

    expect(error).not.toHaveProperty("statusCode");
  });
});
