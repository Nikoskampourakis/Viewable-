/**
 * Base Provider abstraction
 * Every fallback provider (Guest GraphQL, Syndication, Session, Nitter, Wayback, Cache)
 * extends this class.
 */

import { CircuitBreaker } from '../circuit-breaker.ts';
import { User, Tweet, Thread, TimelineResponse, CommunityNote, ProviderHealth, ProviderOptions } from '../types.ts';

export abstract class Provider {
  public abstract readonly id: string;
  public abstract readonly name: string;
  public priority: number;

  protected circuitBreaker: CircuitBreaker;
  protected totalRequests = 0;
  protected successfulRequests = 0;
  protected totalLatencyMs = 0;
  protected lastLatencyMs = 0;
  protected lastError?: string;
  protected lastCheckTime = Date.now();

  constructor(priority: number) {
    this.priority = priority;
    this.circuitBreaker = new CircuitBreaker();
  }

  public isAvailable(_options?: ProviderOptions): boolean {
    return this.circuitBreaker.canExecute();
  }

  public abstract getProfile(username: string, options?: ProviderOptions): Promise<User>;
  public abstract getTimeline(username: string, options?: ProviderOptions): Promise<TimelineResponse>;
  public abstract getTweet(id: string, options?: ProviderOptions): Promise<Tweet>;
  public abstract getReplies(tweetId: string, options?: ProviderOptions): Promise<Thread>;
  public abstract search(query: string, options?: ProviderOptions): Promise<TimelineResponse>;

  public async getCommunityNotes(tweetId: string, options?: ProviderOptions): Promise<CommunityNote | null> {
    try {
      const tweet = await this.getTweet(tweetId, options);
      return tweet.communityNote || null;
    } catch {
      return null;
    }
  }

  /**
   * Wraps an async call with circuit breaker checking, latency metrics, and error accounting
   */
  protected async executeWithMetrics<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.circuitBreaker.canExecute()) {
      throw new Error(`Provider ${this.name} circuit breaker is OPEN`);
    }

    const start = Date.now();
    this.totalRequests++;
    this.lastCheckTime = start;

    try {
      const result = await operation();
      const duration = Date.now() - start;
      this.totalLatencyMs += duration;
      this.lastLatencyMs = duration;
      this.successfulRequests++;
      this.circuitBreaker.recordSuccess();
      return result;
    } catch (err: any) {
      const duration = Date.now() - start;
      this.lastLatencyMs = duration;
      this.lastError = err?.message || String(err);
      this.circuitBreaker.recordFailure();
      throw err;
    }
  }

  public getHealth(): ProviderHealth {
    const successRate = this.totalRequests > 0
      ? Math.round((this.successfulRequests / this.totalRequests) * 100)
      : 100;

    let status: 'operational' | 'degraded' | 'down' = 'operational';
    if (this.circuitBreaker.state === 'open') {
      status = 'down';
    } else if (this.circuitBreaker.state === 'half-open' || successRate < 70) {
      status = 'degraded';
    }

    return {
      id: this.id,
      name: this.name,
      priority: this.priority,
      status,
      latencyMs: this.lastLatencyMs,
      successRate,
      totalRequests: this.totalRequests,
      lastCheck: new Date(this.lastCheckTime).toISOString(),
      circuitState: this.circuitBreaker.state,
      errorCount: this.circuitBreaker.getStats().failureCount,
      lastError: this.lastError,
    };
  }
}
