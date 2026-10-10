/**
 * Provider Fallback Router ("Failsafe")
 * Coordinates all providers in priority order with circuit breakers,
 * request coalescing, caching with TTL, and health monitoring.
 */

import { Provider } from './providers/base.ts';
import { GuestGraphQLProvider } from './providers/guest-graphql.ts';
import { SyndicationProvider } from './providers/syndication.ts';
import { UserSessionProvider } from './providers/user-session.ts';
import { NitterProvider } from './providers/nitter.ts';
import { CacheFallbackProvider } from './providers/cache-fallback.ts';
import { WaybackProvider } from './providers/wayback.ts';
import { cacheStore } from './cache.ts';
import { requestCoalescer, globalRateLimiter } from './queue.ts';
import { User, Tweet, Thread, TimelineResponse, ProviderHealth, ProviderOptions } from './types.ts';

const TTL = {
  TWEET: 600,       // 10 minutes
  TIMELINE: 300,    // 5 minutes
  PROFILE: 3600,    // 1 hour
  SEARCH: 180,      // 3 minutes
};

export class ProviderRouter {
  private providers: Provider[] = [];

  constructor() {
    // Register all providers in default priority order
    this.providers = [
      new UserSessionProvider(1),   // If user provided session cookies, try first (essential for search & sensitive posts)
      new GuestGraphQLProvider(2),  // Unauthenticated GraphQL
      new SyndicationProvider(3),   // Fast public CDN embed
      new NitterProvider(4),        // Public Nitter instance pool
      new CacheFallbackProvider(5), // Local LRU cache served on upstream failure
      new WaybackProvider(6),       // Web Archive recovery
    ].sort((a, b) => a.priority - b.priority);
  }

  public getProviders(): Provider[] {
    return this.providers;
  }

  public getHealthReport(): ProviderHealth[] {
    return this.providers.map((p) => p.getHealth());
  }

  /**
   * Reorder priority or filter active providers
   */
  public setPriorityOrder(providerIds: string[]) {
    providerIds.forEach((id, index) => {
      const p = this.providers.find((prov) => prov.id === id);
      if (p) p.priority = index + 1;
    });
    this.providers.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Generic fallback runner
   */
  private async executeFallback<T>(
    operationName: string,
    key: string,
    options: ProviderOptions | undefined,
    cacheKey: string,
    ttlSeconds: number,
    fn: (provider: Provider) => Promise<T>
  ): Promise<T> {
    // 1. Check cache first unless bypassCache is set
    if (!options?.bypassCache) {
      const cached = await cacheStore.get<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // 2. Coalesce concurrent requests for the exact same key
    return requestCoalescer.execute(cacheKey, async () => {
      await globalRateLimiter.acquire();

      const errors: { provider: string; error: string }[] = [];
      const availableProviders = this.providers.filter((p) => p.isAvailable(options));

      for (const provider of availableProviders) {
        try {
          const result = await fn(provider);

          // Save to cache for future requests
          await cacheStore.set(cacheKey, result, ttlSeconds);
          return result;
        } catch (err: any) {
          errors.push({
            provider: provider.name,
            error: err?.message || String(err),
          });
          // Fall through to next provider in priority order
        }
      }

      // If all live providers failed, attempt CacheFallback directly if not already tried
      const cacheFallback = this.providers.find((p) => p.id === 'cache-fallback');
      if (cacheFallback && !availableProviders.includes(cacheFallback)) {
        try {
          return await fn(cacheFallback);
        } catch {
          // ignore
        }
      }

      const summary = errors.map((e) => `[${e.provider}: ${e.error}]`).join(', ');
      throw new Error(`All providers failed for ${operationName} (${key}): ${summary}`);
    });
  }

  async getProfile(username: string, options?: ProviderOptions): Promise<User> {
    const cleanUser = username.replace(/^@/, '').trim().toLowerCase();
    const cacheKey = `profile:${cleanUser}`;
    return this.executeFallback(
      'getProfile',
      cleanUser,
      options,
      cacheKey,
      TTL.PROFILE,
      (p) => p.getProfile(cleanUser, options)
    );
  }

  async getTweet(id: string, options?: ProviderOptions): Promise<Tweet> {
    const cleanId = id.trim();
    const cacheKey = `tweet:${cleanId}`;
    return this.executeFallback(
      'getTweet',
      cleanId,
      options,
      cacheKey,
      TTL.TWEET,
      (p) => p.getTweet(cleanId, options)
    );
  }

  async getReplies(tweetId: string, options?: ProviderOptions): Promise<Thread> {
    const cleanId = tweetId.trim();
    const cacheKey = `thread:${cleanId}`;
    return this.executeFallback(
      'getReplies',
      cleanId,
      options,
      cacheKey,
      TTL.TWEET,
      (p) => p.getReplies(cleanId, options)
    );
  }

  async getTimeline(username: string, options?: ProviderOptions): Promise<TimelineResponse> {
    const cleanUser = username.replace(/^@/, '').trim().toLowerCase();
    const cursor = options?.cursor || 'initial';
    const cacheKey = `timeline:${cleanUser}:${cursor}`;
    return this.executeFallback(
      'getTimeline',
      cleanUser,
      options,
      cacheKey,
      TTL.TIMELINE,
      (p) => p.getTimeline(cleanUser, options)
    );
  }

  async search(query: string, options?: ProviderOptions): Promise<TimelineResponse> {
    const cleanQ = query.trim().toLowerCase();
    const cursor = options?.cursor || 'initial';
    const cacheKey = `search:${cleanQ}:${cursor}`;
    return this.executeFallback(
      'search',
      cleanQ,
      options,
      cacheKey,
      TTL.SEARCH,
      (p) => p.search(query, options)
    );
  }
}

export const providerRouter = new ProviderRouter();
