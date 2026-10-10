/**
 * Provider 2: Twitter Syndication / Embed API
 * High-speed unauthenticated CDN embed endpoint with full media, community notes, and polls support.
 */

import { Provider } from './base.ts';
import { User, Tweet, Thread, TimelineResponse, ProviderOptions } from '../types.ts';
import { normalizeSyndicationTweet } from '../normalizer.ts';

export class SyndicationProvider extends Provider {
  public readonly id = 'syndication';
  public readonly name = 'Twitter Syndication';

  constructor(priority = 2) {
    super(priority);
  }

  // Token generator used by Twitter syndication widget
  private getSyndicationToken(id: string): string {
    const num = (Number(id) / 1e15) * Math.PI;
    return num.toString(36).replace(/(0+|\.)/g, '');
  }

  async getTweet(id: string, _options?: ProviderOptions): Promise<Tweet> {
    return this.executeWithMetrics(async () => {
      const token = this.getSyndicationToken(id);
      const url = `https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=${token}`;

      const res = await fetch(url, {
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'origin': 'https://platform.twitter.com',
          'referer': 'https://platform.twitter.com/',
        },
      });

      if (res.status === 404) {
        throw new Error(`Tweet ${id} not found or deleted on Syndication CDN`);
      }

      if (!res.ok) {
        throw new Error(`Syndication request returned HTTP ${res.status}`);
      }

      const data = await res.json();
      if (!data || !data.id_str) {
        throw new Error(`Empty tweet object received from Syndication API`);
      }

      return normalizeSyndicationTweet(data, this.name);
    });
  }

  async getReplies(tweetId: string, options?: ProviderOptions): Promise<Thread> {
    return this.executeWithMetrics(async () => {
      const mainTweet = await this.getTweet(tweetId, options);
      const ancestors: Tweet[] = [];

      // Walk up the parent chain if in_reply_to_status_id is available
      let currentParentId = mainTweet.replyToTweetId;
      let depth = 0;
      while (currentParentId && depth < 4) {
        try {
          const parentTweet = await this.getTweet(currentParentId, options);
          ancestors.unshift(parentTweet);
          currentParentId = parentTweet.replyToTweetId;
          depth++;
        } catch {
          break;
        }
      }

      return {
        mainTweet,
        ancestors,
        replies: [],
        providerSource: this.name,
      };
    });
  }

  async getProfile(username: string, _options?: ProviderOptions): Promise<User> {
    return this.executeWithMetrics(async () => {
      // Syndication timeline HTML scraper for profile header
      const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${username}`;
      const res = await fetch(url, {
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
      });

      if (!res.ok) {
        throw new Error(`Syndication profile query returned HTTP ${res.status}`);
      }

      const html = await res.text();
      // Extract data from NEXT_DATA json or meta tags
      const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
      if (match) {
        try {
          const json = JSON.parse(match[1]);
          const userObj = json.props?.pageProps?.timeline?.user || json.props?.pageProps?.user;
          if (userObj) {
            return {
              id: userObj.id_str || username,
              username: userObj.screen_name || username,
              name: userObj.name || username,
              avatar: (userObj.profile_image_url_https || '').replace('_normal', '_400x400'),
              banner: userObj.profile_banner_url,
              bio: userObj.description || '',
              location: userObj.location,
              joined: userObj.created_at,
              verified: Boolean(userObj.verified),
              protected: false,
              stats: {
                followers: userObj.followers_count || 0,
                following: userObj.friends_count || 0,
                tweets: userObj.statuses_count || 0,
              },
            };
          }
        } catch {
          // Fall through
        }
      }

      throw new Error(`Could not parse profile for @${username} via Syndication`);
    });
  }

  async getTimeline(username: string, _options?: ProviderOptions): Promise<TimelineResponse> {
    return this.executeWithMetrics(async () => {
      const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${username}`;
      const res = await fetch(url, {
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
      });

      if (!res.ok) {
        throw new Error(`Syndication timeline query returned HTTP ${res.status}`);
      }

      const html = await res.text();
      const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
      const tweets: Tweet[] = [];

      if (match) {
        try {
          const json = JSON.parse(match[1]);
          const entries = json.props?.pageProps?.timeline?.entries || [];
          for (const item of entries) {
            if (item.content?.tweet) {
              tweets.push(normalizeSyndicationTweet(item.content.tweet, this.name));
            }
          }
        } catch {
          // Ignore
        }
      }

      if (tweets.length === 0) {
        throw new Error(`No tweets found in Syndication timeline for @${username}`);
      }

      return {
        tweets,
        hasMore: true,
        providerSource: this.name,
      };
    });
  }

  async search(_query: string, _options?: ProviderOptions): Promise<TimelineResponse> {
    throw new Error('Search is not supported on Twitter Syndication CDN');
  }
}
