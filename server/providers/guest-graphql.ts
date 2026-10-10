/**
 * Provider 1: Twitter Guest GraphQL API
 * Uses unauthenticated rotating guest tokens to query public GraphQL endpoints.
 */

import { Provider } from './base.ts';
import { User, Tweet, Thread, TimelineResponse, ProviderOptions } from '../types.ts';
import { normalizeGraphQLTweet } from '../normalizer.ts';

const TWITTER_BEARER = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF80IUq16cHjhLTvJu4FA33AGWWjCpTnA';

export class GuestGraphQLProvider extends Provider {
  public readonly id = 'guest-graphql';
  public readonly name = 'Guest GraphQL API';

  private guestToken: string | null = null;
  private guestTokenExpiry = 0;

  constructor(priority = 1) {
    super(priority);
  }

  private async getGuestToken(): Promise<string> {
    const now = Date.now();
    if (this.guestToken && now < this.guestTokenExpiry) {
      return this.guestToken;
    }

    const res = await fetch('https://api.twitter.com/1.1/guest/activate.json', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${TWITTER_BEARER}`,
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to activate guest token: HTTP ${res.status}`);
    }

    const data: any = await res.json();
    if (!data.guest_token) {
      throw new Error('No guest token returned in response');
    }

    this.guestToken = data.guest_token;
    // Guest tokens usually valid for 3 hours, refresh at 2.5 hours
    this.guestTokenExpiry = now + 2.5 * 60 * 60 * 1000;
    return this.guestToken!;
  }

  private async makeGraphQLRequest(url: string): Promise<any> {
    const token = await this.getGuestToken();
    const res = await fetch(url, {
      headers: {
        authorization: `Bearer ${TWITTER_BEARER}`,
        'x-guest-token': token,
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'x-twitter-active-user': 'yes',
        'x-twitter-client-language': 'en',
      },
    });

    if (res.status === 403 || res.status === 429) {
      // Invalidate guest token
      this.guestToken = null;
      throw new Error(`Guest GraphQL rate limited or forbidden: ${res.status}`);
    }

    if (!res.ok) {
      throw new Error(`Guest GraphQL request failed with HTTP ${res.status}`);
    }

    return res.json();
  }

  async getProfile(username: string, _options?: ProviderOptions): Promise<User> {
    return this.executeWithMetrics(async () => {
      const variables = encodeURIComponent(JSON.stringify({ screen_name: username, withSafetyModeUserFields: true }));
      const features = encodeURIComponent(JSON.stringify({
        hidden_profile_likes_enabled: true,
        hidden_profile_subscriptions_enabled: true,
        responsive_web_graphql_exclude_directive_enabled: true,
        verified_phone_label_enabled: false,
        highlights_tweets_tab_ui_enabled: true,
        creator_subscriptions_tweet_preview_api_enabled: true,
        responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
        responsive_web_graphql_timeline_navigation_enabled: true,
      }));

      const url = `https://api.twitter.com/graphql/sLVLhk0bGj3MVFEKTdax1w/UserByScreenName?variables=${variables}&features=${features}`;
      const data = await this.makeGraphQLRequest(url);
      const userResult = data.data?.user?.result;

      if (!userResult || userResult.__typename === 'UserUnavailable') {
        throw new Error(`User @${username} not found or suspended`);
      }

      const legacy = userResult.legacy || {};
      return {
        id: userResult.rest_id || username,
        username: legacy.screen_name || username,
        name: legacy.name || username,
        avatar: (legacy.profile_image_url_https || '').replace('_normal', '_400x400'),
        banner: legacy.profile_banner_url,
        bio: legacy.description || '',
        location: legacy.location || '',
        website: legacy.entities?.url?.urls?.[0]?.expanded_url,
        joined: legacy.created_at,
        verified: Boolean(legacy.verified || userResult.is_blue_verified),
        protected: Boolean(legacy.protected),
        stats: {
          followers: legacy.followers_count || 0,
          following: legacy.friends_count || 0,
          tweets: legacy.statuses_count || 0,
          media: legacy.media_count,
          likes: legacy.favourites_count,
        },
        pinnedTweetId: legacy.pinned_tweet_ids_str?.[0],
      };
    });
  }

  async getTweet(id: string, _options?: ProviderOptions): Promise<Tweet> {
    return this.executeWithMetrics(async () => {
      const variables = encodeURIComponent(JSON.stringify({
        focalTweetId: id,
        with_rux_injections: false,
        includePromotedContent: false,
        withCommunity: true,
        withQuickPromoteEligibilityTweetFields: true,
        withBirdwatchNotes: true,
        withVoice: true,
        withV2Timeline: true,
      }));
      const features = encodeURIComponent(JSON.stringify({
        responsive_web_graphql_exclude_directive_enabled: true,
        verified_phone_label_enabled: false,
        creator_subscriptions_tweet_preview_api_enabled: true,
        responsive_web_graphql_timeline_navigation_enabled: true,
        responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
        tweetypie_unmention_optimization_enabled: true,
        responsive_web_edit_tweet_api_enabled: true,
        graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
        view_counts_everywhere_api_enabled: true,
        longform_notetweets_consumption_enabled: true,
        responsive_web_twitter_article_tweet_consumption_enabled: true,
        tweet_awards_web_tipping_enabled: false,
        freedom_of_speech_not_reach_fetch_enabled: true,
        standardized_nudges_misinfo: true,
        tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
        rweb_video_timestamps_enabled: true,
        longform_notetweets_rich_text_read_enabled: true,
        longform_notetweets_inline_media_enabled: true,
        responsive_web_enhance_cards_enabled: false,
      }));

      const url = `https://api.twitter.com/graphql/L3O0iGvdcM9YhK6t-9QpPA/TweetDetail?variables=${variables}&features=${features}`;
      const data = await this.makeGraphQLRequest(url);

      const instructions = data.data?.threaded_conversation_with_injections_v2?.instructions || [];
      for (const inst of instructions) {
        if (inst.type === 'TimelineAddEntries') {
          for (const entry of inst.entries || []) {
            if (entry.entryId === `tweet-${id}`) {
              const tweet = normalizeGraphQLTweet(entry, this.name);
              if (tweet) return tweet;
            }
          }
        }
      }

      throw new Error(`Tweet ${id} not found in GraphQL response`);
    });
  }

  async getReplies(tweetId: string, options?: ProviderOptions): Promise<Thread> {
    return this.executeWithMetrics(async () => {
      const mainTweet = await this.getTweet(tweetId, options);
      // Construct thread object
      return {
        mainTweet,
        ancestors: [],
        replies: [],
        providerSource: this.name,
      };
    });
  }

  async getTimeline(username: string, _options?: ProviderOptions): Promise<TimelineResponse> {
    return this.executeWithMetrics(async () => {
      // First get profile to get rest_id
      const profile = await this.getProfile(username);
      const variables = encodeURIComponent(JSON.stringify({
        userId: profile.id,
        count: 20,
        includePromotedContent: false,
        withQuickPromoteEligibilityTweetFields: true,
        withVoice: true,
        withV2Timeline: true,
      }));
      const features = encodeURIComponent(JSON.stringify({
        responsive_web_graphql_exclude_directive_enabled: true,
        verified_phone_label_enabled: false,
        creator_subscriptions_tweet_preview_api_enabled: true,
        responsive_web_graphql_timeline_navigation_enabled: true,
        responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
        tweetypie_unmention_optimization_enabled: true,
        responsive_web_edit_tweet_api_enabled: true,
        graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
        view_counts_everywhere_api_enabled: true,
        longform_notetweets_consumption_enabled: true,
      }));

      const url = `https://api.twitter.com/graphql/WzIR1FdqwVuERvCX6xsDMA/UserTweets?variables=${variables}&features=${features}`;
      const data = await this.makeGraphQLRequest(url);

      const tweets: Tweet[] = [];
      const instructions = data.data?.user?.result?.timeline_v2?.timeline?.instructions || [];
      for (const inst of instructions) {
        if (inst.type === 'TimelineAddEntries') {
          for (const entry of inst.entries || []) {
            if (entry.entryId?.startsWith('tweet-')) {
              const tw = normalizeGraphQLTweet(entry, this.name);
              if (tw) tweets.push(tw);
            }
          }
        }
      }

      return {
        tweets,
        hasMore: tweets.length > 0,
        providerSource: this.name,
      };
    });
  }

  async search(query: string, _options?: ProviderOptions): Promise<TimelineResponse> {
    return this.executeWithMetrics(async () => {
      // Guest tokens have strict limitations on SearchTimeline
      throw new Error(`Guest GraphQL search requires full user credentials. Falling back.`);
    });
  }
}
