import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { type ConfiguredProvider, ProviderError, searchRequestSchema } from "@fetchmux/core";
import {
  type BenchmarkClass,
  type BenchmarkFetchPolicy,
  type BenchmarkWorkload,
  type BenchmarkWorkloadInput,
  benchmarkWorkloadSchema,
  type HumanLabel,
} from "./schema.js";

export interface BenchmarkProvider {
  readonly id: string;
  readonly configured?: ConfiguredProvider;
  readonly configurationHash: string;
  readonly costProfileSource: string | null;
}

export type BenchmarkExecutionMode = "live" | "dry-run";
export type BenchmarkRunMode = BenchmarkExecutionMode | "illustrative";
export type BenchmarkReportMode = "public" | "private";
export type BenchmarkRecordStatus = "planned" | "success" | "error";

export interface BenchmarkMeasuredFields {
  readonly latencyMs: number | null;
  readonly estimatedCostUsd: number | null;
  readonly resultCount: number | null;
  readonly domainDiversity: number | null;
  readonly normalizedUrls: readonly string[];
}

export interface BenchmarkRunRecord {
  readonly caseId: string;
  readonly queryText: string | null;
  readonly privateQueryRef: string | null;
  readonly providerId: string;
  readonly workloadClass: BenchmarkClass;
  readonly repetition: number;
  readonly executionOrder: number;
  readonly status: BenchmarkRecordStatus;
  readonly errorCode: string | null;
  readonly measured: BenchmarkMeasuredFields;
  readonly humanLabel: HumanLabel | null;
}

export interface ProviderConfigurationRecord {
  readonly providerId: string;
  readonly configurationHash: string;
  readonly costProfileSource: string | null;
}

export interface BenchmarkRunMetadata {
  readonly workloadId: string;
  readonly workloadHash: string;
  readonly generatedAt: string;
  readonly codeVersion: string;
  readonly seed: number;
  readonly mode: BenchmarkRunMode;
  readonly reportMode: BenchmarkReportMode;
  readonly repetitions: number;
  readonly plannedCalls: number;
  readonly executedCalls: number;
  readonly providerConfigurations: readonly ProviderConfigurationRecord[];
}

export interface BenchmarkRun {
  readonly schemaVersion: 1;
  readonly illustrative: boolean;
  readonly metadata: BenchmarkRunMetadata;
  readonly records: readonly BenchmarkRunRecord[];
  readonly limitations: readonly string[];
}

export interface RunBenchmarkOptions {
  readonly workload: BenchmarkWorkload | BenchmarkWorkloadInput;
  readonly providers: readonly BenchmarkProvider[];
  readonly mode: BenchmarkExecutionMode;
  readonly reportMode?: BenchmarkReportMode;
  readonly seed?: number;
  readonly codeVersion: string;
  readonly generatedAt?: string;
  readonly monotonicNow?: () => number;
  readonly resolvePrivateQuery?: (reference: string) => string | Promise<string>;
}

interface PlannedCall {
  readonly testCase: BenchmarkWorkload["cases"][number];
  readonly policy: BenchmarkFetchPolicy;
  readonly provider: BenchmarkProvider;
  readonly repetition: number;
  readonly executionOrder: number;
}

class InvalidProviderResultError extends Error {}

export async function runBenchmark(options: RunBenchmarkOptions): Promise<BenchmarkRun> {
  const workload = benchmarkWorkloadSchema.parse(options.workload);
  const reportMode = options.reportMode ?? "private";
  const seed = options.seed ?? workload.seed;
  const providerById = validateProviders(workload, options.providers);
  const plan = createPlan(workload, providerById, seed);
  const records: BenchmarkRunRecord[] = [];
  const monotonicNow = options.monotonicNow ?? (() => performance.now());

  for (const call of plan) {
    if (options.mode === "dry-run") {
      records.push(plannedRecord(call, reportMode));
      continue;
    }
    records.push(
      await executeCall(call, {
        reportMode,
        monotonicNow,
        ...(options.resolvePrivateQuery === undefined
          ? {}
          : { resolvePrivateQuery: options.resolvePrivateQuery }),
      }),
    );
  }

  const metadata: BenchmarkRunMetadata = {
    workloadId: workload.id,
    workloadHash: hashWorkloadConfiguration(workload),
    generatedAt: normalizeGeneratedAt(options.generatedAt),
    codeVersion: options.codeVersion,
    seed,
    mode: options.mode,
    reportMode,
    repetitions: workload.repetitions,
    plannedCalls: plan.length,
    executedCalls: records.filter(({ status }) => status !== "planned").length,
    providerConfigurations: workload.providers.map((providerId) => {
      const provider = providerById.get(providerId);
      if (!provider) throw new Error(`Benchmark provider ${providerId} disappeared`);
      return {
        providerId,
        configurationHash: provider.configurationHash,
        costProfileSource: provider.costProfileSource,
      };
    }),
  };

  return {
    schemaVersion: 1,
    illustrative: false,
    metadata,
    records,
    limitations: [
      "Results describe only the recorded workload, provider configuration, region, and run time.",
      "No relevance or answer-accuracy value is inferred from provider output; those fields require human labels.",
      "Latency is sequential wall-clock duration and is not a provider service-level guarantee.",
    ],
  };
}

function validateProviders(
  workload: BenchmarkWorkload,
  providers: readonly BenchmarkProvider[],
): ReadonlyMap<string, BenchmarkProvider> {
  const providerById = new Map<string, BenchmarkProvider>();
  for (const provider of providers) {
    if (providerById.has(provider.id))
      throw new Error(`Duplicate benchmark provider ${provider.id}`);
    if (provider.configured && provider.configured.adapter.id !== provider.id) {
      throw new Error(`Benchmark provider ${provider.id} does not match its adapter`);
    }
    if (provider.configured && provider.configured.profile.id !== provider.id) {
      throw new Error(`Benchmark provider ${provider.id} does not match its profile`);
    }
    providerById.set(provider.id, provider);
  }
  for (const providerId of workload.providers) {
    if (!providerById.has(providerId)) {
      throw new Error(`Workload requires missing benchmark provider ${providerId}`);
    }
  }
  return providerById;
}

function createPlan(
  workload: BenchmarkWorkload,
  providers: ReadonlyMap<string, BenchmarkProvider>,
  seed: number,
): readonly PlannedCall[] {
  const random = mulberry32(seed);
  const plan: PlannedCall[] = [];
  let executionOrder = 0;
  for (const testCase of workload.cases) {
    for (let repetition = 1; repetition <= workload.repetitions; repetition += 1) {
      const randomizedIds = shuffle(workload.providers, random);
      for (const providerId of randomizedIds) {
        const provider = providers.get(providerId);
        if (!provider)
          throw new Error(`Workload requires missing benchmark provider ${providerId}`);
        executionOrder += 1;
        plan.push({
          testCase,
          policy: workload.fetchPolicies[testCase.workloadClass],
          provider,
          repetition,
          executionOrder,
        });
      }
    }
  }
  return plan;
}

function plannedRecord(call: PlannedCall, reportMode: BenchmarkReportMode): BenchmarkRunRecord {
  return {
    ...recordIdentity(call, reportMode),
    status: "planned",
    errorCode: null,
    measured: emptyMeasuredFields(),
  };
}

async function executeCall(
  call: PlannedCall,
  options: {
    readonly reportMode: BenchmarkReportMode;
    readonly monotonicNow: () => number;
    readonly resolvePrivateQuery?: (reference: string) => string | Promise<string>;
  },
): Promise<BenchmarkRunRecord> {
  const configured = call.provider.configured;
  if (!configured) {
    return {
      ...recordIdentity(call, options.reportMode),
      status: "error",
      errorCode: "PROVIDER_NOT_CONFIGURED",
      measured: emptyMeasuredFields(),
    };
  }

  const query = await resolveQuery(call.testCase, options.resolvePrivateQuery);
  const request = searchRequestSchema.parse({
    query,
    task: call.testCase.task,
    ...(call.testCase.freshness === undefined ? {} : { freshness: call.testCase.freshness }),
    ...call.policy,
  });
  const estimatedCostUsd = configured.profile.estimateCostUsd(request);
  const startedAt = options.monotonicNow();
  const signal = AbortSignal.timeout(request.maxLatencyMs);

  try {
    const response = await configured.adapter.search(request, {
      signal,
      traceId: `bench_${call.executionOrder}_${call.repetition}`,
    });
    const normalizedUrls = response.results.map(({ url }) => normalizeUrl(url));
    const latencyMs = roundMetric(options.monotonicNow() - startedAt);
    return {
      ...recordIdentity(call, options.reportMode),
      status: "success",
      errorCode: null,
      measured: {
        latencyMs,
        estimatedCostUsd,
        resultCount: response.results.length,
        domainDiversity: domainDiversity(normalizedUrls),
        normalizedUrls,
      },
    };
  } catch (error) {
    return {
      ...recordIdentity(call, options.reportMode),
      status: "error",
      errorCode: classifyError(error, signal),
      measured: {
        ...emptyMeasuredFields(),
        latencyMs: roundMetric(options.monotonicNow() - startedAt),
        estimatedCostUsd,
      },
    };
  }
}

function recordIdentity(
  call: PlannedCall,
  reportMode: BenchmarkReportMode,
): Pick<
  BenchmarkRunRecord,
  | "caseId"
  | "queryText"
  | "privateQueryRef"
  | "providerId"
  | "workloadClass"
  | "repetition"
  | "executionOrder"
  | "humanLabel"
> {
  return {
    caseId: call.testCase.id,
    queryText:
      reportMode === "public" && call.testCase.query !== undefined ? call.testCase.query : null,
    privateQueryRef: call.testCase.privateQueryRef ?? null,
    providerId: call.provider.id,
    workloadClass: call.testCase.workloadClass,
    repetition: call.repetition,
    executionOrder: call.executionOrder,
    humanLabel: call.testCase.humanLabels[call.provider.id] ?? null,
  };
}

async function resolveQuery(
  testCase: BenchmarkWorkload["cases"][number],
  resolver: ((reference: string) => string | Promise<string>) | undefined,
): Promise<string> {
  if (testCase.query !== undefined) return testCase.query;
  if (!testCase.privateQueryRef || !resolver) {
    throw new Error(`Case ${testCase.id} requires a private-query resolver`);
  }
  const query = (await resolver(testCase.privateQueryRef)).trim();
  if (!query) throw new Error(`Private query reference ${testCase.privateQueryRef} resolved empty`);
  return query;
}

function emptyMeasuredFields(): BenchmarkMeasuredFields {
  return {
    latencyMs: null,
    estimatedCostUsd: null,
    resultCount: null,
    domainDiversity: null,
    normalizedUrls: [],
  };
}

export function normalizeUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new InvalidProviderResultError("Provider returned an invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new InvalidProviderResultError("Provider returned a non-HTTP URL");
  }
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    const normalizedKey = key.toLowerCase();
    if (
      normalizedKey.startsWith("utm_") ||
      normalizedKey === "fbclid" ||
      normalizedKey === "gclid" ||
      normalizedKey === "msclkid"
    ) {
      url.searchParams.delete(key);
    }
  }
  url.searchParams.sort();
  return url.toString().replace(/\?$/, "");
}

function domainDiversity(urls: readonly string[]): number {
  if (urls.length === 0) return 0;
  const domains = new Set(urls.map((url) => new URL(url).hostname.toLowerCase()));
  return domains.size / urls.length;
}

function classifyError(error: unknown, signal: AbortSignal): string {
  if (error instanceof InvalidProviderResultError) return "INVALID_RESPONSE";
  if (error instanceof ProviderError) return error.code;
  if (signal.aborted || (error instanceof DOMException && error.name === "AbortError")) {
    return "TIMEOUT";
  }
  return "UNCLASSIFIED_ERROR";
}

function normalizeGeneratedAt(value: string | undefined): string {
  const date = value === undefined ? new Date() : new Date(value);
  if (!Number.isFinite(date.valueOf())) throw new Error("generatedAt must be a valid date-time");
  return date.toISOString();
}

function hashWorkloadConfiguration(workload: BenchmarkWorkload): string {
  const safeConfiguration = {
    schemaVersion: workload.schemaVersion,
    id: workload.id,
    providers: workload.providers,
    repetitions: workload.repetitions,
    seed: workload.seed,
    fetchPolicies: workload.fetchPolicies,
    cases: workload.cases.map((testCase) => ({
      id: testCase.id,
      hasInlineQuery: testCase.query !== undefined,
      privateQueryRef: testCase.privateQueryRef ?? null,
      workloadClass: testCase.workloadClass,
      task: testCase.task,
      freshness: testCase.freshness ?? null,
      expectedSourceHints: testCase.expectedSourceHints,
    })),
  };
  return `sha256:${createHash("sha256").update(stableStringify(safeConfiguration)).digest("hex")}`;
}

export function hashPublicConfiguration(configuration: unknown): string {
  return `sha256:${createHash("sha256").update(stableStringify(configuration)).digest("hex")}`;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right),
    );
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = copy[index];
    const replacement = copy[swapIndex];
    if (current === undefined || replacement === undefined) continue;
    copy[index] = replacement;
    copy[swapIndex] = current;
  }
  return copy;
}

function roundMetric(value: number): number {
  return Math.round(Math.max(0, value) * 1_000) / 1_000;
}
