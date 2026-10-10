/**
 * Provider 4: Public Nitter Instances Pool
 * Rotates across a configurable list of active Nitter instances.
 * Parses RSS feeds and JSON/HTML endpoints.
 */

import { Provider } from './base.ts';
import { User, Tweet, Thread, TimelineResponse, ProviderOptions } from '../types.ts';

const DEFAULT_NITTER_INSTANCES = [
  'https://nitter.privacydev.net',
  'https://nitter.poast.org',
  'https://nitter.woodland.cafe',
  'https://nitter.x86-64-unknown-linux-gnu.zip',
  'https://nitter.freedit.eu',
];

export class NitterProvider extends Provider {
  public readonly id = 'nitter';
  public readonly name = 'Nitter Instances Pool';

  private instances: string[];
  private currentInstanceIndex = 0;

  constructor(priority = 4) {
    super(priority);
    const envInstances = process.env.NITTER_INSTANCES
      ? process.env.NITTER_INSTANCES.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    this.instances = envInstances.length > 0 ? envInstances : DEFAULT_NITTER_INSTANCES;
  }

  private getNextInstance(): string {
    const inst = this.instances[this.currentInstanceIndex % this.instances.length];
    this.currentInstanceIndex++;
    return inst.replace(/\/$/, '');
  }

  async getTweet(id: string, _options?: ProviderOptions): Promise<Tweet> {
    return this.executeWithMetrics(async () => {
      let lastErr: Error | null = null;
      // Try up to 3 instances
      for (let i = 0; i < Math.min(3, this.instances.length); i++) {
        const instance = this.getNextInstance();
        try {
          const res = await fetch(`${instance}/i/status/${id}`, {
            headers: {
              'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
            },
          });

          if (!res.ok) {
            throw new Error(`Nitter instance ${instance} returned HTTP ${res.status}`);
          }

          const html = await res.text();
          // Extract text and author from HTML
          const textMatch = html.match(/<div class="tweet-content[^"]*">([\s\S]*?)<\/div>/);
          const authorMatch = html.match(/<a class="username"[^>]*>@([^<]+)<\/a>/);
          const fullnameMatch = html.match(/<a class="fullname"[^>]*>([^<]+)<\/a>/);

          if (!textMatch) {
            throw new Error(`Could not parse tweet content from ${instance}`);
          }

          const rawText = textMatch[1].replace(/<[^>]+>/g, '').trim();
          const username = authorMatch ? authorMatch[1].trim() : 'anonymous';
          const name = fullnameMatch ? fullnameMatch[1].trim() : username;

          return {
            id,
            text: rawText,
            createdAt: new Date().toISOString(),
            author: {
              id: username,
              username,
              name,
              avatar: `${instance}/${username}/avatar`,
              bio: '',
              verified: false,
              protected: false,
              stats: { followers: 0, following: 0, tweets: 0 },
            },
            stats: { likes: 0, retweets: 0, replies: 0, quotes: 0 },
            providerSource: `${this.name} (${new URL(instance).hostname})`,
          };
        } catch (err: any) {
          lastErr = err;
        }
      }
      throw lastErr || new Error('All Nitter instances failed to fetch tweet');
    });
  }

  async getReplies(tweetId: string, options?: ProviderOptions): Promise<Thread> {
    return this.executeWithMetrics(async () => {
      const mainTweet = await this.getTweet(tweetId, options);
      return {
        mainTweet,
        ancestors: [],
        replies: [],
        providerSource: this.name,
      };
    });
  }

  async getProfile(username: string, _options?: ProviderOptions): Promise<User> {
    return this.executeWithMetrics(async () => {
      const instance = this.getNextInstance();
      const res = await fetch(`${instance}/${username}/rss`, {
        headers: { 'user-agent': 'Mozilla/5.0' },
      });

      if (!res.ok) {
        throw new Error(`Nitter profile RSS returned HTTP ${res.status}`);
      }

      const xml = await res.text();
      const titleMatch = xml.match(/<title>([^<]+)<\/title>/);
      const name = titleMatch ? titleMatch[1].replace(/\/[^/]*$/, '').trim() : username;

      return {
        id: username,
        username,
        name: name || username,
        avatar: `${instance}/${username}/avatar`,
        bio: '',
        verified: false,
        protected: false,
        stats: { followers: 0, following: 0, tweets: 0 },
      };
    });
  }

  async getTimeline(username: string, _options?: ProviderOptions): Promise<TimelineResponse> {
    return this.executeWithMetrics(async () => {
      const instance = this.getNextInstance();
      const res = await fetch(`${instance}/${username}/rss`, {
        headers: { 'user-agent': 'Mozilla/5.0' },
      });

      if (!res.ok) {
        throw new Error(`Nitter timeline RSS returned HTTP ${res.status}`);
      }

      const xml = await res.text();
      const tweets: Tweet[] = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;

      while ((match = itemRegex.exec(xml)) !== null && tweets.length < 25) {
        const item = match[1];
        const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
        const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
        const pubDateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);

        const url = linkMatch ? linkMatch[1].trim() : '';
        const id = url.split('/status/')[1]?.split('#')[0] || String(Date.now());
        const text = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
        const pubDate = pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString();

        tweets.push({
          id,
          text,
          createdAt: pubDate,
          author: {
            id: username,
            username,
            name: username,
            avatar: `${instance}/${username}/avatar`,
            bio: '',
            verified: false,
            protected: false,
            stats: { followers: 0, following: 0, tweets: 0 },
          },
          stats: { likes: 0, retweets: 0, replies: 0, quotes: 0 },
          providerSource: `${this.name} (${new URL(instance).hostname})`,
        });
      }

      if (tweets.length === 0) {
        throw new Error(`No tweets parsed from Nitter RSS for @${username}`);
      }

      return {
        tweets,
        hasMore: true,
        providerSource: this.name,
      };
    });
  }

  async search(query: string, _options?: ProviderOptions): Promise<TimelineResponse> {
    return this.executeWithMetrics(async () => {
      const instance = this.getNextInstance();
      const encoded = encodeURIComponent(query);
      const res = await fetch(`${instance}/search/rss?f=tweets&q=${encoded}`, {
        headers: { 'user-agent': 'Mozilla/5.0' },
      });

      if (!res.ok) {
        throw new Error(`Nitter search RSS returned HTTP ${res.status}`);
      }

      const xml = await res.text();
      const tweets: Tweet[] = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;

      while ((match = itemRegex.exec(xml)) !== null && tweets.length < 20) {
        const item = match[1];
        const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
        const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
        const authorMatch = item.match(/<dc:creator>@?([^<]+)<\/dc:creator>/);

        const url = linkMatch ? linkMatch[1].trim() : '';
        const id = url.split('/status/')[1]?.split('#')[0] || String(Date.now());
        const username = authorMatch ? authorMatch[1].trim() : 'anonymous';
        const text = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';

        tweets.push({
          id,
          text,
          createdAt: new Date().toISOString(),
          author: {
            id: username,
            username,
            name: username,
            avatar: `${instance}/${username}/avatar`,
            bio: '',
            verified: false,
            protected: false,
            stats: { followers: 0, following: 0, tweets: 0 },
          },
          stats: { likes: 0, retweets: 0, replies: 0, quotes: 0 },
          providerSource: `${this.name} (${new URL(instance).hostname})`,
        });
      }

      return {
        tweets,
        hasMore: false,
        providerSource: this.name,
      };
    });
  }
}
