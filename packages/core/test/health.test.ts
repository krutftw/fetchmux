import { describe, expect, it } from "vitest";
import { InMemoryProviderHealthStore } from "../src/health.js";
import type { Clock } from "../src/provider.js";

class MutableClock implements Clock {
  constructor(private value = 1_000) {}

  now(): number {
    return this.value;
  }

  advance(milliseconds: number): void {
    this.value += milliseconds;
  }
}

describe("InMemoryProviderHealthStore", () => {
  it("opens a provider circuit after three retryable failures", () => {
    const store = new InMemoryProviderHealthStore({ clock: new MutableClock() });

    store.recordFailure("brave", { retryable: true, latencyMs: 100 });
    store.recordFailure("brave", { retryable: true, latencyMs: 110 });
    expect(store.getSnapshot("brave").circuitState).toBe("closed");

    store.recordFailure("brave", { retryable: true, latencyMs: 120 });

    expect(store.getSnapshot("brave")).toMatchObject({
      circuitState: "open",
      consecutiveRetryableFailures: 3,
    });
    expect(store.canAttempt("brave")).toBe(false);
  });

  it("does not count terminal configuration failures toward the outage circuit", () => {
    const store = new InMemoryProviderHealthStore({ clock: new MutableClock() });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      store.recordFailure("tavily", { retryable: false, latencyMs: 20 });
    }

    expect(store.getSnapshot("tavily")).toMatchObject({
      circuitState: "closed",
      consecutiveRetryableFailures: 0,
    });
  });

  it("moves an open circuit to half-open after the cooldown", () => {
    const clock = new MutableClock();
    const store = new InMemoryProviderHealthStore({
      clock,
      failureThreshold: 1,
      cooldownMs: 30_000,
    });
    store.recordFailure("exa", { retryable: true, latencyMs: 900 });

    clock.advance(29_999);
    expect(store.getSnapshot("exa").circuitState).toBe("open");
    expect(store.canAttempt("exa")).toBe(false);

    clock.advance(1);
    expect(store.getSnapshot("exa").circuitState).toBe("half_open");
    expect(store.canAttempt("exa")).toBe(true);
  });

  it("closes and resets a half-open circuit after a successful probe", () => {
    const clock = new MutableClock();
    const store = new InMemoryProviderHealthStore({
      clock,
      failureThreshold: 1,
      cooldownMs: 1_000,
    });
    store.recordFailure("firecrawl", { retryable: true, latencyMs: 2_000 });
    clock.advance(1_000);
    expect(store.getSnapshot("firecrawl").circuitState).toBe("half_open");

    store.recordSuccess("firecrawl", { latencyMs: 400 });

    expect(store.getSnapshot("firecrawl")).toMatchObject({
      circuitState: "closed",
      consecutiveRetryableFailures: 0,
    });
  });

  it("keeps circuit state isolated by provider", () => {
    const store = new InMemoryProviderHealthStore({
      clock: new MutableClock(),
      failureThreshold: 1,
    });

    store.recordFailure("brave", { retryable: true, latencyMs: 100 });

    expect(store.getSnapshot("brave").circuitState).toBe("open");
    expect(store.getSnapshot("exa").circuitState).toBe("closed");
  });

  it("records bounded EWMA reliability and latency", () => {
    const store = new InMemoryProviderHealthStore({
      clock: new MutableClock(),
      ewmaAlpha: 0.5,
    });

    store.recordSuccess("brave", { latencyMs: 100 });
    store.recordFailure("brave", { retryable: true, latencyMs: 300 });

    const snapshot = store.getSnapshot("brave");
    expect(snapshot.reliability).toBe(0.5);
    expect(snapshot.observedLatencyMs).toBe(200);
    expect(snapshot.reliability).toBeGreaterThanOrEqual(0);
    expect(snapshot.reliability).toBeLessThanOrEqual(1);
  });
});
