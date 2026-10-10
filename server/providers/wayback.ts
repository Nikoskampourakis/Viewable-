/**
 * Provider 6: Wayback Machine / Archive.org
 * Resolves deleted or removed tweets by querying the Internet Archive Wayback Machine.
 */

import { Provider } from './base.ts';
import { User, Tweet, Thread, TimelineResponse, ProviderOptions } from '../types.ts';

export class WaybackProvider extends Provider {
  public readonly id = 'wayback';
  public readonly name = 'Wayback Machine Archive';

  constructor(priority = 6) {
    super(priority);
  }

  async getTweet(id: string, _options?: ProviderOptions): Promise<Tweet> {
    return this.executeWithMetrics(async () => {
      const targetUrl = `https://twitter.com/x/status/${id}`;
      const apiUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(targetUrl)}`;

      const res = await fetch(apiUrl, {
        headers: { 'user-agent': 'Mozilla/5.0 ViewableBot/1.0' },
      });

      if (!res.ok) {
        throw new Error(`Wayback API request returned HTTP ${res.status}`);
      }

      const data: any = await res.json();
      const snapshot = data.archived_snapshots?.closest;

      if (!snapshot || !snapshot.available || !snapshot.url) {
        throw new Error(`Tweet ${id} has no archived snapshots on Wayback Machine`);
      }

      // Fetch snapshot content
      const snapshotRes = await fetch(snapshot.url, {
        headers: { 'user-agent': 'Mozilla/5.0 ViewableBot/1.0' },
      });

      if (!snapshotRes.ok) {
        throw new Error(`Failed to retrieve Wayback snapshot content`);
      }

      const html = await snapshotRes.text();
      // Parse tweet text and metadata from archived HTML
      const textMatch = html.match(/<div class="tweet-text[^"]*">([\s\S]*?)<\/div>/i) ||
                        html.match(/<p class="TweetTextSize[^"]*">([\s\S]*?)<\/p>/i);
      const userMatch = html.match(/data-screen-name="([^"]+)"/i) ||
                        html.match(/<span class="username[^"]*">@?([^<]+)<\/span>/i);

      const username = userMatch ? userMatch[1].replace('@', '').trim() : 'archived_user';
      const tweetText = textMatch
        ? textMatch[1].replace(/<[^>]+>/g, '').trim()
        : `Archived post recovered from Wayback snapshot (${snapshot.timestamp})`;

      return {
        id,
        text: tweetText,
        createdAt: snapshot.timestamp ? `${snapshot.timestamp.slice(0, 4)}-${snapshot.timestamp.slice(4, 6)}-${snapshot.timestamp.slice(6, 8)}T00:00:00Z` : new Date().toISOString(),
        author: {
          id: username,
          username,
          name: username,
          avatar: '',
          bio: '',
          verified: false,
          protected: false,
          stats: { followers: 0, following: 0, tweets: 0 },
        },
        stats: { likes: 0, retweets: 0, replies: 0, quotes: 0 },
        providerSource: `${this.name} (${snapshot.timestamp})`,
      };
    });
  }

  async getReplies(tweetId: string, options?: ProviderOptions): Promise<Thread> {
    const mainTweet = await this.getTweet(tweetId, options);
    return {
      mainTweet,
      ancestors: [],
      replies: [],
      providerSource: this.name,
    };
  }

  async getProfile(username: string, _options?: ProviderOptions): Promise<User> {
    throw new Error(`Wayback Machine does not support real-time profile lookup for @${username}`);
  }

  async getTimeline(username: string, _options?: ProviderOptions): Promise<TimelineResponse> {
    throw new Error(`Wayback Machine does not support live timeline retrieval for @${username}`);
  }

  async search(_query: string, _options?: ProviderOptions): Promise<TimelineResponse> {
    throw new Error('Search is not supported by Wayback Machine provider');
  }
}
