import type {
  Clock,
  ConfiguredProvider,
  FetchLike,
  ProviderAdapter,
  ProviderProfile,
  RetrievalTask,
} from "@fetchmux/core";
import { z } from "zod";
import { BraveSearchAdapter, createBraveProfile } from "./brave.js";
import { CrossrefSearchAdapter, createCrossrefProfile } from "./crossref.js";
import { createExaProfile, ExaSearchAdapter } from "./exa.js";
import { createFirecrawlProfile, FirecrawlSearchAdapter } from "./firecrawl.js";
import { createTavilyProfile, TavilySearchAdapter } from "./tavily.js";

export interface ProviderStatus {
  readonly id: string;
  readonly displayName: string;
  readonly available: boolean;
  readonly costConfigured: boolean;
  readonly supportedTasks: readonly RetrievalTask[];
  readonly issues: readonly string[];
}

export interface ProviderRegistry {
  readonly providers: readonly ConfiguredProvider[];
  readonly statuses: readonly ProviderStatus[];
}

export interface BuildProviderRegistryOptions {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly fetch: FetchLike;
  readonly clock: Clock;
}

interface CostConfiguration {
  readonly value: number | null;
  readonly issue?: string;
}

export function buildProviderRegistry(options: BuildProviderRegistryOptions): ProviderRegistry {
  const providers: ConfiguredProvider[] = [];
  const statuses: ProviderStatus[] = [];

  const braveCost = parseCost("BRAVE_COST_PER_REQUEST_USD", options.env.BRAVE_COST_PER_REQUEST_USD);
  const braveProfile = createBraveProfile({ costPerRequestUsd: braveCost.value });
  addProvider({
    keyName: "BRAVE_API_KEY",
    key: options.env.BRAVE_API_KEY,
    cost: braveCost,
    profile: braveProfile,
    providers,
    statuses,
    createAdapter: (apiKey) => new BraveSearchAdapter({ apiKey, fetch: options.fetch }),
  });

  const tavilyCost = parseCost(
    "TAVILY_COST_PER_CREDIT_USD",
    options.env.TAVILY_COST_PER_CREDIT_USD,
  );
  const tavilyProfile = createTavilyProfile({ costPerCreditUsd: tavilyCost.value });
  addProvider({
    keyName: "TAVILY_API_KEY",
    key: options.env.TAVILY_API_KEY,
    cost: tavilyCost,
    profile: tavilyProfile,
    providers,
    statuses,
    createAdapter: (apiKey) => new TavilySearchAdapter({ apiKey, fetch: options.fetch }),
  });

  const exaCost = parseCost("EXA_COST_PER_REQUEST_USD", options.env.EXA_COST_PER_REQUEST_USD);
  const exaProfile = createExaProfile({ costPerRequestUsd: exaCost.value });
  addProvider({
    keyName: "EXA_API_KEY",
    key: options.env.EXA_API_KEY,
    cost: exaCost,
    profile: exaProfile,
    providers,
    statuses,
    createAdapter: (apiKey) =>
      new ExaSearchAdapter({ apiKey, fetch: options.fetch, clock: options.clock }),
  });

  const firecrawlCost = parseCost(
    "FIRECRAWL_COST_PER_REQUEST_USD",
    options.env.FIRECRAWL_COST_PER_REQUEST_USD,
  );
  const firecrawlProfile = createFirecrawlProfile({
    costPerRequestUsd: firecrawlCost.value,
  });
  addProvider({
    keyName: "FIRECRAWL_API_KEY",
    key: options.env.FIRECRAWL_API_KEY,
    cost: firecrawlCost,
    profile: firecrawlProfile,
    providers,
    statuses,
    createAdapter: (apiKey) => new FirecrawlSearchAdapter({ apiKey, fetch: options.fetch }),
  });

  addCrossrefProvider(options, providers, statuses);

  return { providers, statuses };
}

function addCrossrefProvider(
  options: BuildProviderRegistryOptions,
  providers: ConfiguredProvider[],
  statuses: ProviderStatus[],
): void {
  const profile = createCrossrefProfile();
  const enabled = options.env.CROSSREF_ENABLED?.trim() === "true";
  const contactResult = z.email().safeParse(options.env.CROSSREF_CONTACT_EMAIL?.trim());
  const issues = enabled
    ? contactResult.success
      ? []
      : ["CROSSREF_CONTACT_EMAIL must be a valid email address"]
    : ["CROSSREF_ENABLED is not true"];
  const available = enabled && contactResult.success;
  statuses.push({
    id: profile.id,
    displayName: profile.displayName,
    available,
    costConfigured: true,
    supportedTasks: profile.supportedTasks,
    issues,
  });
  if (!available) return;
  providers.push({
    adapter: new CrossrefSearchAdapter({
      contactEmail: contactResult.data,
      fetch: options.fetch,
      clock: options.clock,
    }),
    profile,
  });
}

interface AddProviderOptions {
  readonly keyName: string;
  readonly key: string | undefined;
  readonly cost: CostConfiguration;
  readonly profile: ProviderProfile;
  readonly providers: ConfiguredProvider[];
  readonly statuses: ProviderStatus[];
  readonly createAdapter: (apiKey: string) => ProviderAdapter;
}

function addProvider(options: AddProviderOptions): void {
  const apiKey = options.key?.trim();
  const available = Boolean(apiKey);
  const issues = [
    ...(available ? [] : [`${options.keyName} is not configured`]),
    ...(options.cost.issue === undefined ? [] : [options.cost.issue]),
  ];
  options.statuses.push({
    id: options.profile.id,
    displayName: options.profile.displayName,
    available,
    costConfigured: options.cost.value !== null,
    supportedTasks: options.profile.supportedTasks,
    issues,
  });
  if (apiKey) {
    options.providers.push({
      adapter: options.createAdapter(apiKey),
      profile: options.profile,
    });
  }
}

function parseCost(name: string, raw: string | undefined): CostConfiguration {
  if (raw === undefined || raw.trim() === "") return { value: null };
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return { value: null, issue: `${name} must be a positive number` };
  }
  return { value };
}
