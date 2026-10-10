/**
 * Request queue with rate limiting and request coalescing (single-flight deduplication)
 */

export class RequestCoalescer {
  private inFlight = new Map<string, Promise<unknown>>();

  /**
   * If an identical request key is already in flight, await and share its promise.
   * Otherwise, execute the task and cleanup upon completion.
   */
  async execute<T>(key: string, task: () => Promise<T>): Promise<T> {
    if (this.inFlight.has(key)) {
      return this.inFlight.get(key) as Promise<T>;
    }

    const promise = (async () => {
      try {
        return await task();
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  getActiveRequestsCount(): number {
    return this.inFlight.size;
  }
}

export class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRatePerSec: number;
  private lastRefill: number;

  constructor(maxTokens = 20, refillRatePerSec = 5) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRatePerSec = refillRatePerSec;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsedSec = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsedSec * this.refillRatePerSec);
    this.lastRefill = now;
  }

  async acquire(cost = 1): Promise<void> {
    this.refill();
    if (this.tokens >= cost) {
      this.tokens -= cost;
      return;
    }

    // Wait until enough tokens accumulate
    const needed = cost - this.tokens;
    const waitMs = (needed / this.refillRatePerSec) * 1000;
    await new Promise((resolve) => setTimeout(resolve, Math.max(50, waitMs)));
    this.refill();
    this.tokens = Math.max(0, this.tokens - cost);
  }
}

export const requestCoalescer = new RequestCoalescer();
export const globalRateLimiter = new RateLimiter(30, 10);
