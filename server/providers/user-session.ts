/**
 * Provider 3: User Session (BYO Cookies)
 * Unlocks sensitive / age-gated tweets, full search, and user timelines.
 * Stored strictly on the client; passed in per-request headers and never persisted server-side.
 */

import { Provider } from './base.ts';
import { User, Tweet, Thread, TimelineResponse, ProviderOptions } from '../types.ts';
import { normalizeGraphQLTweet } from '../normalizer.ts';

const TWITTER_BEARER = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF80IUq16cHjhLTvJu4FA33AGWWjCpTnA';

export class UserSessionProvider extends Provider {
  public readonly id = 'user-session';
  public readonly name = 'BYO User Session';

  constructor(priority = 3) {
    super(priority);
  }

  public isAvailable(options?: ProviderOptions): boolean {
    const hasCookies = Boolean(options?.byoSession?.authToken && options?.byoSession?.ct0);
    return hasCookies && this.circuitBreaker.canExecute();
  }

  private getAuthHeaders(options?: ProviderOptions) {
    const authToken = options?.byoSession?.authToken;
    const ct0 = options?.byoSession?.ct0;

    if (!authToken || !ct0) {
      throw new Error('BYO user session credentials (auth_token & ct0) are required for this request');
    }

    return {
      authorization: `Bearer ${TWITTER_BEARER}`,
      cookie: `auth_token=${authToken}; ct0=${ct0}`,
      'x-csrf-token': ct0,
      'x-twitter-auth-type': 'OAuth2Session',
      'x-twitter-active-user': 'yes',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    };
  }

  async getProfile(username: string, options?: ProviderOptions): Promise<User> {
    return this.executeWithMetrics(async () => {
      const headers = this.getAuthHeaders(options);
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
      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error(`Authenticated UserByScreenName request returned HTTP ${res.status}`);
      }

      const data: any = await res.json();
      const userResult = data.data?.user?.result;
      if (!userResult || userResult.__typename === 'UserUnavailable') {
        throw new Error(`User @${username} not found`);
      }

      const legacy = userResult.legacy || {};
      return {
        id: userResult.rest_id,
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

  async getTweet(id: string, options?: ProviderOptions): Promise<Tweet> {
    return this.executeWithMetrics(async () => {
      const headers = this.getAuthHeaders(options);
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
      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error(`Authenticated TweetDetail request returned HTTP ${res.status}`);
      }

      const data: any = await res.json();
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

      throw new Error(`Tweet ${id} not found in authenticated response`);
    });
  }

  async getReplies(tweetId: string, options?: ProviderOptions): Promise<Thread> {
    return this.executeWithMetrics(async () => {
      const headers = this.getAuthHeaders(options);
      const variables = encodeURIComponent(JSON.stringify({
        focalTweetId: tweetId,
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
      }));

      const url = `https://api.twitter.com/graphql/L3O0iGvdcM9YhK6t-9QpPA/TweetDetail?variables=${variables}&features=${features}`;
      const res = await fetch(url, { headers });
      const data: any = await res.json();

      let mainTweet: Tweet | null = null;
      const ancestors: Tweet[] = [];
      const replies: Tweet[] = [];

      const instructions = data.data?.threaded_conversation_with_injections_v2?.instructions || [];
      for (const inst of instructions) {
        if (inst.type === 'TimelineAddEntries') {
          for (const entry of inst.entries || []) {
            if (entry.entryId === `tweet-${tweetId}`) {
              mainTweet = normalizeGraphQLTweet(entry, this.name);
            } else if (entry.entryId?.startsWith('tweet-')) {
              const tw = normalizeGraphQLTweet(entry, this.name);
              if (tw) {
                if (mainTweet) {
                  replies.push(tw);
                } else {
                  ancestors.push(tw);
                }
              }
            } else if (entry.entryId?.startsWith('conversationthread-')) {
              const items = entry.content?.items || [];
              for (const item of items) {
                const tw = normalizeGraphQLTweet(item.item, this.name);
                if (tw) {
                  if (tw.id === tweetId) {
                    mainTweet = tw;
                  } else {
                    replies.push(tw);
                  }
                }
              }
            }
          }
        }
      }

      if (!mainTweet) {
        throw new Error(`Conversation for tweet ${tweetId} could not be resolved`);
      }

      return {
        mainTweet,
        ancestors,
        replies,
        providerSource: this.name,
      };
    });
  }

  async getTimeline(username: string, options?: ProviderOptions): Promise<TimelineResponse> {
    return this.executeWithMetrics(async () => {
      const profile = await this.getProfile(username, options);
      const headers = this.getAuthHeaders(options);
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
        view_counts_everywhere_api_enabled: true,
        longform_notetweets_consumption_enabled: true,
      }));

      const url = `https://api.twitter.com/graphql/WzIR1FdqwVuERvCX6xsDMA/UserTweets?variables=${variables}&features=${features}`;
      const res = await fetch(url, { headers });
      const data: any = await res.json();

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

  async search(query: string, options?: ProviderOptions): Promise<TimelineResponse> {
    return this.executeWithMetrics(async () => {
      const headers = this.getAuthHeaders(options);
      const variables = encodeURIComponent(JSON.stringify({
        rawQuery: query,
        count: 20,
        querySource: 'typed_query',
        product: 'Top',
      }));
      const features = encodeURIComponent(JSON.stringify({
        responsive_web_graphql_exclude_directive_enabled: true,
        verified_phone_label_enabled: false,
        creator_subscriptions_tweet_preview_api_enabled: true,
        responsive_web_graphql_timeline_navigation_enabled: true,
        responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
        tweetypie_unmention_optimization_enabled: true,
        responsive_web_edit_tweet_api_enabled: true,
        view_counts_everywhere_api_enabled: true,
      }));

      const url = `https://api.twitter.com/graphql/gkjsKepM6gl_HmFWoWKfgg/SearchTimeline?variables=${variables}&features=${features}`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error(`Authenticated SearchTimeline returned HTTP ${res.status}`);
      }

      const data: any = await res.json();
      const tweets: Tweet[] = [];
      const instructions = data.data?.search_by_raw_query?.search_timeline?.timeline?.instructions || [];
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
}
