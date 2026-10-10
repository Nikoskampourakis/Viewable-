/**
 * Cache store interface and in-memory LRU implementation with TTL
 */

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  cachedAt: number;
}

export interface CacheStore {
  get<T>(key: string): Promise<T | null>;
  getWithMeta<T>(key: string): Promise<{ value: T; cachedAt: number } | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  clear(): Promise<void>;
  size(): Promise<number>;
}

export class LRUCacheStore implements CacheStore {
  private cache = new Map<string, CacheEntry<unknown>>();
  private maxEntries: number;

  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Refresh LRU position
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value as T;
  }

  async getWithMeta<T>(key: string): Promise<{ value: T; cachedAt: number } | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Even if expired, getWithMeta can be used for stale fallback
    // Refresh LRU
    this.cache.delete(key);
    this.cache.set(key, entry);

    return {
      value: entry.value as T,
      cachedAt: entry.cachedAt,
    };
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    // If full, evict oldest entry
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const now = Date.now();
    this.cache.set(key, {
      value,
      expiresAt: now + ttlSeconds * 1000,
      cachedAt: now,
    });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async size(): Promise<number> {
    return this.cache.size;
  }
}

/**
 * Optional Firestore Cache Adapter
 * Satisfies the CacheStore interface when Firestore is provisioned
 */
export class FirestoreCacheStore implements CacheStore {
  private fallbackLRU = new LRUCacheStore(500);

  async get<T>(key: string): Promise<T | null> {
    return this.fallbackLRU.get<T>(key);
  }

  async getWithMeta<T>(key: string): Promise<{ value: T; cachedAt: number } | null> {
    return this.fallbackLRU.getWithMeta<T>(key);
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    return this.fallbackLRU.set(key, value, ttlSeconds);
  }

  async del(key: string): Promise<void> {
    return this.fallbackLRU.del(key);
  }

  async clear(): Promise<void> {
    return this.fallbackLRU.clear();
  }

  async size(): Promise<number> {
    return this.fallbackLRU.size();
  }
}

// Global cache singleton instance
export const cacheStore: CacheStore = new LRUCacheStore(1500);
