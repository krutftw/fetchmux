import {
  type Clock,
  type FetchLike,
  type ProviderAdapter,
  ProviderError,
  type ProviderExecutionContext,
  type ProviderProfile,
  type ProviderSearchResponse,
  type SearchRequest,
} from "@fetchmux/core";
import { z } from "zod";
import { requestJson } from "./http.js";

const datePartsSchema = z.array(z.array(z.number().int()).min(1).max(3)).min(1);
const crossrefAuthorSchema = z.object({
  given: z.string().optional(),
  family: z.string().optional(),
  name: z.string().optional(),
});
const crossrefWorkSchema = z.object({
  DOI: z.string().trim().min(1),
  title: z.array(z.string().trim().min(1)).min(1),
  URL: z.url(),
  author: z.array(crossrefAuthorSchema).optional(),
  published: z.object({ "date-parts": datePartsSchema }).optional(),
  "container-title": z.array(z.string()).optional(),
  publisher: z.string().optional(),
  type: z.string().optional(),
  score: z.number().finite().optional(),
});
const crossrefResponseSchema = z.object({
  status: z.literal("ok"),
  message: z.object({
    "total-results": z.number().int().nonnegative(),
    items: z.array(crossrefWorkSchema),
  }),
});

const selectedFields = [
  "DOI",
  "title",
  "URL",
  "author",
  "published",
  "container-title",
  "publisher",
  "type",
  "score",
].join(",");
const maxConcurrentRequests = 3;
const maxRequestsPerSecond = 10;
const rateWindowMs = 1_000;

export interface CrossrefSearchAdapterOptions {
  readonly contactEmail: string;
  readonly fetch: FetchLike;
  readonly clock: Clock;
}

export class CrossrefSearchAdapter implements ProviderAdapter {
  readonly id = "crossref";
  private activeRequests = 0;
  private readonly recentStarts: number[] = [];

  constructor(private readonly options: CrossrefSearchAdapterOptions) {}

  async search(
    request: SearchRequest,
    context: ProviderExecutionContext,
  ): Promise<ProviderSearchResponse> {
    const startedAt = this.options.clock.now();
    while (this.recentStarts[0] !== undefined && startedAt - this.recentStarts[0] >= rateWindowMs) {
      this.recentStarts.shift();
    }
    if (
      this.activeRequests >= maxConcurrentRequests ||
      this.recentStarts.length >= maxRequestsPerSecond
    ) {
      throw new ProviderError({
        provider: this.id,
        code: "RATE_LIMITED",
        message: "crossref local polite-pool limit reached",
        retryable: true,
      });
    }
    this.activeRequests += 1;
    this.recentStarts.push(startedAt);

    try {
      return await this.execute(request, context);
    } finally {
      this.activeRequests -= 1;
    }
  }

  private async execute(
    request: SearchRequest,
    context: ProviderExecutionContext,
  ): Promise<ProviderSearchResponse> {
    const url = new URL("https://api.crossref.org/v1/works");
    url.searchParams.set("query.bibliographic", request.query);
    url.searchParams.set("rows", String(request.limit));
    url.searchParams.set("select", selectedFields);
    url.searchParams.set("mailto", this.options.contactEmail);
    if (request.freshness) {
      url.searchParams.set(
        "filter",
        `from-pub-date:${freshnessStartDate(this.options.clock.now(), request.freshness)}`,
      );
    }

    const response = await requestJson({
      provider: this.id,
      url,
      init: {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": `FetchMuxBot/0.1 (https://fetchmux.com; mailto:${this.options.contactEmail})`,
        },
      },
      fetch: this.options.fetch,
      signal: context.signal,
      schema: crossrefResponseSchema,
    });

    return {
      results: response.message.items.map((work) => {
        const containerTitle = firstNonBlank(work["container-title"]);
        const publisher = nonBlank(work.publisher);
        const type = nonBlank(work.type);
        const metadata = {
          doi: work.DOI,
          ...(type === undefined ? {} : { type }),
          ...(publisher === undefined ? {} : { publisher }),
          ...(containerTitle === undefined ? {} : { containerTitle }),
        };
        const publishedAt = toPublishedAt(work.published?.["date-parts"]);
        const author = toAuthors(work.author);
        return {
          title: (work.title[0] ?? work.DOI).slice(0, 2_000),
          url: work.URL,
          snippet: toSnippet(work.DOI, containerTitle, publisher),
          ...(publishedAt === undefined ? {} : { publishedAt }),
          ...(author === undefined ? {} : { author }),
          ...(work.score === undefined ? {} : { providerScore: work.score }),
          metadata,
        };
      }),
      metadata: { totalResults: response.message["total-results"] },
    };
  }
}

export function createCrossrefProfile(): ProviderProfile {
  return {
    id: "crossref",
    displayName: "Crossref Metadata",
    supportedTasks: ["scholarly"],
    supportedFreshness: ["24h", "7d", "30d", "1y"],
    qualityByTask: {
      balanced: 0,
      fresh_facts: 0,
      deep_research: 0,
      page_content: 0,
      scholarly: 0.5,
    },
    supportsRequest: (request) =>
      !request.fetchContent &&
      request.country === undefined &&
      request.language === undefined &&
      request.includeDomains === undefined &&
      request.excludeDomains === undefined,
    baselineReliability: 0.5,
    baselineP95LatencyMs: 1_500,
    estimateCostUsd: () => 0,
  };
}

function freshnessStartDate(timestamp: number, freshness: NonNullable<SearchRequest["freshness"]>) {
  const date = new Date(timestamp);
  date.setUTCHours(0, 0, 0, 0);
  if (freshness === "24h") date.setUTCDate(date.getUTCDate() - 1);
  if (freshness === "7d") date.setUTCDate(date.getUTCDate() - 7);
  if (freshness === "30d") date.setUTCDate(date.getUTCDate() - 30);
  if (freshness === "1y") date.setUTCFullYear(date.getUTCFullYear() - 1);
  return date.toISOString().slice(0, 10);
}

function firstNonBlank(values: readonly string[] | undefined): string | undefined {
  return values?.map(nonBlank).find((value): value is string => value !== undefined);
}

function nonBlank(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function toSnippet(doi: string, containerTitle: string | undefined, publisher: string | undefined) {
  return [
    containerTitle === undefined ? undefined : `Published in ${containerTitle}.`,
    publisher === undefined ? undefined : `Publisher: ${publisher}.`,
    `DOI: ${doi}.`,
  ]
    .filter((value): value is string => value !== undefined)
    .join(" ");
}

function toAuthors(authors: readonly z.infer<typeof crossrefAuthorSchema>[] | undefined) {
  const names = (authors ?? []).flatMap((author) => {
    const person = [nonBlank(author.given), nonBlank(author.family)].filter(
      (value): value is string => value !== undefined,
    );
    const name = person.length > 0 ? person.join(" ") : nonBlank(author.name);
    return name === undefined ? [] : [name];
  });
  if (names.length === 0) return undefined;
  const displayed = names.slice(0, 5).join("; ");
  return `${displayed}${names.length > 5 ? "; et al." : ""}`.slice(0, 500);
}

function toPublishedAt(dateParts: readonly (readonly number[])[] | undefined): string | undefined {
  const [parts] = dateParts ?? [];
  if (!parts) return undefined;
  const [year, month = 1, day = 1] = parts;
  if (year === undefined) return undefined;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }
  return date.toISOString();
}
