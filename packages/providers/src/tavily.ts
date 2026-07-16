import type {
  FetchLike,
  ProviderAdapter,
  ProviderExecutionContext,
  ProviderProfile,
  ProviderSearchResponse,
  SearchRequest,
} from "@fetchmux/core";
import { z } from "zod";
import { requestJson } from "./http.js";

const tavilyResponseSchema = z.object({
  query: z.string().optional(),
  results: z.array(
    z.object({
      title: z.string(),
      url: z.url(),
      content: z.string(),
      score: z.number(),
      raw_content: z.string().nullable().optional(),
      published_date: z.string().optional(),
    }),
  ),
  response_time: z.union([z.string(), z.number()]).optional(),
  request_id: z.string().optional(),
  usage: z.object({ credits: z.number().nonnegative() }).optional(),
});

type TavilyDepth = "advanced" | "basic" | "ultra-fast";

const freshnessParameters: Readonly<Record<NonNullable<SearchRequest["freshness"]>, string>> = {
  "24h": "day",
  "7d": "week",
  "30d": "month",
  "1y": "year",
};

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });

export interface TavilySearchAdapterOptions {
  readonly apiKey: string;
  readonly fetch: FetchLike;
}

export class TavilySearchAdapter implements ProviderAdapter {
  readonly id = "tavily";

  constructor(private readonly options: TavilySearchAdapterOptions) {}

  async search(
    request: SearchRequest,
    context: ProviderExecutionContext,
  ): Promise<ProviderSearchResponse> {
    const country = request.country ? countryNames.of(request.country)?.toLowerCase() : undefined;
    const body = {
      query: request.query,
      search_depth: searchDepth(request),
      max_results: request.limit,
      include_answer: false,
      include_raw_content: false,
      ...(request.freshness ? { time_range: freshnessParameters[request.freshness] } : {}),
      ...(country === undefined ? {} : { country }),
      ...(request.includeDomains ? { include_domains: request.includeDomains } : {}),
      ...(request.excludeDomains ? { exclude_domains: request.excludeDomains } : {}),
    };

    const response = await requestJson({
      provider: this.id,
      url: "https://api.tavily.com/search",
      init: {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
      fetch: this.options.fetch,
      signal: context.signal,
      schema: tavilyResponseSchema,
    });

    const metadata = {
      ...(response.usage === undefined ? {} : { creditsUsed: response.usage.credits }),
      ...(response.request_id === undefined ? {} : { requestId: response.request_id }),
      ...toResponseTimeMetadata(response.response_time),
    };
    return {
      results: response.results.map((result) => {
        const publishedAt = toIsoDate(result.published_date);
        return {
          title: result.title,
          url: result.url,
          ...(result.content.trim() ? { snippet: result.content } : {}),
          ...(publishedAt === undefined ? {} : { publishedAt }),
          providerScore: result.score,
        };
      }),
      ...(Object.keys(metadata).length === 0 ? {} : { metadata }),
    };
  }
}

export interface TavilyProfileOptions {
  readonly costPerCreditUsd: number | null;
}

export function createTavilyProfile(options: TavilyProfileOptions): ProviderProfile {
  return {
    id: "tavily",
    displayName: "Tavily Search",
    supportedTasks: ["balanced", "fresh_facts", "deep_research"],
    supportedFreshness: ["24h", "7d", "30d", "1y"],
    qualityByTask: {
      balanced: 0.5,
      fresh_facts: 0.5,
      deep_research: 0.5,
      page_content: 0,
    },
    baselineReliability: 0.5,
    baselineP95LatencyMs: 1_000,
    estimateCostUsd: (request) => {
      if (options.costPerCreditUsd === null) return null;
      const credits = searchDepth(request) === "advanced" ? 2 : 1;
      return options.costPerCreditUsd * credits;
    },
  };
}

function searchDepth(request: SearchRequest): TavilyDepth {
  if (request.priority === "quality" || request.task === "deep_research") {
    return "advanced";
  }
  if (request.priority === "latency") return "ultra-fast";
  return "basic";
}

function toIsoDate(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return undefined;
  return new Date(timestamp).toISOString();
}

function toResponseTimeMetadata(value: string | number | undefined): {
  responseTimeSeconds?: number;
} {
  if (value === undefined) return {};
  const number = Number(value);
  return Number.isFinite(number) ? { responseTimeSeconds: number } : {};
}
