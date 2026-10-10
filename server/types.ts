import { z } from 'zod';

export const MediaVariantSchema = z.object({
  bitrate: z.number().optional(),
  contentType: z.string(),
  url: z.string(),
});
export type MediaVariant = z.infer<typeof MediaVariantSchema>;

export const MediaSchema = z.object({
  type: z.enum(['photo', 'video', 'animated_gif']),
  url: z.string(),
  previewUrl: z.string().optional(),
  originalUrl: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  alt: z.string().optional(),
  durationMs: z.number().optional(),
  variants: z.array(MediaVariantSchema).optional(),
});
export type Media = z.infer<typeof MediaSchema>;

export const PollOptionSchema = z.object({
  label: z.string(),
  votes: z.number().default(0),
  percent: z.number().default(0),
});
export type PollOption = z.infer<typeof PollOptionSchema>;

export const PollSchema = z.object({
  id: z.string(),
  options: z.array(PollOptionSchema),
  totalVotes: z.number().default(0),
  endsAt: z.string().optional(),
  isClosed: z.boolean().default(false),
});
export type Poll = z.infer<typeof PollSchema>;

export const CommunityNoteSchema = z.object({
  id: z.string(),
  text: z.string(),
  status: z.enum(['CURRENTLY_RATED_HELPFUL', 'NEEDS_MORE_RATINGS', 'NOT_HELPFUL']).default('CURRENTLY_RATED_HELPFUL'),
  sources: z.array(z.string()).default([]),
  createdAt: z.string().optional(),
});
export type CommunityNote = z.infer<typeof CommunityNoteSchema>;

export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string(),
  avatar: z.string(),
  banner: z.string().optional(),
  bio: z.string().default(''),
  location: z.string().optional(),
  website: z.string().optional(),
  joined: z.string().optional(),
  verified: z.boolean().default(false),
  protected: z.boolean().default(false),
  stats: z.object({
    followers: z.number().default(0),
    following: z.number().default(0),
    tweets: z.number().default(0),
    media: z.number().optional(),
    likes: z.number().optional(),
  }),
  pinnedTweetId: z.string().optional(),
});
export type User = z.infer<typeof UserSchema>;

export const TweetStatsSchema = z.object({
  likes: z.number().default(0),
  retweets: z.number().default(0),
  replies: z.number().default(0),
  quotes: z.number().default(0),
  views: z.number().optional(),
  bookmarks: z.number().optional(),
});
export type TweetStats = z.infer<typeof TweetStatsSchema>;

export const TweetCardSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  url: z.string(),
  imageUrl: z.string().optional(),
  domain: z.string().optional(),
});
export type TweetCard = z.infer<typeof TweetCardSchema>;

export interface Tweet {
  id: string;
  text: string;
  createdAt: string;
  author: User;
  media?: Media[];
  poll?: Poll;
  card?: TweetCard;
  replyToTweetId?: string;
  replyToUsername?: string;
  conversationId?: string;
  quotedTweet?: Tweet;
  retweetedTweet?: Tweet;
  stats: TweetStats;
  language?: string;
  isSensitive?: boolean;
  communityNote?: CommunityNote;
  editHistory?: string[];
  providerSource: string;
  isFromCache?: boolean;
  cachedAt?: string;
}

export const TweetSchema: z.ZodType<Tweet> = z.lazy(() =>
  z.object({
    id: z.string(),
    text: z.string(),
    createdAt: z.string(),
    author: UserSchema,
    media: z.array(MediaSchema).optional(),
    poll: PollSchema.optional(),
    card: TweetCardSchema.optional(),
    replyToTweetId: z.string().optional(),
    replyToUsername: z.string().optional(),
    conversationId: z.string().optional(),
    quotedTweet: TweetSchema.optional(),
    retweetedTweet: TweetSchema.optional(),
    stats: TweetStatsSchema,
    language: z.string().optional(),
    isSensitive: z.boolean().optional(),
    communityNote: CommunityNoteSchema.optional(),
    editHistory: z.array(z.string()).optional(),
    providerSource: z.string(),
    isFromCache: z.boolean().optional(),
    cachedAt: z.string().optional(),
  })
);

export interface Thread {
  mainTweet: Tweet;
  ancestors: Tweet[];
  replies: Tweet[];
  providerSource: string;
  isFromCache?: boolean;
  cachedAt?: string;
}

export interface TimelineResponse {
  tweets: Tweet[];
  nextCursor?: string;
  hasMore: boolean;
  providerSource: string;
  isFromCache?: boolean;
  cachedAt?: string;
}

export interface ProviderHealth {
  id: string;
  name: string;
  priority: number;
  status: 'operational' | 'degraded' | 'down';
  latencyMs: number;
  successRate: number;
  totalRequests: number;
  lastCheck: string;
  circuitState: 'closed' | 'open' | 'half-open';
  errorCount: number;
  lastError?: string;
}

export interface ProviderOptions {
  byoSession?: {
    authToken?: string;
    ct0?: string;
  };
  cursor?: string;
  limit?: number;
  bypassCache?: boolean;
}
