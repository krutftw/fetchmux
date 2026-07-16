import type { Clock } from "./provider.js";

export type CircuitState = "closed" | "open" | "half_open";

export interface ProviderHealthSnapshot {
  readonly circuitState: CircuitState;
  readonly consecutiveRetryableFailures: number;
  readonly reliability: number;
  readonly observedLatencyMs?: number;
}

export interface AttemptOutcome {
  readonly latencyMs: number;
}

export interface FailedAttemptOutcome extends AttemptOutcome {
  readonly retryable: boolean;
}

export interface ProviderHealthStore {
  getSnapshot(providerId: string): ProviderHealthSnapshot;
  canAttempt(providerId: string): boolean;
  recordSuccess(providerId: string, outcome: AttemptOutcome): void;
  recordFailure(providerId: string, outcome: FailedAttemptOutcome): void;
}

export interface InMemoryProviderHealthStoreOptions {
  readonly clock: Clock;
  readonly failureThreshold?: number;
  readonly cooldownMs?: number;
  readonly ewmaAlpha?: number;
}

interface MutableProviderHealth {
  circuitState: CircuitState;
  consecutiveRetryableFailures: number;
  reliability: number;
  observedLatencyMs?: number;
  openedAt?: number;
}

export class InMemoryProviderHealthStore implements ProviderHealthStore {
  private readonly states = new Map<string, MutableProviderHealth>();
  private readonly clock: Clock;
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private readonly ewmaAlpha: number;

  constructor(options: InMemoryProviderHealthStoreOptions) {
    this.clock = options.clock;
    this.failureThreshold = options.failureThreshold ?? 3;
    this.cooldownMs = options.cooldownMs ?? 30_000;
    this.ewmaAlpha = options.ewmaAlpha ?? 0.2;
  }

  getSnapshot(providerId: string): ProviderHealthSnapshot {
    const state = this.getState(providerId);
    this.refreshCircuit(state);
    const snapshot: ProviderHealthSnapshot = {
      circuitState: state.circuitState,
      consecutiveRetryableFailures: state.consecutiveRetryableFailures,
      reliability: state.reliability,
    };
    if (state.observedLatencyMs !== undefined) {
      return { ...snapshot, observedLatencyMs: state.observedLatencyMs };
    }
    return snapshot;
  }

  canAttempt(providerId: string): boolean {
    return this.getSnapshot(providerId).circuitState !== "open";
  }

  recordSuccess(providerId: string, outcome: AttemptOutcome): void {
    const state = this.getState(providerId);
    state.reliability = this.ewma(state.reliability, 1);
    state.observedLatencyMs = this.ewmaLatency(state.observedLatencyMs, outcome.latencyMs);
    state.consecutiveRetryableFailures = 0;
    state.circuitState = "closed";
    delete state.openedAt;
  }

  recordFailure(providerId: string, outcome: FailedAttemptOutcome): void {
    const state = this.getState(providerId);
    state.observedLatencyMs = this.ewmaLatency(state.observedLatencyMs, outcome.latencyMs);
    if (!outcome.retryable) return;

    state.reliability = this.ewma(state.reliability, 0);
    state.consecutiveRetryableFailures += 1;
    if (
      state.circuitState === "half_open" ||
      state.consecutiveRetryableFailures >= this.failureThreshold
    ) {
      state.circuitState = "open";
      state.openedAt = this.clock.now();
    }
  }

  private getState(providerId: string): MutableProviderHealth {
    const existing = this.states.get(providerId);
    if (existing) return existing;

    const created: MutableProviderHealth = {
      circuitState: "closed",
      consecutiveRetryableFailures: 0,
      reliability: 1,
    };
    this.states.set(providerId, created);
    return created;
  }

  private refreshCircuit(state: MutableProviderHealth): void {
    if (
      state.circuitState === "open" &&
      state.openedAt !== undefined &&
      this.clock.now() - state.openedAt >= this.cooldownMs
    ) {
      state.circuitState = "half_open";
    }
  }

  private ewma(current: number, sample: number): number {
    return this.ewmaAlpha * sample + (1 - this.ewmaAlpha) * current;
  }

  private ewmaLatency(current: number | undefined, sample: number): number {
    const boundedSample = Math.max(0, sample);
    if (current === undefined) return boundedSample;
    return this.ewmaAlpha * boundedSample + (1 - this.ewmaAlpha) * current;
  }
}
