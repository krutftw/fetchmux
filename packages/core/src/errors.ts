export type FetchMuxErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "NOT_READY"
  | "NO_ELIGIBLE_PROVIDER"
  | "BUDGET_EXHAUSTED"
  | "DEADLINE_EXCEEDED"
  | "ALL_PROVIDERS_FAILED"
  | "INTERNAL_ERROR";

export interface FetchMuxErrorOptions {
  code: FetchMuxErrorCode;
  message: string;
  statusCode?: number;
  traceId?: string;
  details?: Readonly<Record<string, unknown>>;
  cause?: unknown;
}

export class FetchMuxError extends Error {
  readonly code: FetchMuxErrorCode;
  readonly statusCode: number;
  declare readonly traceId?: string;
  declare readonly details?: Readonly<Record<string, unknown>>;

  constructor(options: FetchMuxErrorOptions) {
    super(options.message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "FetchMuxError";
    this.code = options.code;
    this.statusCode = options.statusCode ?? 500;
    if (options.traceId !== undefined) this.traceId = options.traceId;
    if (options.details !== undefined) this.details = options.details;
  }
}

export type ProviderErrorCode =
  | "ABORTED"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "UPSTREAM_UNAVAILABLE"
  | "AUTHENTICATION_FAILED"
  | "INVALID_REQUEST"
  | "INVALID_RESPONSE"
  | "NETWORK_ERROR";

export interface ProviderErrorOptions {
  provider: string;
  code: ProviderErrorCode;
  message: string;
  retryable: boolean;
  statusCode?: number;
  cause?: unknown;
}

export class ProviderError extends Error {
  readonly provider: string;
  readonly code: ProviderErrorCode;
  readonly retryable: boolean;
  declare readonly statusCode?: number;

  constructor(options: ProviderErrorOptions) {
    super(options.message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "ProviderError";
    this.provider = options.provider;
    this.code = options.code;
    this.retryable = options.retryable;
    if (options.statusCode !== undefined) this.statusCode = options.statusCode;
  }
}
