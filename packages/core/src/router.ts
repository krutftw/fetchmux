import {
  type NormalizedSearchResult,
  normalizedSearchResultSchema,
  type RouteAttempt,
  type RouteReasonCode,
  routeReceiptSchema,
  type SearchRequestInput,
  type SearchResponse,
  searchRequestSchema,
  searchResponseSchema,
} from "./contracts.js";
import { FetchMuxError, ProviderError } from "./errors.js";
import type { ProviderHealthStore } from "./health.js";
import type { Clock, ConfiguredProvider, IdFactory, ProviderSearchResult } from "./provider.js";
import { type RankableProvider, type RankedProvider, rankProviders } from "./ranking.js";

export interface RouterScheduler {
  schedule(callback: () => void, delayMs: number): unknown;
  cancel(handle: unknown): void;
}

export interface RetrievalRouterOptions {
  readonly providers: readonly ConfiguredProvider[];
  readonly healthStore: ProviderHealthStore;
  readonly clock: Clock;
  readonly idFactory: IdFactory;
  readonly scheduler: RouterScheduler;
}

export interface RoutePreviewCandidate {
  readonly providerId: string;
  readonly estimatedCostUsd: number | null;
  readonly estimatedLatencyMs: number;
  readonly totalScore: number;
  readonly components: RankedProvider["components"];
  readonly reasonCodes: RankedProvider["reasonCodes"];
}

export interface RoutePreview {
  readonly candidates: readonly RoutePreviewCandidate[];
}

export class RetrievalRouter {
  private readonly providers: readonly ConfiguredProvider[];
  private readonly healthStore: ProviderHealthStore;
  private readonly clock: Clock;
  private readonly idFactory: IdFactory;
  private readonly scheduler: RouterScheduler;

  constructor(options: RetrievalRouterOptions) {
    this.providers = options.providers;
    this.clock = options.clock;
    this.idFactory = options.idFactory;
    this.scheduler = options.scheduler;
    this.healthStore = options.healthStore;
  }

  preview(input: SearchRequestInput): RoutePreview {
    const request = searchRequestSchema.parse(input);
    const ranked = rankProviders(
      request,
      this.providers.map((provider) => this.toRankableProvider(provider)),
    );
    return {
      candidates: ranked.map((candidate) => ({
        providerId: candidate.providerId,
        estimatedCostUsd: candidate.estimatedCostUsd,
        estimatedLatencyMs: candidate.estimatedLatencyMs,
        totalScore: candidate.totalScore,
        components: candidate.components,
        reasonCodes: candidate.reasonCodes,
      })),
    };
  }

  async search(input: SearchRequestInput): Promise<SearchResponse> {
    const request = searchRequestSchema.parse(input);
    const traceId = this.idFactory.createTraceId();
    const routeStartedAt = this.clock.now();
    const deadline = routeStartedAt + request.maxLatencyMs;
    const attemptedProviderIds = new Set<string>();
    const attempts: RouteAttempt[] = [];
    let knownEstimatedCostUsd = 0;
    let hasUnknownEstimatedCost = false;

    while (true) {
      this.assertBeforeDeadline(deadline, traceId, attempts);
      const remainingProviders = this.providers.filter(
        ({ profile }) => !attemptedProviderIds.has(profile.id),
      );
      if (remainingProviders.length === 0) {
        throw this.allProvidersFailed(traceId, attempts);
      }

      const remainingBudgetUsd =
        request.maxCostUsd === undefined
          ? undefined
          : Math.max(0, request.maxCostUsd - knownEstimatedCostUsd);
      let ranked: readonly RankedProvider[];
      try {
        ranked = rankProviders(
          request,
          remainingProviders.map((provider) => this.toRankableProvider(provider)),
          remainingBudgetUsd === undefined ? {} : { remainingBudgetUsd },
        );
      } catch (error) {
        if (
          attempts.length > 0 &&
          error instanceof FetchMuxError &&
          error.code === "NO_ELIGIBLE_PROVIDER" &&
          this.hasBudgetExclusion(error)
        ) {
          throw new FetchMuxError({
            code: "BUDGET_EXHAUSTED",
            message: "No fallback provider fits the remaining retrieval budget",
            statusCode: 422,
            traceId,
            details: {
              attemptedProviders: attempts.map((attempt) => attempt.provider),
              reservedCostUsd: knownEstimatedCostUsd,
              remainingBudgetUsd,
            },
          });
        }
        if (error instanceof FetchMuxError) {
          throw new FetchMuxError({
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            traceId,
            ...(error.details === undefined ? {} : { details: error.details }),
          });
        }
        throw error;
      }

      const selected = ranked[0];
      if (!selected) throw this.allProvidersFailed(traceId, attempts);
      const configured = remainingProviders.find(
        ({ profile }) => profile.id === selected.providerId,
      );
      if (!configured) throw this.allProvidersFailed(traceId, attempts);

      attemptedProviderIds.add(selected.providerId);
      if (selected.estimatedCostUsd === null) {
        hasUnknownEstimatedCost = true;
      } else {
        knownEstimatedCostUsd += selected.estimatedCostUsd;
      }

      const attemptStartedAt = this.clock.now();
      const remainingLatencyMs = deadline - attemptStartedAt;
      if (remainingLatencyMs <= 0) {
        throw this.deadlineExceeded(traceId, attempts);
      }

      const controller = new AbortController();
      const timeoutHandle = this.scheduler.schedule(
        () => controller.abort("FETCHMUX_DEADLINE"),
        remainingLatencyMs,
      );

      try {
        const providerResponse = await configured.adapter.search(request, {
          signal: controller.signal,
          traceId,
        });
        if (this.clock.now() >= deadline) {
          throw new ProviderError({
            provider: selected.providerId,
            code: "TIMEOUT",
            message: "Provider exceeded the retrieval deadline",
            retryable: true,
          });
        }

        const results = providerResponse.results.map((result, index) =>
          this.normalizeResult(result, selected.providerId, index + 1),
        );
        const attemptEndedAt = this.clock.now();
        const latencyMs = Math.max(0, attemptEndedAt - attemptStartedAt);
        this.healthStore.recordSuccess(selected.providerId, { latencyMs });
        attempts.push({
          provider: selected.providerId,
          startedAt: new Date(attemptStartedAt).toISOString(),
          endedAt: new Date(attemptEndedAt).toISOString(),
          latencyMs,
          estimatedCostUsd: selected.estimatedCostUsd,
          outcome: "success",
        });

        const reasonCodes: RouteReasonCode[] = [...selected.reasonCodes];
        if (attempts.length > 1) reasonCodes.push("FALLBACK_AFTER_RETRYABLE_ERROR");
        const route = routeReceiptSchema.parse({
          selectedProvider: selected.providerId,
          attemptedProviders: attempts.map((attempt) => attempt.provider),
          attempts,
          reasonCodes,
          estimatedCostUsd: hasUnknownEstimatedCost ? null : knownEstimatedCostUsd,
          latencyMs: Math.max(0, attemptEndedAt - routeStartedAt),
          fallbackUsed: attempts.length > 1,
          traceId,
        });
        return searchResponseSchema.parse({ results, route });
      } catch (error) {
        const attemptEndedAt = this.clock.now();
        const latencyMs = Math.max(0, attemptEndedAt - attemptStartedAt);
        const providerError = this.classifyError(
          selected.providerId,
          error,
          controller.signal.aborted,
        );
        this.healthStore.recordFailure(selected.providerId, {
          retryable: providerError.retryable,
          latencyMs,
        });
        attempts.push({
          provider: selected.providerId,
          startedAt: new Date(attemptStartedAt).toISOString(),
          endedAt: new Date(attemptEndedAt).toISOString(),
          latencyMs,
          estimatedCostUsd: selected.estimatedCostUsd,
          outcome: providerError.retryable ? "retryable_error" : "terminal_error",
          errorCode: providerError.code,
        });

        if (controller.signal.aborted || this.clock.now() >= deadline) {
          throw this.deadlineExceeded(traceId, attempts);
        }
        if (!providerError.retryable) {
          throw this.allProvidersFailed(traceId, attempts);
        }
      } finally {
        this.scheduler.cancel(timeoutHandle);
      }
    }
  }

  private toRankableProvider(provider: ConfiguredProvider): RankableProvider {
    const snapshot = this.healthStore.getSnapshot(provider.profile.id);
    const observed =
      snapshot.observedLatencyMs === undefined
        ? {}
        : {
            observedReliability: snapshot.reliability,
            observedP95LatencyMs: snapshot.observedLatencyMs,
          };
    return {
      profile: provider.profile,
      circuitOpen: snapshot.circuitState === "open",
      ...observed,
    };
  }

  private normalizeResult(
    result: ProviderSearchResult,
    providerId: string,
    rank: number,
  ): NormalizedSearchResult {
    return normalizedSearchResultSchema.parse({
      title: result.title,
      url: result.url,
      provider: providerId,
      rank,
      ...(result.snippet === undefined ? {} : { snippet: result.snippet }),
      ...(result.publishedAt === undefined ? {} : { publishedAt: result.publishedAt }),
      ...(result.author === undefined ? {} : { author: result.author }),
      ...(result.providerScore === undefined ? {} : { providerScore: result.providerScore }),
      ...(result.metadata === undefined ? {} : { metadata: result.metadata }),
    });
  }

  private classifyError(providerId: string, error: unknown, aborted: boolean): ProviderError {
    if (error instanceof ProviderError) return error;
    if (aborted) {
      return new ProviderError({
        provider: providerId,
        code: "TIMEOUT",
        message: "Provider exceeded the retrieval deadline",
        retryable: true,
      });
    }
    return new ProviderError({
      provider: providerId,
      code: "INVALID_RESPONSE",
      message: "Provider returned an unclassified or invalid response",
      retryable: false,
    });
  }

  private assertBeforeDeadline(
    deadline: number,
    traceId: string,
    attempts: readonly RouteAttempt[],
  ): void {
    if (this.clock.now() >= deadline) throw this.deadlineExceeded(traceId, attempts);
  }

  private deadlineExceeded(traceId: string, attempts: readonly RouteAttempt[]): FetchMuxError {
    return new FetchMuxError({
      code: "DEADLINE_EXCEEDED",
      message: "The retrieval deadline was exceeded",
      statusCode: 504,
      traceId,
      details: { attemptedProviders: attempts.map((attempt) => attempt.provider) },
    });
  }

  private allProvidersFailed(traceId: string, attempts: readonly RouteAttempt[]): FetchMuxError {
    return new FetchMuxError({
      code: "ALL_PROVIDERS_FAILED",
      message: "No provider could complete this retrieval request",
      statusCode: 502,
      traceId,
      details: {
        attemptedProviders: attempts.map((attempt) => attempt.provider),
        providerErrorCodes: attempts.flatMap((attempt) =>
          attempt.errorCode === undefined ? [] : [attempt.errorCode],
        ),
      },
    });
  }

  private hasBudgetExclusion(error: FetchMuxError): boolean {
    const exclusions = error.details?.exclusions;
    if (!exclusions || typeof exclusions !== "object" || Array.isArray(exclusions)) return false;
    const values = Object.values(exclusions);
    return (
      values.length > 0 &&
      values.every(
        (codes) =>
          Array.isArray(codes) &&
          codes.some((code) => code === "COST_UNKNOWN" || code === "COST_EXCEEDS_BUDGET"),
      )
    );
  }
}
