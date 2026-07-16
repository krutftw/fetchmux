import {
  type FetchLike,
  type RoutePreview,
  routeReasonCodeSchema,
  type SearchRequestInput,
  type SearchResponse,
  searchResponseSchema,
} from "@fetchmux/core";
import { type ZodType, z } from "zod";

const routePreviewSchema: ZodType<RoutePreview> = z.object({
  candidates: z.array(
    z.object({
      providerId: z.string(),
      estimatedCostUsd: z.number().nonnegative().nullable(),
      estimatedLatencyMs: z.number().nonnegative(),
      totalScore: z.number().min(0).max(1),
      components: z.object({
        quality: z.number().min(0).max(1),
        reliability: z.number().min(0).max(1),
        cost: z.number().min(0).max(1),
        latency: z.number().min(0).max(1),
      }),
      reasonCodes: z.array(routeReasonCodeSchema),
    }),
  ),
});

const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    traceId: z.string().optional(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});

export interface FetchMuxOptions {
  readonly baseUrl: string;
  readonly apiKey?: string;
  readonly fetch: FetchLike;
}

export interface ClientRequestOptions {
  readonly signal?: AbortSignal;
}

export interface FetchMuxClientErrorOptions {
  readonly code: string;
  readonly message: string;
  readonly statusCode: number;
  readonly traceId?: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export class FetchMuxClientError extends Error {
  readonly code: string;
  readonly statusCode: number;
  declare readonly traceId?: string;
  declare readonly details?: Readonly<Record<string, unknown>>;

  constructor(options: FetchMuxClientErrorOptions) {
    super(options.message);
    this.name = "FetchMuxClientError";
    this.code = options.code;
    this.statusCode = options.statusCode;
    if (options.traceId !== undefined) this.traceId = options.traceId;
    if (options.details !== undefined) this.details = options.details;
  }
}

export class FetchMux {
  private readonly baseUrl: URL;
  private readonly apiKey?: string;
  private readonly fetch: FetchLike;

  constructor(options: FetchMuxOptions) {
    this.baseUrl = new URL(options.baseUrl.endsWith("/") ? options.baseUrl : `${options.baseUrl}/`);
    if (options.apiKey !== undefined) this.apiKey = options.apiKey;
    this.fetch = options.fetch;
  }

  search(request: SearchRequestInput, options: ClientRequestOptions = {}): Promise<SearchResponse> {
    return this.post("v1/search", request, searchResponseSchema, options);
  }

  preview(request: SearchRequestInput, options: ClientRequestOptions = {}): Promise<RoutePreview> {
    return this.post("v1/route/preview", request, routePreviewSchema, options);
  }

  private async post<Output>(
    path: string,
    body: SearchRequestInput,
    schema: ZodType<Output>,
    options: ClientRequestOptions,
  ): Promise<Output> {
    let response: Response;
    try {
      response = await this.fetch(new URL(path, this.baseUrl), {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(this.apiKey === undefined ? {} : { Authorization: `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify(body),
        ...(options.signal === undefined ? {} : { signal: options.signal }),
      });
    } catch {
      throw new FetchMuxClientError({
        code: "FETCHMUX_NETWORK_ERROR",
        message: "FetchMux could not be reached",
        statusCode: 503,
      });
    }

    const payload = await safeJson(response);
    if (!response.ok) {
      const parsedError = errorEnvelopeSchema.safeParse(payload);
      if (parsedError.success) {
        throw new FetchMuxClientError({
          code: parsedError.data.error.code,
          message: parsedError.data.error.message,
          statusCode: response.status,
          ...(parsedError.data.error.traceId === undefined
            ? {}
            : { traceId: parsedError.data.error.traceId }),
          ...(parsedError.data.error.details === undefined
            ? {}
            : { details: parsedError.data.error.details }),
        });
      }
      throw protocolError();
    }

    const envelope = z.object({ data: schema }).safeParse(payload);
    if (!envelope.success) throw protocolError();
    return envelope.data.data;
  }
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function protocolError(): FetchMuxClientError {
  return new FetchMuxClientError({
    code: "FETCHMUX_PROTOCOL_ERROR",
    message: "FetchMux returned an unsupported response",
    statusCode: 502,
  });
}
