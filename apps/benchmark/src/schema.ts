import { z } from "zod";

export const benchmarkClassSchema = z.enum([
  "fresh_facts",
  "technical_docs",
  "deep_research",
  "page_content",
]);
export type BenchmarkClass = z.infer<typeof benchmarkClassSchema>;

const identifierSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9][a-z0-9._-]*$/, "Use lowercase letters, numbers, dots, dashes, or underscores");

const hostnameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^(?:\*\.)?(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/,
    "Expected a hostname without a scheme or path",
  );

export const benchmarkFetchPolicySchema = z
  .object({
    priority: z.enum(["balanced", "quality", "cost", "latency"]).default("balanced"),
    maxLatencyMs: z.number().int().min(250).max(120_000).default(10_000),
    limit: z.number().int().min(1).max(20).default(8),
    fetchContent: z.boolean().default(false),
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
  })
  .strict();
export type BenchmarkFetchPolicy = z.infer<typeof benchmarkFetchPolicySchema>;

export const humanLabelSchema = z
  .object({
    relevance: z.number().int().min(0).max(4).nullable().default(null),
    answerAccuracy: z.number().min(0).max(1).nullable().default(null),
    notes: z.string().trim().min(1).max(2_000).optional(),
  })
  .strict();
export type HumanLabel = z.infer<typeof humanLabelSchema>;

export const benchmarkCaseSchema = z
  .object({
    id: identifierSchema,
    query: z.string().trim().min(1).max(400).optional(),
    privateQueryRef: identifierSchema.optional(),
    workloadClass: benchmarkClassSchema,
    task: z.enum(["balanced", "fresh_facts", "deep_research", "page_content", "scholarly"]),
    freshness: z.enum(["24h", "7d", "30d", "1y"]).optional(),
    expectedSourceHints: z.array(hostnameSchema).max(20).default([]),
    humanLabels: z.record(identifierSchema, humanLabelSchema).default({}),
  })
  .strict()
  .refine(
    (value) =>
      Number(value.query !== undefined) + Number(value.privateQueryRef !== undefined) === 1,
    {
      message: "Exactly one of query or privateQueryRef is required",
      path: ["query"],
    },
  );
export type BenchmarkCase = z.infer<typeof benchmarkCaseSchema>;

export const benchmarkWorkloadSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: identifierSchema,
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(2_000),
    providers: z.array(identifierSchema).min(1).max(20),
    repetitions: z.number().int().min(1).max(20).default(1),
    seed: z.number().int().min(0).max(0xffff_ffff),
    fetchPolicies: z
      .object({
        fresh_facts: benchmarkFetchPolicySchema,
        technical_docs: benchmarkFetchPolicySchema,
        deep_research: benchmarkFetchPolicySchema,
        page_content: benchmarkFetchPolicySchema,
      })
      .strict(),
    cases: z.array(benchmarkCaseSchema).min(1).max(1_000),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.providers).size !== value.providers.length) {
      context.addIssue({
        code: "custom",
        message: "Provider IDs must be unique",
        path: ["providers"],
      });
    }
    const caseIds = value.cases.map(({ id }) => id);
    if (new Set(caseIds).size !== caseIds.length) {
      context.addIssue({
        code: "custom",
        message: "Case IDs must be unique",
        path: ["cases"],
      });
    }
    const providerIds = new Set(value.providers);
    value.cases.forEach((testCase, caseIndex) => {
      for (const providerId of Object.keys(testCase.humanLabels)) {
        if (!providerIds.has(providerId)) {
          context.addIssue({
            code: "custom",
            message: `Human label references unknown provider ${providerId}`,
            path: ["cases", caseIndex, "humanLabels", providerId],
          });
        }
      }
    });
  });

export type BenchmarkWorkload = z.infer<typeof benchmarkWorkloadSchema>;
export type BenchmarkWorkloadInput = z.input<typeof benchmarkWorkloadSchema>;
