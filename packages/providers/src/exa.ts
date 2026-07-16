import type {
  Clock,
  FetchLike,
  ProviderAdapter,
  ProviderExecutionContext,
  ProviderProfile,
  ProviderSearchResponse,
  SearchRequest,
} from "@fetchmux/core";
import { z } from "zod";
import { requestJson } from "./http.js";

const exaResponseSchema = z.object({
  requestId: z.string().optional(),
  results: z.array(
    z.object({
      id: z.string().optional(),
      title: z.string(),
      url: z.url(),
      publishedDate: z.string().optional(),
      author: z.string().optional(),
      score: z.number().optional(),
      highlights: z.array(z.string()).optional(),
    }),
  ),
  costDollars: z.object({ total: z.number().nonnegative() }).optional(),
  searchTime: z.number().nonnegative().optional(),
});

type ExaSearchType = "auto" | "fast" | "instant";

const freshnessHours: Readonly<Record<NonNullable<SearchRequest["freshness"]>, number>> = {
  "24h": 24,
  "7d": 168,
  "30d": 720,
  "1y": 8_760,
};

export interface ExaSearchAdapterOptions {
  readonly apiKey: string;
  readonly clock: Clock;
  readonly fetch: FetchLike;
}

export class ExaSearchAdapter implements ProviderAdapter {
  readonly id = "exa";

  constructor(private readonly options: ExaSearchAdapterOptions) {}

  async search(
    request: SearchRequest,
    context: ProviderExecutionContext,
  ): Promise<ProviderSearchResponse> {
    const hours = request.freshness ? freshnessHours[request.freshness] : undefined;
    const shouldFetchContent = request.fetchContent || request.task === "page_content";
    const body = {
      query: request.query,
      type: searchType(request),
      numResults: request.limit,
      ...(request.country ? { userLocation: request.country } : {}),
      ...(request.includeDomains ? { includeDomains: request.includeDomains } : {}),
      ...(request.excludeDomains ? { excludeDomains: request.excludeDomains } : {}),
      ...(hours === undefined
        ? {}
        : {
            startPublishedDate: new Date(
              this.options.clock.now() - hours * 60 * 60 * 1_000,
            ).toISOString(),
          }),
      ...(shouldFetchContent
        ? {
            contents: {
              highlights: true,
              ...(hours === undefined ? {} : { maxAgeHours: hours }),
            },
          }
        : {}),
    };

    const response = await requestJson({
      provider: this.id,
      url: "https://api.exa.ai/search",
      init: {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "x-api-key": this.options.apiKey,
        },
        body: JSON.stringify(body),
      },
      fetch: this.options.fetch,
      signal: context.signal,
      schema: exaResponseSchema,
    });

    const metadata = {
      ...(response.costDollars === undefined ? {} : { actualCostUsd: response.costDollars.total }),
      ...(response.requestId === undefined ? {} : { requestId: response.requestId }),
      ...(response.searchTime === undefined ? {} : { searchTimeMs: response.searchTime }),
    };
    return {
      results: response.results.map((result) => {
        const highlights = (result.highlights ?? []).filter((value) => value.trim());
        const publishedAt = toIsoDate(result.publishedDate);
        return {
          title: result.title,
          url: result.url,
          ...(highlights.length === 0 ? {} : { snippet: highlights.join("\n\n") }),
          ...(publishedAt === undefined ? {} : { publishedAt }),
          ...(result.author?.trim() ? { author: result.author } : {}),
          ...(result.score === undefined ? {} : { providerScore: result.score }),
          ...(result.id === undefined ? {} : { metadata: { exaId: result.id } }),
        };
      }),
      ...(Object.keys(metadata).length === 0 ? {} : { metadata }),
    };
  }
}

export interface ExaProfileOptions {
  readonly costPerRequestUsd: number | null;
}

export function createExaProfile(options: ExaProfileOptions): ProviderProfile {
  return {
    id: "exa",
    displayName: "Exa Search",
    supportedTasks: ["balanced", "fresh_facts", "deep_research", "page_content"],
    supportedFreshness: ["24h", "7d", "30d", "1y"],
    qualityByTask: {
      balanced: 0.5,
      fresh_facts: 0.5,
      deep_research: 0.5,
      page_content: 0.5,
    },
    baselineReliability: 0.5,
    baselineP95LatencyMs: 1_000,
    estimateCostUsd: () => options.costPerRequestUsd,
  };
}

function searchType(request: SearchRequest): ExaSearchType {
  if (request.priority === "quality" || request.task === "deep_research") return "auto";
  if (request.priority === "latency") return "instant";
  return "fast";
}

function toIsoDate(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return undefined;
  return new Date(timestamp).toISOString();
}
