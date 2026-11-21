/**
 * Production Circuit Breaker & Resilient Fetch Utility.
 * Adheres to Concept 10 ("Circuit Breaker") of 10 Things Every Vibe Coder Should Know:
 * - Wraps external calls (payments, email, SMS, third-party APIs) with timeouts and state tracking.
 * - States:
 *   - CLOSED: Normal operations. Failures are counted.
 *   - OPEN: Threshold exceeded; calls immediately fail-fast or return fallback to avoid worker starvation.
 *   - HALF_OPEN: Cooldown expired; lets trial requests test if upstream service recovered.
 */

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  failureThreshold?: number; // consecutive failures to trip circuit (default: 5)
  recoveryTimeoutMs?: number; // time to wait before entering HALF_OPEN (default: 30,000ms)
  timeoutMs?: number; // per-request execution timeout (default: 5,000ms)
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failures: number;
  consecutiveSuccesses: number;
  lastFailureTime: number | null;
  lastStateChange: number;
  totalCalls: number;
  totalSuccesses: number;
  totalFailures: number;
}

export class CircuitBreakerOpenError extends Error {
  constructor(public readonly serviceName: string, public readonly retryAfterMs: number) {
    super(`Circuit breaker is OPEN for service '${serviceName}'. Retry after ${Math.ceil(retryAfterMs / 1000)}s.`);
    this.name = "CircuitBreakerOpenError";
  }
}

export class CircuitBreakerTimeoutError extends Error {
  constructor(public readonly serviceName: string, public readonly timeoutMs: number) {
    super(`Operation for service '${serviceName}' timed out after ${timeoutMs}ms.`);
    this.name = "CircuitBreakerTimeoutError";
  }
}

class CircuitBreaker {
  public state: CircuitState = "CLOSED";
  public failures = 0;
  public consecutiveSuccesses = 0;
  public lastFailureTime: number | null = null;
  public lastStateChange: number = Date.now();
  public totalCalls = 0;
  public totalSuccesses = 0;
  public totalFailures = 0;

  constructor(
    public readonly name: string,
    public readonly options: Required<CircuitBreakerOptions>
  ) {}

  public isAvailable(): boolean {
    const now = Date.now();
    if (this.state === "OPEN") {
      if (now - this.lastStateChange >= this.options.recoveryTimeoutMs) {
        this.transitionTo("HALF_OPEN");
        return true;
      }
      return false;
    }
    return true;
  }

  public recordSuccess(): void {
    this.totalSuccesses++;
    if (this.state === "HALF_OPEN") {
      this.consecutiveSuccesses++;
      if (this.consecutiveSuccesses >= 2) {
        this.transitionTo("CLOSED");
      }
    } else if (this.state === "CLOSED") {
      this.failures = 0;
    }
  }

  public recordFailure(): void {
    const now = Date.now();
    this.lastFailureTime = now;
    this.totalFailures++;

    if (this.state === "HALF_OPEN") {
      this.transitionTo("OPEN");
    } else if (this.state === "CLOSED") {
      this.failures++;
      if (this.failures >= this.options.failureThreshold) {
        this.transitionTo("OPEN");
      }
    }
  }

  private transitionTo(newState: CircuitState): void {
    this.state = newState;
    this.lastStateChange = Date.now();
    if (newState === "CLOSED") {
      this.failures = 0;
      this.consecutiveSuccesses = 0;
    } else if (newState === "HALF_OPEN") {
      this.consecutiveSuccesses = 0;
    }
  }

  public getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failures: this.failures,
      consecutiveSuccesses: this.consecutiveSuccesses,
      lastFailureTime: this.lastFailureTime,
      lastStateChange: this.lastStateChange,
      totalCalls: this.totalCalls,
      totalSuccesses: this.totalSuccesses,
      totalFailures: this.totalFailures,
    };
  }
}

const registry = new Map<string, CircuitBreaker>();

const DEFAULT_OPTIONS: Required<CircuitBreakerOptions> = {
  failureThreshold: 5,
  recoveryTimeoutMs: 30_000,
  timeoutMs: 5_000,
};

export function getOrCreateCircuitBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
  let breaker = registry.get(name);
  if (!breaker) {
    breaker = new CircuitBreaker(name, {
      failureThreshold: options?.failureThreshold ?? DEFAULT_OPTIONS.failureThreshold,
      recoveryTimeoutMs: options?.recoveryTimeoutMs ?? DEFAULT_OPTIONS.recoveryTimeoutMs,
      timeoutMs: options?.timeoutMs ?? DEFAULT_OPTIONS.timeoutMs,
    });
    registry.set(name, breaker);
  }
  return breaker;
}

/**
 * Executes an async action protected by circuit breaker and timeout.
 */
export async function withCircuitBreaker<T>(
  serviceName: string,
  action: (signal: AbortSignal) => Promise<T>,
  fallback?: () => Promise<T> | T,
  options?: CircuitBreakerOptions
): Promise<T> {
  const breaker = getOrCreateCircuitBreaker(serviceName, options);
  breaker.totalCalls++;

  if (!breaker.isAvailable()) {
    const retryAfter = Math.max(0, breaker.options.recoveryTimeoutMs - (Date.now() - breaker.lastStateChange));
    if (fallback) return fallback();
    throw new CircuitBreakerOpenError(serviceName, retryAfter);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, breaker.options.timeoutMs);

  try {
    const result = await action(controller.signal);
    clearTimeout(timer);
    breaker.recordSuccess();
    return result;
  } catch (error: unknown) {
    clearTimeout(timer);
    breaker.recordFailure();

    if (controller.signal.aborted) {
      if (fallback) return fallback();
      throw new CircuitBreakerTimeoutError(serviceName, breaker.options.timeoutMs);
    }

    if (fallback) return fallback();
    throw error;
  }
}

/**
 * Resilient fetch wrapper with built-in AbortController timeout and Circuit Breaker protection.
 */
export async function resilientFetch(
  serviceName: string,
  input: RequestInfo | URL,
  init?: RequestInit,
  fallback?: () => Promise<Response> | Response,
  options?: CircuitBreakerOptions
): Promise<Response> {
  return withCircuitBreaker(
    serviceName,
    async (signal) => {
      const response = await fetch(input, { ...init, signal });
      if (response.status >= 500) {
        throw new Error(`Service '${serviceName}' returned HTTP ${response.status}`);
      }
      return response;
    },
    fallback,
    options
  );
}

export function getAllCircuitBreakers(): Record<string, CircuitBreakerMetrics> {
  const result: Record<string, CircuitBreakerMetrics> = {};
  for (const [name, breaker] of registry) {
    result[name] = breaker.getMetrics();
  }
  return result;
}

export function __resetCircuitBreakersForTests(): void {
  registry.clear();
}
