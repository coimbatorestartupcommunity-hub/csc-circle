import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  withCircuitBreaker,
  getOrCreateCircuitBreaker,
  CircuitBreakerOpenError,
  CircuitBreakerTimeoutError,
  __resetCircuitBreakersForTests,
} from "@/lib/circuit-breaker";

describe("Circuit Breaker System (Concept 10)", () => {
  beforeEach(() => {
    __resetCircuitBreakersForTests();
  });

  it("executes successfully in normal CLOSED state", async () => {
    const result = await withCircuitBreaker("test-service", async () => "success");
    expect(result).toBe("success");

    const breaker = getOrCreateCircuitBreaker("test-service");
    expect(breaker.state).toBe("CLOSED");
    expect(breaker.totalSuccesses).toBe(1);
    expect(breaker.failures).toBe(0);
  });

  it("trips to OPEN state after exceeding failure threshold", async () => {
    const options = { failureThreshold: 3, recoveryTimeoutMs: 1000, timeoutMs: 500 };

    // Trigger 3 failures
    for (let i = 0; i < 3; i++) {
      await expect(
        withCircuitBreaker(
          "failing-service",
          async () => {
            throw new Error("Downstream outage");
          },
          undefined,
          options
        )
      ).rejects.toThrow("Downstream outage");
    }

    const breaker = getOrCreateCircuitBreaker("failing-service");
    expect(breaker.state).toBe("OPEN");

    // 4th call should immediately fail-fast with CircuitBreakerOpenError
    await expect(
      withCircuitBreaker(
        "failing-service",
        async () => "never-called",
        undefined,
        options
      )
    ).rejects.toThrow(CircuitBreakerOpenError);
  });

  it("returns fallback value when circuit is OPEN if fallback is provided", async () => {
    const options = { failureThreshold: 2, recoveryTimeoutMs: 1000, timeoutMs: 500 };

    for (let i = 0; i < 2; i++) {
      try {
        await withCircuitBreaker("fallback-service", async () => { throw new Error("fail"); }, undefined, options);
      } catch {
        // ignore
      }
    }

    const result = await withCircuitBreaker(
      "fallback-service",
      async () => "live",
      () => "graceful-fallback",
      options
    );

    expect(result).toBe("graceful-fallback");
  });

  it("aborts and times out when execution exceeds timeoutMs", async () => {
    const options = { timeoutMs: 100, failureThreshold: 5 };

    await expect(
      withCircuitBreaker(
        "slow-service",
        async (signal) => {
          return new Promise((resolve, reject) => {
            const timer = setTimeout(() => resolve("late"), 300);
            signal.addEventListener("abort", () => {
              clearTimeout(timer);
              reject(new Error("aborted"));
            });
          });
        },
        undefined,
        options
      )
    ).rejects.toThrow(CircuitBreakerTimeoutError);
  });
});
