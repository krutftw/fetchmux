import { describe, expect, it } from "vitest";
import type { SearchRequest } from "../src/contracts.js";
import { FetchMuxError, ProviderError } from "../src/errors.js";
import { InMemoryProviderHealthStore } from "../src/health.js";
import type {
  Clock,
  ConfiguredProvider,
  IdFactory,
  ProviderAdapter,
  ProviderExecutionContext,
  ProviderProfile,
  ProviderSearchResponse,
} from "../src/provider.js";
import { RetrievalRouter, type RouterScheduler } from "../src/router.js";

class MutableClock implements Clock {
  constructor(private value = Date.parse("2026-07-16T08:00:00.000Z")) {}

  now(): number {
    return this.value;
  }

  advance(milliseconds: number): void {
    this.value += milliseconds;
  }
}

interface ManualTimer {
  callback: () => void;
  dueAt: number;
  cancelled: boolean;
}

class ManualScheduler implements RouterScheduler {
  private readonly timers: ManualTimer[] = [];

  constructor(private readonly clock: MutableClock) {}

  schedule(callback: () => void, delayMs: number): unknown {
    const timer = { callback, dueAt: this.clock.now() + delayMs, cancelled: false };
    this.timers.push(timer);
    return timer;
  }

  cancel(handle: unknown): void {
    (handle as ManualTimer).cancelled = true;
  }

  advance(milliseconds: number): void {
    this.clock.advance(milliseconds);
    for (const timer of this.timers) {
      if (!timer.cancelled && timer.dueAt <= this.clock.now()) {
        timer.cancelled = true;
        timer.callback();
      }
    }
  }
}

type ProviderBehavior = (
  request: SearchRequest,
  context: ProviderExecutionContext,
) => Promise<ProviderSearchResponse>;

class FakeProviderAdapter implements ProviderAdapter {
  calls = 0;

  constructor(
    readonly id: string,
    private readonly behavior: ProviderBehavior,
  ) {}

  async search(
    request: SearchRequest,
    context: ProviderExecutionContext,
  ): Promise<ProviderSearchResponse> {
    this.calls += 1;
    return this.behavior(request, context);
  }
}

interface ProviderOptions {
  cost: number | null;
  behavior: ProviderBehavior;
  quality?: number;
  latency?: number;
}

function provider(
  id: string,
  options: ProviderOptions,
): {
  configured: ConfiguredProvider;
  adapter: FakeProviderAdapter;
} {
  const adapter = new FakeProviderAdapter(id, options.behavior);
  const profile: ProviderProfile = {
    id,
    displayName: id.toUpperCase(),
    supportedTasks: ["balanced", "fresh_facts", "deep_research", "page_content"],
    supportedFreshness: ["24h", "7d", "30d", "1y"],
    qualityByTask: {
      balanced: options.quality ?? 0.8,
      fresh_facts: options.quality ?? 0.8,
      deep_research: options.quality ?? 0.8,
      page_content: options.quality ?? 0.8,
    },
    baselineReliability: 0.98,
    baselineP95LatencyMs: options.latency ?? 1_000,
    estimateCostUsd: () => options.cost,
  };
  return { configured: { adapter, profile }, adapter };
}

function success(clock: MutableClock, title: string, delayMs = 20): ProviderBehavior {
  return async () => {
    clock.advance(delayMs);
    return {
      results: [{ title, url: `https://example.com/${title.toLowerCase()}` }],
    };
  };
}

function testRouter(
  providers: readonly ConfiguredProvider[],
  options: {
    clock?: MutableClock;
    scheduler?: ManualScheduler;
    healthStore?: InMemoryProviderHealthStore;
    traceId?: string;
  } = {},
): { router: RetrievalRouter; clock: MutableClock; scheduler: ManualScheduler } {
  const clock = options.clock ?? new MutableClock();
  const scheduler = options.scheduler ?? new ManualScheduler(clock);
  const idFactory: IdFactory = {
    createTraceId: () => options.traceId ?? "rt_deterministic",
  };
  return {
    router: new RetrievalRouter({
      providers,
      clock,
      scheduler,
      idFactory,
      healthStore: options.healthStore ?? new InMemoryProviderHealthStore({ clock }),
    }),
    clock,
    scheduler,
  };
}

describe("RetrievalRouter", () => {
  it("returns normalized evidence and a deterministic route receipt", async () => {
    const clock = new MutableClock();
    const brave = provider("brave", {
      cost: 0.005,
      behavior: async () => {
        clock.advance(25);
        return {
          results: [
            {
              title: "Privacy",
              url: "https://example.com/privacy",
              snippet: undefined,
            },
          ] as unknown as ProviderSearchResponse["results"],
        };
      },
    });
    const { router } = testRouter([brave.configured], { clock, traceId: "rt_fixed" });

    const response = await router.search({ query: "latest privacy law", maxCostUsd: 0.01 });

    expect(response.results).toEqual([
      {
        title: "Privacy",
        url: "https://example.com/privacy",
        provider: "brave",
        rank: 1,
      },
    ]);
    expect(response.route).toEqual({
      selectedProvider: "brave",
      attemptedProviders: ["brave"],
      attempts: [
        {
          provider: "brave",
          startedAt: "2026-07-16T08:00:00.000Z",
          endedAt: "2026-07-16T08:00:00.025Z",
          latencyMs: 25,
          estimatedCostUsd: 0.005,
          outcome: "success",
        },
      ],
      reasonCodes: [
        "TASK_MATCH",
        "BALANCED_PRIORITY",
        "RELIABILITY_WEIGHT",
        "WITHIN_BUDGET",
        "ONLY_ELIGIBLE_PROVIDER",
      ],
      estimatedCostUsd: 0.005,
      latencyMs: 25,
      fallbackUsed: false,
      traceId: "rt_fixed",
    });
    expect(response.results[0]).not.toHaveProperty("snippet");
  });

  it("fails over after a classified retryable provider error", async () => {
    const clock = new MutableClock();
    const primary = provider("a-primary", {
      cost: 0.003,
      behavior: async () => {
        clock.advance(10);
        throw new ProviderError({
          provider: "a-primary",
          code: "RATE_LIMITED",
          message: "Primary rate limited the request",
          retryable: true,
          statusCode: 429,
        });
      },
    });
    const backup = provider("b-backup", {
      cost: 0.004,
      behavior: success(clock, "Backup", 20),
    });
    const { router } = testRouter([primary.configured, backup.configured], { clock });

    const response = await router.search({ query: "q", maxCostUsd: 0.02 });

    expect(primary.adapter.calls).toBe(1);
    expect(backup.adapter.calls).toBe(1);
    expect(response.route.attemptedProviders).toEqual(["a-primary", "b-backup"]);
    expect(response.route.attempts.map((attempt) => attempt.outcome)).toEqual([
      "retryable_error",
      "success",
    ]);
    expect(response.route.reasonCodes).toContain("FALLBACK_AFTER_RETRYABLE_ERROR");
    expect(response.route).toMatchObject({
      selectedProvider: "b-backup",
      estimatedCostUsd: 0.007,
      fallbackUsed: true,
    });
  });

  it("does not retry a terminal provider error", async () => {
    const terminal = provider("a-terminal", {
      cost: 0.002,
      behavior: async () => {
        throw new ProviderError({
          provider: "a-terminal",
          code: "AUTHENTICATION_FAILED",
          message: "Provider authentication failed",
          retryable: false,
          statusCode: 401,
        });
      },
    });
    const backup = provider("b-backup", {
      cost: 0.003,
      behavior: success(new MutableClock(), "Backup"),
    });
    const { router } = testRouter([terminal.configured, backup.configured]);

    await expect(router.search({ query: "q" })).rejects.toMatchObject({
      code: "ALL_PROVIDERS_FAILED",
      traceId: "rt_deterministic",
    });
    expect(terminal.adapter.calls).toBe(1);
    expect(backup.adapter.calls).toBe(0);
  });

  it("does not spend past the fallback budget", async () => {
    const first = provider("a-first", {
      cost: 0.006,
      behavior: async () => {
        throw new ProviderError({
          provider: "a-first",
          code: "UPSTREAM_UNAVAILABLE",
          message: "First provider unavailable",
          retryable: true,
          statusCode: 503,
        });
      },
    });
    const second = provider("b-second", {
      cost: 0.006,
      behavior: success(new MutableClock(), "Second"),
    });
    const { router } = testRouter([first.configured, second.configured]);

    await expect(router.search({ query: "q", maxCostUsd: 0.01 })).rejects.toMatchObject({
      code: "BUDGET_EXHAUSTED",
    });
    expect(first.adapter.calls).toBe(1);
    expect(second.adapter.calls).toBe(0);
  });

  it("does not start a fallback after the absolute deadline", async () => {
    const clock = new MutableClock();
    const first = provider("a-first", {
      cost: 0.001,
      behavior: async () => {
        clock.advance(250);
        throw new ProviderError({
          provider: "a-first",
          code: "RATE_LIMITED",
          message: "First provider rate limited the request",
          retryable: true,
        });
      },
    });
    const second = provider("b-second", {
      cost: 0.001,
      behavior: success(clock, "Second"),
    });
    const { router } = testRouter([first.configured, second.configured], { clock });

    await expect(router.search({ query: "q", maxLatencyMs: 250 })).rejects.toMatchObject({
      code: "DEADLINE_EXCEEDED",
    });
    expect(second.adapter.calls).toBe(0);
  });

  it("aborts an in-flight provider at the remaining deadline", async () => {
    const clock = new MutableClock();
    const scheduler = new ManualScheduler(clock);
    const hanging = provider("hanging", {
      cost: 0.001,
      behavior: async (_request, context) =>
        new Promise((_resolve, reject) => {
          context.signal.addEventListener(
            "abort",
            () => reject(new DOMException("aborted with secret upstream text", "AbortError")),
            { once: true },
          );
        }),
    });
    const { router } = testRouter([hanging.configured], { clock, scheduler });

    const pending = router.search({ query: "q", maxLatencyMs: 250 });
    scheduler.advance(250);

    await expect(pending).rejects.toMatchObject({ code: "DEADLINE_EXCEEDED" });
  });

  it("skips a provider whose circuit is open", async () => {
    const clock = new MutableClock();
    const healthStore = new InMemoryProviderHealthStore({ clock, failureThreshold: 1 });
    healthStore.recordFailure("a-open", { retryable: true, latencyMs: 100 });
    const open = provider("a-open", { cost: 0.001, behavior: success(clock, "Open") });
    const healthy = provider("b-healthy", {
      cost: 0.002,
      behavior: success(clock, "Healthy"),
    });
    const { router } = testRouter([open.configured, healthy.configured], {
      clock,
      healthStore,
    });

    const response = await router.search({ query: "q" });

    expect(open.adapter.calls).toBe(0);
    expect(healthy.adapter.calls).toBe(1);
    expect(response.route.selectedProvider).toBe("b-healthy");
  });

  it("treats a malformed provider result as terminal", async () => {
    const invalid = provider("a-invalid", {
      cost: 0.001,
      behavior: async () => ({
        results: [{ title: "Invalid", url: "javascript:alert(1)" }],
      }),
    });
    const backup = provider("b-backup", {
      cost: 0.002,
      behavior: success(new MutableClock(), "Backup"),
    });
    const { router } = testRouter([invalid.configured, backup.configured]);

    await expect(router.search({ query: "q" })).rejects.toMatchObject({
      code: "ALL_PROVIDERS_FAILED",
    });
    expect(backup.adapter.calls).toBe(0);
  });

  it("uses null rather than zero when any attempted cost is unknown", async () => {
    const clock = new MutableClock();
    const unknown = provider("unknown", {
      cost: null,
      behavior: success(clock, "Unknown"),
    });
    const { router } = testRouter([unknown.configured], { clock });

    const response = await router.search({ query: "q" });

    expect(response.route.estimatedCostUsd).toBeNull();
    expect(response.route.attempts[0]?.estimatedCostUsd).toBeNull();
  });

  it("does not expose raw unknown errors or credentials", async () => {
    const unsafe = provider("unsafe", {
      cost: 0.001,
      behavior: async () => {
        throw new Error("Authorization: Bearer sk-secret raw provider body");
      },
    });
    const { router } = testRouter([unsafe.configured], { traceId: "rt_safe" });

    try {
      await router.search({ query: "q" });
      throw new Error("Expected search to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(FetchMuxError);
      expect(error).toMatchObject({
        code: "ALL_PROVIDERS_FAILED",
        message: "No provider could complete this retrieval request",
        traceId: "rt_safe",
      });
      expect(JSON.stringify(error)).not.toContain("sk-secret");
      expect((error as Error).cause).toBeUndefined();
    }
  });
});
