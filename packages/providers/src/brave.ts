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

const braveResultSchema = z.object({
  title: z.string(),
  url: z.url(),
  description: z.string().optional(),
  page_age: z.string().optional(),
  extra_snippets: z.array(z.string()).optional(),
});

const braveResponseSchema = z.object({
  web: z
    .object({
      results: z.array(braveResultSchema),
    })
    .optional(),
});

const freshnessParameters: Readonly<Record<NonNullable<SearchRequest["freshness"]>, string>> = {
  "24h": "pd",
  "7d": "pw",
  "30d": "pm",
  "1y": "py",
};

export interface BraveSearchAdapterOptions {
  readonly apiKey: string;
  readonly fetch: FetchLike;
}

export class BraveSearchAdapter implements ProviderAdapter {
  readonly id = "brave";

  constructor(private readonly options: BraveSearchAdapterOptions) {}

  async search(
    request: SearchRequest,
    context: ProviderExecutionContext,
  ): Promise<ProviderSearchResponse> {
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", withDomainOperators(request));
    url.searchParams.set("count", String(request.limit));
    if (request.freshness) {
      url.searchParams.set("freshness", freshnessParameters[request.freshness]);
    }
    if (request.country) url.searchParams.set("country", request.country);
    if (request.language) url.searchParams.set("search_lang", request.language);
    if (request.fetchContent) url.searchParams.set("extra_snippets", "true");

    const response = await requestJson({
      provider: this.id,
      url,
      init: {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": this.options.apiKey,
        },
      },
      fetch: this.options.fetch,
      signal: context.signal,
      schema: braveResponseSchema,
    });

    return {
      results: (response.web?.results ?? []).map((result) => {
        const snippetParts = [result.description, ...(result.extra_snippets ?? [])].filter(
          (value): value is string => Boolean(value?.trim()),
        );
        const publishedAt = toIsoDate(result.page_age);
        return {
          title: result.title,
          url: result.url,
          ...(snippetParts.length === 0 ? {} : { snippet: snippetParts.join("\n\n") }),
          ...(publishedAt === undefined ? {} : { publishedAt }),
        };
      }),
    };
  }
}

export interface BraveProfileOptions {
  readonly costPerRequestUsd: number | null;
}

export function createBraveProfile(options: BraveProfileOptions): ProviderProfile {
  return {
    id: "brave",
    displayName: "Brave Search",
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
    estimateCostUsd: () => options.costPerRequestUsd,
  };
}

function withDomainOperators(request: SearchRequest): string {
  if (request.includeDomains) {
    const included = request.includeDomains
      .map((domain) => `site:${withoutWildcard(domain)}`)
      .join(" OR ");
    return `${request.query} (${included})`;
  }
  if (request.excludeDomains) {
    const excluded = request.excludeDomains
      .map((domain) => `-site:${withoutWildcard(domain)}`)
      .join(" ");
    return `${request.query} ${excluded}`;
  }
  return request.query;
}

function withoutWildcard(domain: string): string {
  return domain.startsWith("*.") ? domain.slice(2) : domain;
}

function toIsoDate(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return undefined;
  return new Date(timestamp).toISOString();
}
