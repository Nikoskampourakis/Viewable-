/**
 * Response Normalizer
 * Standardizes raw responses from Twitter Guest GraphQL, Syndication Embed, Nitter, and Wayback
 * into Viewable's canonical types (User, Tweet, Media, Poll, CommunityNote).
 */

import { Tweet, User, Media, Poll, CommunityNote, TweetCard } from './types.ts';

// Strip tracking query parameters from URLs
export function cleanUrl(url?: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const trackingParams = ['s', 't', 'ref_src', 'twclid', 'fbclid', 'gclid', 'utm_source', 'utm_medium', 'utm_campaign'];
    trackingParams.forEach((p) => parsed.searchParams.delete(p));
    return parsed.toString();
  } catch {
    return url;
  }
}

// Strip trailing t.co short links from tweet text if they represent media or quote
export function cleanTweetText(text: string): string {
  if (!text) return '';
  // Decode HTML entities
  const decoded = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return decoded;
}

/**
 * Normalizes Twitter Syndication / Tweet-Result JSON API
 */
export function normalizeSyndicationTweet(raw: any, sourceName = 'Syndication'): Tweet {
  const author: User = {
    id: raw.user?.id_str || String(raw.user?.id || 'unknown'),
    username: raw.user?.screen_name || 'anonymous',
    name: raw.user?.name || 'User',
    avatar: raw.user?.profile_image_url_https?.replace('_normal', '_400x400') || '',
    verified: Boolean(raw.user?.verified || raw.user?.is_blue_verified),
    protected: Boolean(raw.user?.protected),
    bio: raw.user?.description || '',
    stats: {
      followers: raw.user?.followers_count || 0,
      following: raw.user?.friends_count || 0,
      tweets: raw.user?.statuses_count || 0,
    },
  };

  const mediaList: Media[] = [];

  // Parse photos and videos
  if (Array.isArray(raw.photos)) {
    for (const p of raw.photos) {
      mediaList.push({
        type: 'photo',
        url: cleanUrl(p.url),
        originalUrl: cleanUrl(p.url),
        width: p.width,
        height: p.height,
        alt: p.altText || '',
      });
    }
  }

  if (raw.video) {
    const variants = (raw.video.variants || []).map((v: any) => ({
      bitrate: v.bitrate,
      contentType: v.type || v.content_type || 'video/mp4',
      url: cleanUrl(v.src || v.url),
    }));

    // Find highest bitrate variant
    const bestVariant = variants.slice().sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];

    mediaList.push({
      type: raw.video.type === 'animated_gif' ? 'animated_gif' : 'video',
      url: bestVariant?.url || raw.video.poster,
      originalUrl: bestVariant?.url || raw.video.poster,
      previewUrl: raw.video.poster,
      variants,
    });
  }

  // Parse Poll
  let poll: Poll | undefined;
  if (raw.card?.binding_values?.choice1_label) {
    const bv = raw.card.binding_values;
    const options = [];
    let idx = 1;
    let totalVotes = 0;
    while (bv[`choice${idx}_label`]) {
      const label = bv[`choice${idx}_label`]?.string_value || `Option ${idx}`;
      const countStr = bv[`choice${idx}_count`]?.string_value || '0';
      const votes = parseInt(countStr, 10) || 0;
      totalVotes += votes;
      options.push({ label, votes, percent: 0 });
      idx++;
    }
    options.forEach((opt) => {
      opt.percent = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
    });
    poll = {
      id: raw.id_str || String(raw.id),
      options,
      totalVotes,
      isClosed: bv.counts_are_final?.boolean_value ?? true,
    };
  }

  // Parse Community Note
  let communityNote: CommunityNote | undefined;
  if (raw.birdwatch_pivot || raw.community_note) {
    const cn = raw.birdwatch_pivot || raw.community_note;
    communityNote = {
      id: `cn-${raw.id_str || raw.id}`,
      text: cn.subtitle?.text || cn.text || 'Readers added context they thought people might want to know.',
      status: 'CURRENTLY_RATED_HELPFUL',
      sources: cn.sources || [],
    };
  }

  // Quoted tweet
  let quotedTweet: Tweet | undefined;
  if (raw.quoted_tweet) {
    quotedTweet = normalizeSyndicationTweet(raw.quoted_tweet, sourceName);
  }

  // Card / Link preview
  let card: TweetCard | undefined;
  if (raw.card && raw.card.name !== 'poll2choice_text_only' && !raw.card.name?.startsWith('poll')) {
    const values = raw.card.binding_values || {};
    card = {
      title: values.title?.string_value,
      description: values.description?.string_value,
      url: values.card_url?.string_value || cleanUrl(raw.card.url),
      imageUrl: values.thumbnail_image_original?.image_value?.url || values.player_image_original?.image_value?.url,
      domain: values.vanity_url?.string_value,
    };
  }

  return {
    id: raw.id_str || String(raw.id),
    text: cleanTweetText(raw.text || ''),
    createdAt: raw.created_at || new Date().toISOString(),
    author,
    media: mediaList.length > 0 ? mediaList : undefined,
    poll,
    card,
    quotedTweet,
    replyToTweetId: raw.in_reply_to_status_id_str,
    replyToUsername: raw.in_reply_to_screen_name,
    conversationId: raw.conversation_id_str || raw.id_str,
    stats: {
      likes: raw.favorite_count || 0,
      retweets: raw.retweet_count || 0,
      replies: raw.reply_count || 0,
      quotes: raw.quote_count || 0,
      views: raw.views?.count ? parseInt(raw.views.count, 10) : undefined,
    },
    language: raw.lang,
    isSensitive: Boolean(raw.possibly_sensitive),
    communityNote,
    editHistory: raw.edit_control?.edit_tweet_ids,
    providerSource: sourceName,
  };
}

/**
 * Normalizes Twitter GraphQL Tweet Entry
 */
export function normalizeGraphQLTweet(entry: any, sourceName = 'GraphQL'): Tweet | null {
  const result = entry?.tweet || entry?.content?.itemContent?.tweet_results?.result || entry?.result;
  if (!result || result.__typename === 'TweetTombstone') return null;

  const legacy = result.legacy || result.tweet?.legacy;
  if (!legacy) return null;

  const coreUser = result.core?.user_results?.result || result.tweet?.core?.user_results?.result;
  const userLegacy = coreUser?.legacy || {};

  const author: User = {
    id: coreUser?.rest_id || legacy.user_id_str || 'unknown',
    username: userLegacy.screen_name || 'unknown',
    name: userLegacy.name || 'Anonymous',
    avatar: cleanUrl(userLegacy.profile_image_url_https?.replace('_normal', '_400x400')),
    banner: cleanUrl(userLegacy.profile_banner_url),
    bio: userLegacy.description || '',
    location: userLegacy.location || '',
    website: userLegacy.entities?.url?.urls?.[0]?.expanded_url,
    joined: userLegacy.created_at,
    verified: Boolean(userLegacy.verified || coreUser?.is_blue_verified),
    protected: Boolean(userLegacy.protected),
    stats: {
      followers: userLegacy.followers_count || 0,
      following: userLegacy.friends_count || 0,
      tweets: userLegacy.statuses_count || 0,
      media: userLegacy.media_count,
      likes: userLegacy.favourites_count,
    },
    pinnedTweetId: userLegacy.pinned_tweet_ids_str?.[0],
  };

  const mediaList: Media[] = [];
  const extendedEntitiesMedia = legacy.extended_entities?.media || legacy.entities?.media || [];
  for (const m of extendedEntitiesMedia) {
    if (m.type === 'video' || m.type === 'animated_gif') {
      const variants = (m.video_info?.variants || []).map((v: any) => ({
        bitrate: v.bitrate,
        contentType: v.content_type,
        url: cleanUrl(v.url),
      }));
      const best = variants.slice().sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
      mediaList.push({
        type: m.type,
        url: best?.url || cleanUrl(m.media_url_https),
        originalUrl: best?.url || cleanUrl(m.media_url_https),
        previewUrl: cleanUrl(m.media_url_https),
        width: m.original_info?.width,
        height: m.original_info?.height,
        durationMs: m.video_info?.duration_millis,
        variants,
      });
    } else {
      mediaList.push({
        type: 'photo',
        url: cleanUrl(m.media_url_https),
        originalUrl: cleanUrl(m.media_url_https),
        width: m.original_info?.width,
        height: m.original_info?.height,
        alt: m.ext_alt_text || '',
      });
    }
  }

  // Quoted tweet
  let quotedTweet: Tweet | undefined;
  if (result.quoted_status_result?.result) {
    const q = normalizeGraphQLTweet(result.quoted_status_result.result, sourceName);
    if (q) quotedTweet = q;
  }

  // Community note
  let communityNote: CommunityNote | undefined;
  if (result.birdwatch_pivot) {
    communityNote = {
      id: `cn-${legacy.id_str}`,
      text: result.birdwatch_pivot.subtitle?.text || 'Readers added context to this post.',
      status: 'CURRENTLY_RATED_HELPFUL',
      sources: [],
    };
  }

  return {
    id: legacy.id_str,
    text: cleanTweetText(legacy.full_text || legacy.text || ''),
    createdAt: legacy.created_at,
    author,
    media: mediaList.length > 0 ? mediaList : undefined,
    quotedTweet,
    replyToTweetId: legacy.in_reply_to_status_id_str,
    replyToUsername: legacy.in_reply_to_screen_name,
    conversationId: legacy.conversation_id_str,
    stats: {
      likes: legacy.favorite_count || 0,
      retweets: legacy.retweet_count || 0,
      replies: legacy.reply_count || 0,
      quotes: legacy.quote_count || 0,
      views: result.views?.count ? parseInt(result.views.count, 10) : undefined,
      bookmarks: legacy.bookmark_count,
    },
    language: legacy.lang,
    isSensitive: Boolean(legacy.possibly_sensitive),
    communityNote,
    editHistory: result.edit_control?.edit_tweet_ids,
    providerSource: sourceName,
  };
}
