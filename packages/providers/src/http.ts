import { type FetchLike, ProviderError } from "@fetchmux/core";
import type { ZodType } from "zod";

export interface RequestJsonOptions<Output> {
  readonly provider: string;
  readonly url: string | URL;
  readonly init?: RequestInit;
  readonly fetch: FetchLike;
  readonly signal: AbortSignal;
  readonly schema: ZodType<Output>;
}

function errorForStatus(provider: string, statusCode: number): ProviderError {
  if (statusCode === 429) {
    return new ProviderError({
      provider,
      code: "RATE_LIMITED",
      message: `${provider} rate limited the request`,
      retryable: true,
      statusCode,
    });
  }
  if (statusCode === 408) {
    return new ProviderError({
      provider,
      code: "TIMEOUT",
      message: `${provider} timed out`,
      retryable: true,
      statusCode,
    });
  }
  if (statusCode >= 500) {
    return new ProviderError({
      provider,
      code: "UPSTREAM_UNAVAILABLE",
      message: `${provider} is temporarily unavailable`,
      retryable: true,
      statusCode,
    });
  }
  if (statusCode === 401 || statusCode === 403) {
    return new ProviderError({
      provider,
      code: "AUTHENTICATION_FAILED",
      message: `${provider} rejected its configured credential`,
      retryable: false,
      statusCode,
    });
  }
  return new ProviderError({
    provider,
    code: "INVALID_REQUEST",
    message: `${provider} rejected the request`,
    retryable: false,
    statusCode,
  });
}

export async function requestJson<Output>(options: RequestJsonOptions<Output>): Promise<Output> {
  let response: Response;
  try {
    response = await options.fetch(options.url, {
      ...options.init,
      signal: options.signal,
    });
  } catch {
    if (options.signal.aborted) {
      throw new ProviderError({
        provider: options.provider,
        code: "ABORTED",
        message: `${options.provider} request was aborted`,
        retryable: true,
      });
    }
    throw new ProviderError({
      provider: options.provider,
      code: "NETWORK_ERROR",
      message: `${options.provider} could not be reached`,
      retryable: true,
    });
  }

  if (!response.ok) throw errorForStatus(options.provider, response.status);

  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new ProviderError({
      provider: options.provider,
      code: "INVALID_RESPONSE",
      message: `${options.provider} returned invalid JSON`,
      retryable: false,
    });
  }

  const parsed = options.schema.safeParse(value);
  if (!parsed.success) {
    throw new ProviderError({
      provider: options.provider,
      code: "INVALID_RESPONSE",
      message: `${options.provider} returned an unsupported response shape`,
      retryable: false,
    });
  }
  return parsed.data;
}
