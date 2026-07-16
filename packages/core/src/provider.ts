import type { Freshness, RetrievalTask, SearchRequest } from "./contracts.js";

export interface ProviderSearchResult {
  title: string;
  url: string;
  snippet?: string;
  publishedAt?: string;
  author?: string;
  providerScore?: number;
  metadata?: Readonly<Record<string, unknown>>;
}

export interface ProviderSearchResponse {
  results: readonly ProviderSearchResult[];
  metadata?: Readonly<Record<string, unknown>>;
}

export interface ProviderExecutionContext {
  signal: AbortSignal;
  traceId: string;
}

export interface ProviderAdapter {
  readonly id: string;
  search(
    request: SearchRequest,
    context: ProviderExecutionContext,
  ): Promise<ProviderSearchResponse>;
}

export type QualityByTask = Readonly<Record<RetrievalTask, number>>;

export interface ProviderProfile {
  readonly id: string;
  readonly displayName: string;
  readonly supportedTasks: readonly RetrievalTask[];
  readonly supportedFreshness: readonly Freshness[];
  readonly qualityByTask: QualityByTask;
  readonly baselineReliability: number;
  readonly baselineP95LatencyMs: number;
  estimateCostUsd(request: SearchRequest): number | null;
}

export interface ConfiguredProvider {
  readonly adapter: ProviderAdapter;
  readonly profile: ProviderProfile;
}

export interface ProviderEstimate {
  readonly providerId: string;
  readonly estimatedCostUsd: number | null;
  readonly estimatedLatencyMs: number;
  readonly qualityScore: number;
  readonly reliabilityScore: number;
}

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface Clock {
  now(): number;
}

export interface IdFactory {
  createTraceId(): string;
}
