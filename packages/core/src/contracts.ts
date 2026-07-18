import { z } from "zod";

const hostnamePattern =
  /^(?:\*\.)?(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;

const hostnameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(hostnamePattern, "Expected a hostname without a scheme or path");

const httpUrlSchema = z.url().refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === "http:" || protocol === "https:";
}, "Expected an HTTP or HTTPS URL");

export const retrievalPrioritySchema = z.enum(["balanced", "quality", "cost", "latency"]);
export type RetrievalPriority = z.infer<typeof retrievalPrioritySchema>;

export const retrievalTaskSchema = z.enum([
  "balanced",
  "fresh_facts",
  "deep_research",
  "page_content",
  "scholarly",
]);
export type RetrievalTask = z.infer<typeof retrievalTaskSchema>;

export const freshnessSchema = z.enum(["24h", "7d", "30d", "1y"]);
export type Freshness = z.infer<typeof freshnessSchema>;

export const searchRequestSchema = z
  .object({
    query: z.string().trim().min(1).max(400),
    priority: retrievalPrioritySchema.default("balanced"),
    task: retrievalTaskSchema.default("balanced"),
    freshness: freshnessSchema.optional(),
    maxCostUsd: z.number().finite().positive().max(1_000).optional(),
    maxLatencyMs: z.number().int().min(250).max(120_000).default(10_000),
    limit: z.number().int().min(1).max(20).default(8),
    country: z
      .string()
      .trim()
      .regex(/^[a-zA-Z]{2}$/)
      .transform((value) => value.toUpperCase())
      .optional(),
    language: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/)
      .optional(),
    includeDomains: z.array(hostnameSchema).min(1).max(50).optional(),
    excludeDomains: z.array(hostnameSchema).min(1).max(50).optional(),
    providerAllowlist: z.array(z.string().trim().min(1).max(64)).min(1).max(10).optional(),
    fetchContent: z.boolean().default(false),
  })
  .refine((value) => !(value.includeDomains?.length && value.excludeDomains?.length), {
    message: "includeDomains and excludeDomains cannot be used together",
    path: ["includeDomains"],
  });
export type SearchRequest = z.infer<typeof searchRequestSchema>;
export type SearchRequestInput = z.input<typeof searchRequestSchema>;

export const normalizedSearchResultSchema = z.object({
  title: z.string().trim().min(1).max(2_000),
  url: httpUrlSchema,
  snippet: z.string().trim().min(1).max(20_000).optional(),
  publishedAt: z.iso.datetime({ offset: true }).optional(),
  author: z.string().trim().min(1).max(500).optional(),
  provider: z.string().trim().min(1).max(64),
  rank: z.number().int().positive(),
  providerScore: z.number().finite().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type NormalizedSearchResult = z.infer<typeof normalizedSearchResultSchema>;

export const routeReasonCodeSchema = z.enum([
  "TASK_MATCH",
  "QUALITY_PRIORITY",
  "COST_PRIORITY",
  "LATENCY_PRIORITY",
  "BALANCED_PRIORITY",
  "RELIABILITY_WEIGHT",
  "WITHIN_BUDGET",
  "ONLY_ELIGIBLE_PROVIDER",
  "FALLBACK_AFTER_RETRYABLE_ERROR",
]);
export type RouteReasonCode = z.infer<typeof routeReasonCodeSchema>;

export const routeAttemptSchema = z.object({
  provider: z.string().trim().min(1).max(64),
  startedAt: z.iso.datetime({ offset: true }),
  endedAt: z.iso.datetime({ offset: true }),
  latencyMs: z.number().finite().nonnegative(),
  estimatedCostUsd: z.number().finite().nonnegative().nullable(),
  outcome: z.enum(["success", "retryable_error", "terminal_error"]),
  errorCode: z.string().trim().min(1).max(64).optional(),
});
export type RouteAttempt = z.infer<typeof routeAttemptSchema>;

export const routeReceiptSchema = z.object({
  selectedProvider: z.string().trim().min(1).max(64),
  attemptedProviders: z.array(z.string().trim().min(1).max(64)).min(1),
  attempts: z.array(routeAttemptSchema).min(1),
  reasonCodes: z.array(routeReasonCodeSchema).min(1),
  estimatedCostUsd: z.number().finite().nonnegative().nullable(),
  latencyMs: z.number().finite().nonnegative(),
  fallbackUsed: z.boolean(),
  traceId: z.string().trim().min(1).max(128),
});
export type RouteReceipt = z.infer<typeof routeReceiptSchema>;

export const searchResponseSchema = z.object({
  results: z.array(normalizedSearchResultSchema),
  route: routeReceiptSchema,
});
export type SearchResponse = z.infer<typeof searchResponseSchema>;
