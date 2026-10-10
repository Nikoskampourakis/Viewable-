/**
 * Provider 5: Cache Fallback Layer
 * Returns previously cached representations when upstream providers fail or rate-limit.
 * Sets isFromCache: true and cachedAt timestamp.
 */

import { Provider } from './base.ts';
import { cacheStore } from '../cache.ts';
import { User, Tweet, Thread, TimelineResponse, ProviderOptions } from '../types.ts';

export class CacheFallbackProvider extends Provider {
  public readonly id = 'cache-fallback';
  public readonly name = 'Cache Layer (Failsafe)';

  constructor(priority = 5) {
    super(priority);
  }

  async getProfile(username: string, _options?: ProviderOptions): Promise<User> {
    return this.executeWithMetrics(async () => {
      const entry = await cacheStore.getWithMeta<User>(`profile:${username.toLowerCase()}`);
      if (!entry) {
        throw new Error(`Profile @${username} not found in local cache`);
      }
      return entry.value;
    });
  }

  async getTweet(id: string, _options?: ProviderOptions): Promise<Tweet> {
    return this.executeWithMetrics(async () => {
      const entry = await cacheStore.getWithMeta<Tweet>(`tweet:${id}`);
      if (!entry) {
        throw new Error(`Tweet ${id} not found in local cache`);
      }
      return {
        ...entry.value,
        isFromCache: true,
        cachedAt: new Date(entry.cachedAt).toISOString(),
        providerSource: this.name,
      };
    });
  }

  async getReplies(tweetId: string, _options?: ProviderOptions): Promise<Thread> {
    return this.executeWithMetrics(async () => {
      const entry = await cacheStore.getWithMeta<Thread>(`thread:${tweetId}`);
      if (!entry) {
        // Try fallback to single tweet in cache
        const single = await this.getTweet(tweetId);
        return {
          mainTweet: single,
          ancestors: [],
          replies: [],
          isFromCache: true,
          cachedAt: single.cachedAt,
          providerSource: this.name,
        };
      }
      return {
        ...entry.value,
        isFromCache: true,
        cachedAt: new Date(entry.cachedAt).toISOString(),
        providerSource: this.name,
      };
    });
  }

  async getTimeline(username: string, _options?: ProviderOptions): Promise<TimelineResponse> {
    return this.executeWithMetrics(async () => {
      const entry = await cacheStore.getWithMeta<TimelineResponse>(`timeline:${username.toLowerCase()}`);
      if (!entry) {
        throw new Error(`Timeline for @${username} not found in local cache`);
      }
      return {
        ...entry.value,
        isFromCache: true,
        cachedAt: new Date(entry.cachedAt).toISOString(),
        providerSource: this.name,
      };
    });
  }

  async search(query: string, _options?: ProviderOptions): Promise<TimelineResponse> {
    return this.executeWithMetrics(async () => {
      const entry = await cacheStore.getWithMeta<TimelineResponse>(`search:${query.toLowerCase()}`);
      if (!entry) {
        throw new Error(`Search results for "${query}" not found in local cache`);
      }
      return {
        ...entry.value,
        isFromCache: true,
        cachedAt: new Date(entry.cachedAt).toISOString(),
        providerSource: this.name,
      };
    });
  }
}
