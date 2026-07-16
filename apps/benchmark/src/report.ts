import type {
  BenchmarkMeasuredFields,
  BenchmarkRun,
  BenchmarkRunMetadata,
  BenchmarkRunRecord,
} from "./run.js";
import type { BenchmarkClass } from "./schema.js";

const benchmarkClasses: readonly BenchmarkClass[] = [
  "fresh_facts",
  "technical_docs",
  "deep_research",
  "page_content",
];

type MeasuredMetric = Exclude<keyof BenchmarkMeasuredFields, "normalizedUrls">;

export interface MetricMeans {
  readonly latencyMs: number | null;
  readonly estimatedCostUsd: number | null;
  readonly resultCount: number | null;
  readonly domainDiversity: number | null;
}

export interface MetricSampleCounts {
  readonly latencyMs: number;
  readonly estimatedCostUsd: number;
  readonly resultCount: number;
  readonly domainDiversity: number;
}

export interface BenchmarkClassSummary {
  readonly illustrative: boolean;
  readonly workloadClass: BenchmarkClass;
  readonly sampleCount: number;
  readonly successCount: number;
  readonly errorCount: number;
  readonly errorRate: number | null;
  readonly plannedCount: number;
  readonly means: MetricMeans;
  readonly metricSampleCounts: MetricSampleCounts;
}

export interface BenchmarkProviderSummary {
  readonly illustrative: boolean;
  readonly providerId: string;
  readonly sampleCount: number;
  readonly successCount: number;
  readonly errorCount: number;
  readonly errorRate: number | null;
  readonly plannedCount: number;
  readonly weightedMeans: MetricMeans;
  readonly metricSampleCounts: MetricSampleCounts;
  readonly classSummaries: readonly BenchmarkClassSummary[];
}

export interface BenchmarkReport {
  readonly schemaVersion: 1;
  readonly illustrative: boolean;
  readonly banner: string | null;
  readonly comparisonAllowed: boolean;
  readonly statisticalTreatment: "descriptive_only_no_bootstrap";
  readonly metadata: BenchmarkRunMetadata;
  readonly classWeights: Readonly<Record<BenchmarkClass, number>>;
  readonly providers: readonly BenchmarkProviderSummary[];
  readonly records: readonly BenchmarkRunRecord[];
  readonly limitations: readonly string[];
}

export interface CreateBenchmarkReportOptions {
  readonly classWeights?: Partial<Readonly<Record<BenchmarkClass, number>>>;
}

export function createBenchmarkReport(
  run: BenchmarkRun,
  options: CreateBenchmarkReportOptions = {},
): BenchmarkReport {
  const classWeights = normalizeWeights(options.classWeights);
  const providerIds = unique([
    ...run.metadata.providerConfigurations.map(({ providerId }) => providerId),
    ...run.records.map(({ providerId }) => providerId),
  ]);
  const providers = providerIds.map((providerId) =>
    summarizeProvider(providerId, run.records, classWeights, run.illustrative),
  );
  const illustrativeBanner = "ILLUSTRATIVE — NOT LIVE PROVIDER RESULTS OR A PROVIDER COMPARISON";
  const dryRunBanner = "DRY RUN — NO PROVIDER CALLS OR MEASURED RESULTS";

  return {
    schemaVersion: 1,
    illustrative: run.illustrative,
    banner: run.illustrative
      ? illustrativeBanner
      : run.metadata.mode === "dry-run"
        ? dryRunBanner
        : null,
    comparisonAllowed: !run.illustrative && run.metadata.mode === "live",
    statisticalTreatment: "descriptive_only_no_bootstrap",
    metadata: run.metadata,
    classWeights,
    providers,
    records: run.records,
    limitations: unique([
      ...run.limitations,
      "Aggregates are descriptive means with explicit sample counts; no bootstrap intervals or significance claims are produced.",
      ...(run.illustrative
        ? [
            "All values in this report are fabricated layout examples and must not be used to rank providers.",
          ]
        : []),
    ]),
  };
}

function summarizeProvider(
  providerId: string,
  records: readonly BenchmarkRunRecord[],
  classWeights: Readonly<Record<BenchmarkClass, number>>,
  illustrative: boolean,
): BenchmarkProviderSummary {
  const providerRecords = records.filter((record) => record.providerId === providerId);
  const executed = providerRecords.filter(({ status }) => status !== "planned");
  const successes = executed.filter(({ status }) => status === "success");
  const errors = executed.filter(({ status }) => status === "error");
  const classSummaries = benchmarkClasses
    .map((workloadClass) =>
      summarizeClass(
        workloadClass,
        providerRecords.filter((record) => record.workloadClass === workloadClass),
        illustrative,
      ),
    )
    .filter(({ sampleCount, plannedCount }) => sampleCount > 0 || plannedCount > 0);

  return {
    illustrative,
    providerId,
    sampleCount: executed.length,
    successCount: successes.length,
    errorCount: errors.length,
    errorRate: rate(errors.length, executed.length),
    plannedCount: providerRecords.filter(({ status }) => status === "planned").length,
    weightedMeans: metricMeansWeighted(classSummaries, classWeights),
    metricSampleCounts: metricSampleCounts(executed),
    classSummaries,
  };
}

function summarizeClass(
  workloadClass: BenchmarkClass,
  records: readonly BenchmarkRunRecord[],
  illustrative: boolean,
): BenchmarkClassSummary {
  const executed = records.filter(({ status }) => status !== "planned");
  const successes = executed.filter(({ status }) => status === "success");
  const errors = executed.filter(({ status }) => status === "error");
  return {
    illustrative,
    workloadClass,
    sampleCount: executed.length,
    successCount: successes.length,
    errorCount: errors.length,
    errorRate: rate(errors.length, executed.length),
    plannedCount: records.filter(({ status }) => status === "planned").length,
    means: metricMeans(executed),
    metricSampleCounts: metricSampleCounts(executed),
  };
}

function metricMeans(records: readonly BenchmarkRunRecord[]): MetricMeans {
  return {
    latencyMs: mean(metricValues(records, "latencyMs")),
    estimatedCostUsd: mean(metricValues(records, "estimatedCostUsd")),
    resultCount: mean(metricValues(records, "resultCount")),
    domainDiversity: mean(metricValues(records, "domainDiversity")),
  };
}

function metricSampleCounts(records: readonly BenchmarkRunRecord[]): MetricSampleCounts {
  return {
    latencyMs: metricValues(records, "latencyMs").length,
    estimatedCostUsd: metricValues(records, "estimatedCostUsd").length,
    resultCount: metricValues(records, "resultCount").length,
    domainDiversity: metricValues(records, "domainDiversity").length,
  };
}

function metricMeansWeighted(
  summaries: readonly BenchmarkClassSummary[],
  weights: Readonly<Record<BenchmarkClass, number>>,
): MetricMeans {
  return {
    latencyMs: weightedMetric(summaries, weights, "latencyMs"),
    estimatedCostUsd: weightedMetric(summaries, weights, "estimatedCostUsd"),
    resultCount: weightedMetric(summaries, weights, "resultCount"),
    domainDiversity: weightedMetric(summaries, weights, "domainDiversity"),
  };
}

function weightedMetric(
  summaries: readonly BenchmarkClassSummary[],
  weights: Readonly<Record<BenchmarkClass, number>>,
  metric: MeasuredMetric,
): number | null {
  const available = summaries.filter(({ means }) => means[metric] !== null);
  const totalWeight = available.reduce((sum, summary) => sum + weights[summary.workloadClass], 0);
  if (totalWeight === 0) return null;
  const weighted = available.reduce((sum, summary) => {
    const value = summary.means[metric];
    return sum + (value ?? 0) * weights[summary.workloadClass];
  }, 0);
  return round(weighted / totalWeight);
}

function metricValues(records: readonly BenchmarkRunRecord[], metric: MeasuredMetric): number[] {
  return records.flatMap(({ measured }) => {
    const value = measured[metric];
    return value === null ? [] : [value];
  });
}

function normalizeWeights(
  weights: Partial<Readonly<Record<BenchmarkClass, number>>> | undefined,
): Readonly<Record<BenchmarkClass, number>> {
  const normalized = Object.fromEntries(
    benchmarkClasses.map((workloadClass) => {
      const value = weights?.[workloadClass] ?? 1;
      if (!Number.isFinite(value) || value < 0) {
        throw new Error(`Class weight for ${workloadClass} must be a non-negative number`);
      }
      return [workloadClass, value];
    }),
  ) as Record<BenchmarkClass, number>;
  if (Object.values(normalized).every((value) => value === 0)) {
    throw new Error("At least one benchmark class weight must be positive");
  }
  return normalized;
}

function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function rate(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : round(numerator / denominator);
}

function round(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}
