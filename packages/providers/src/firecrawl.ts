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

const firecrawlResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    web: z.array(
      z.object({
        title: z.string(),
        url: z.url(),
        description: z.string().optional(),
        markdown: z.string().optional(),
      }),
    ),
  }),
  id: z.string().optional(),
  creditsUsed: z.number().nonnegative().optional(),
});

const freshnessParameters: Readonly<Record<NonNullable<SearchRequest["freshness"]>, string>> = {
  "24h": "qdr:d",
  "7d": "qdr:w",
  "30d": "qdr:m",
  "1y": "qdr:y",
};

export interface FirecrawlSearchAdapterOptions {
  readonly apiKey: string;
  readonly fetch: FetchLike;
}

export class FirecrawlSearchAdapter implements ProviderAdapter {
  readonly id = "firecrawl";

  constructor(private readonly options: FirecrawlSearchAdapterOptions) {}

  async search(
    request: SearchRequest,
    context: ProviderExecutionContext,
  ): Promise<ProviderSearchResponse> {
    const shouldFetchContent = request.fetchContent || request.task === "page_content";
    const body = {
      query: request.query,
      limit: request.limit,
      sources: ["web"],
      ...(request.includeDomains ? { includeDomains: request.includeDomains } : {}),
      ...(request.excludeDomains ? { excludeDomains: request.excludeDomains } : {}),
      ...(request.freshness ? { tbs: freshnessParameters[request.freshness] } : {}),
      ...(request.country ? { country: request.country } : {}),
      timeout: request.maxLatencyMs,
      ignoreInvalidURLs: true,
      ...(shouldFetchContent ? { scrapeOptions: { formats: [{ type: "markdown" }] } } : {}),
    };

    const response = await requestJson({
      provider: this.id,
      url: "https://api.firecrawl.dev/v2/search",
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
      schema: firecrawlResponseSchema,
    });

    const metadata = {
      ...(response.creditsUsed === undefined ? {} : { creditsUsed: response.creditsUsed }),
      ...(response.id === undefined ? {} : { jobId: response.id }),
    };
    return {
      results: response.data.web.map((result) => {
        const snippet =
          shouldFetchContent && result.markdown?.trim()
            ? result.markdown
            : result.description?.trim()
              ? result.description
              : undefined;
        return {
          title: result.title,
          url: result.url,
          ...(snippet === undefined ? {} : { snippet }),
        };
      }),
      ...(Object.keys(metadata).length === 0 ? {} : { metadata }),
    };
  }
}

export interface FirecrawlProfileOptions {
  readonly costPerRequestUsd: number | null;
}

export function createFirecrawlProfile(options: FirecrawlProfileOptions): ProviderProfile {
  return {
    id: "firecrawl",
    displayName: "Firecrawl Search",
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
