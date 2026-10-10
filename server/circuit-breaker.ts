/**
 * Circuit breaker with exponential backoff and jitter for resilient provider routing
 */

export interface CircuitBreakerOptions {
  failureThreshold?: number;       // Consecutive failures before opening
  baseTimeoutMs?: number;          // Base timeout before half-open (e.g. 15s)
  maxTimeoutMs?: number;           // Max backoff timeout (e.g. 120s)
  successThreshold?: number;       // Successes in half-open state to close
}

export class CircuitBreaker {
  public state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private nextAttemptTime = 0;
  private consecutiveFailures = 0;

  private failureThreshold: number;
  private baseTimeoutMs: number;
  private maxTimeoutMs: number;
  private successThreshold: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 3;
    this.baseTimeoutMs = options.baseTimeoutMs ?? 15000;
    this.maxTimeoutMs = options.maxTimeoutMs ?? 120000;
    this.successThreshold = options.successThreshold ?? 2;
  }

  public canExecute(): boolean {
    const now = Date.now();
    if (this.state === 'closed') {
      return true;
    }

    if (this.state === 'open') {
      if (now >= this.nextAttemptTime) {
        this.state = 'half-open';
        this.successCount = 0;
        return true;
      }
      return false;
    }

    // Half-open: allow limited trial executions
    return true;
  }

  public recordSuccess(): void {
    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'closed';
        this.failureCount = 0;
        this.consecutiveFailures = 0;
      }
    } else if (this.state === 'closed') {
      this.failureCount = 0;
      this.consecutiveFailures = 0;
    }
  }

  public recordFailure(): void {
    const now = Date.now();
    this.lastFailureTime = now;
    this.failureCount++;
    this.consecutiveFailures++;

    if (this.state === 'closed' && this.failureCount >= this.failureThreshold) {
      this.openCircuit(now);
    } else if (this.state === 'half-open') {
      this.openCircuit(now);
    }
  }

  private openCircuit(now: number): void {
    this.state = 'open';
    // Exponential backoff with jitter
    const exponent = Math.min(this.consecutiveFailures, 6);
    const backoff = Math.min(this.baseTimeoutMs * Math.pow(1.5, exponent), this.maxTimeoutMs);
    const jitter = Math.random() * 0.3 * backoff; // 0-30% jitter
    this.nextAttemptTime = now + backoff + jitter;
  }

  public getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      consecutiveFailures: this.consecutiveFailures,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }
}
