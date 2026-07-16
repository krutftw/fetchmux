import type { RetrievalPriority, RouteReasonCode, SearchRequest } from "./contracts.js";
import { FetchMuxError } from "./errors.js";
import type { ProviderProfile } from "./provider.js";

export type ProviderExclusionCode =
  | "PROVIDER_NOT_ALLOWED"
  | "UNSUPPORTED_TASK"
  | "UNSUPPORTED_FRESHNESS"
  | "COST_UNKNOWN"
  | "COST_EXCEEDS_BUDGET"
  | "CIRCUIT_OPEN";

export interface RankableProvider {
  readonly profile: ProviderProfile;
  readonly observedReliability?: number;
  readonly observedP95LatencyMs?: number;
  readonly circuitOpen?: boolean;
}

export interface RankingOptions {
  readonly remainingBudgetUsd?: number;
}

export interface RankingComponents {
  readonly quality: number;
  readonly reliability: number;
  readonly cost: number;
  readonly latency: number;
}

export interface RankedProvider {
  readonly providerId: string;
  readonly profile: ProviderProfile;
  readonly estimatedCostUsd: number | null;
  readonly estimatedLatencyMs: number;
  readonly totalScore: number;
  readonly components: RankingComponents;
  readonly reasonCodes: readonly RouteReasonCode[];
}

type WeightSet = Readonly<RankingComponents>;

export const priorityWeights: Readonly<Record<RetrievalPriority, WeightSet>> = {
  balanced: { quality: 0.35, reliability: 0.3, cost: 0.15, latency: 0.2 },
  quality: { quality: 0.65, reliability: 0.2, cost: 0.05, latency: 0.1 },
  cost: { quality: 0.15, reliability: 0.2, cost: 0.6, latency: 0.05 },
  latency: { quality: 0.15, reliability: 0.2, cost: 0.05, latency: 0.6 },
};

const priorityReason: Readonly<Record<RetrievalPriority, RouteReasonCode>> = {
  balanced: "BALANCED_PRIORITY",
  quality: "QUALITY_PRIORITY",
  cost: "COST_PRIORITY",
  latency: "LATENCY_PRIORITY",
};

interface EligibleProvider {
  readonly profile: ProviderProfile;
  readonly estimatedCostUsd: number | null;
  readonly estimatedLatencyMs: number;
  readonly qualityScore: number;
  readonly reliabilityScore: number;
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function normalizedInverse(value: number, minimum: number, maximum: number): number {
  if (maximum === minimum) return 1;
  return clampScore(1 - (value - minimum) / (maximum - minimum));
}

function normalizeCost(cost: number | null): number | null {
  if (cost === null || !Number.isFinite(cost) || cost < 0) return null;
  return cost;
}

function roundScore(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function rankProviders(
  request: SearchRequest,
  candidates: readonly RankableProvider[],
  options: RankingOptions = {},
): readonly RankedProvider[] {
  const effectiveBudget = options.remainingBudgetUsd ?? request.maxCostUsd;
  const exclusions = new Map<string, ProviderExclusionCode[]>();
  const eligible: EligibleProvider[] = [];

  for (const candidate of candidates) {
    const { profile } = candidate;
    const reasons: ProviderExclusionCode[] = [];
    const estimatedCostUsd = normalizeCost(profile.estimateCostUsd(request));

    if (candidate.circuitOpen) reasons.push("CIRCUIT_OPEN");
    if (request.providerAllowlist && !request.providerAllowlist.includes(profile.id)) {
      reasons.push("PROVIDER_NOT_ALLOWED");
    }
    if (!profile.supportedTasks.includes(request.task)) reasons.push("UNSUPPORTED_TASK");
    if (request.freshness && !profile.supportedFreshness.includes(request.freshness)) {
      reasons.push("UNSUPPORTED_FRESHNESS");
    }
    if (effectiveBudget !== undefined && estimatedCostUsd === null) {
      reasons.push("COST_UNKNOWN");
    } else if (
      effectiveBudget !== undefined &&
      estimatedCostUsd !== null &&
      estimatedCostUsd > effectiveBudget
    ) {
      reasons.push("COST_EXCEEDS_BUDGET");
    }

    if (reasons.length > 0) {
      exclusions.set(profile.id, reasons);
      continue;
    }

    eligible.push({
      profile,
      estimatedCostUsd,
      estimatedLatencyMs: Math.max(
        0,
        candidate.observedP95LatencyMs ?? profile.baselineP95LatencyMs,
      ),
      qualityScore: clampScore(profile.qualityByTask[request.task]),
      reliabilityScore: clampScore(candidate.observedReliability ?? profile.baselineReliability),
    });
  }

  if (eligible.length === 0) {
    const orderedExclusions = Object.fromEntries(
      [...exclusions.entries()].sort(([left], [right]) => left.localeCompare(right)),
    );
    throw new FetchMuxError({
      code: "NO_ELIGIBLE_PROVIDER",
      message: "No configured provider satisfies this retrieval policy",
      statusCode: 422,
      details: { exclusions: orderedExclusions },
    });
  }

  const knownCosts = eligible.flatMap((entry) =>
    entry.estimatedCostUsd === null ? [] : [entry.estimatedCostUsd],
  );
  const latencies = eligible.map((entry) => entry.estimatedLatencyMs);
  const minimumCost = knownCosts.length > 0 ? Math.min(...knownCosts) : 0;
  const maximumCost = knownCosts.length > 0 ? Math.max(...knownCosts) : 0;
  const minimumLatency = Math.min(...latencies);
  const maximumLatency = Math.max(...latencies);
  const weights = priorityWeights[request.priority];

  const ranked = eligible.map<RankedProvider>((entry) => {
    const costScore =
      entry.estimatedCostUsd === null
        ? knownCosts.length === 0
          ? 0.5
          : 0
        : normalizedInverse(entry.estimatedCostUsd, minimumCost, maximumCost);
    const latencyScore = normalizedInverse(
      entry.estimatedLatencyMs,
      minimumLatency,
      maximumLatency,
    );
    const components = {
      quality: entry.qualityScore,
      reliability: entry.reliabilityScore,
      cost: costScore,
      latency: latencyScore,
    };
    const totalScore =
      components.quality * weights.quality +
      components.reliability * weights.reliability +
      components.cost * weights.cost +
      components.latency * weights.latency;
    const reasonCodes: RouteReasonCode[] = [
      "TASK_MATCH",
      priorityReason[request.priority],
      "RELIABILITY_WEIGHT",
    ];
    if (effectiveBudget !== undefined) reasonCodes.push("WITHIN_BUDGET");

    return {
      providerId: entry.profile.id,
      profile: entry.profile,
      estimatedCostUsd: entry.estimatedCostUsd,
      estimatedLatencyMs: entry.estimatedLatencyMs,
      totalScore: roundScore(totalScore),
      components,
      reasonCodes,
    };
  });

  ranked.sort(
    (left, right) =>
      right.totalScore - left.totalScore || left.providerId.localeCompare(right.providerId),
  );

  if (ranked.length === 1) {
    const [only] = ranked;
    if (only) {
      ranked[0] = { ...only, reasonCodes: [...only.reasonCodes, "ONLY_ELIGIBLE_PROVIDER"] };
    }
  }

  return ranked;
}
