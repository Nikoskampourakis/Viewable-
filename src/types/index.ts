export interface User {
  id: string;
  username: string;
  name: string;
  avatar: string;
  banner?: string;
  bio: string;
  location?: string;
  website?: string;
  joined?: string;
  verified: boolean;
  protected: boolean;
  stats: {
    followers: number;
    following: number;
    tweets: number;
    media?: number;
    likes?: number;
  };
  pinnedTweetId?: string;
}

export interface MediaVariant {
  bitrate?: number;
  contentType: string;
  url: string;
}

export interface Media {
  type: 'photo' | 'video' | 'animated_gif';
  url: string;
  previewUrl?: string;
  originalUrl: string;
  width?: number;
  height?: number;
  alt?: string;
  durationMs?: number;
  variants?: MediaVariant[];
}

export interface PollOption {
  label: string;
  votes: number;
  percent: number;
}

export interface Poll {
  id: string;
  options: PollOption[];
  totalVotes: number;
  endsAt?: string;
  isClosed: boolean;
}

export interface CommunityNote {
  id: string;
  text: string;
  status: 'CURRENTLY_RATED_HELPFUL' | 'NEEDS_MORE_RATINGS' | 'NOT_HELPFUL';
  sources: string[];
  createdAt?: string;
}

export interface TweetStats {
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
  views?: number;
  bookmarks?: number;
}

export interface TweetCard {
  title?: string;
  description?: string;
  url: string;
  imageUrl?: string;
  domain?: string;
}

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

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  summary: string;
  source: string;
  publishedAt: string;
  clusterId?: string;
}

export interface NewsTopicCluster {
  id: string;
  topic: string;
  articleCount: number;
  sources: string[];
  articles: NewsItem[];
  leadArticle: NewsItem;
}

export type ViewType =
  | 'for-you'
  | 'following'
  | 'explore'
  | 'notifications'
  | 'news'
  | 'profile'
  | 'tweet'
  | 'health'
  | 'bookmarks'
  | 'article-view';

export type ThemeType = 'dark' | 'dim' | 'light';
export type AccentColor = 'blue' | 'yellow' | 'pink' | 'purple' | 'orange' | 'green';
export type FontSize = 'small' | 'medium' | 'large';
export type Density = 'comfortable' | 'compact';

export interface AppSettings {
  theme: ThemeType;
  accent: AccentColor;
  fontSize: FontSize;
  density: Density;
  blurSensitive: boolean;
  ageVerified18Plus: boolean;
  mutedWords: string[];
  byoCookies: {
    authToken: string;
    ct0: string;
  };
  rankingWeights: {
    recency: number;
    affinity: number;
    velocity: number;
    diversity: number;
    repetition: number;
  };
  customFeeds: string[];
  watchlist: {
    accounts: string[];
    keywords: string[];
  };
  quietHours: {
    enabled: boolean;
    start: number;
    end: number;
  };
  encryptionKey?: string;
}

export interface NotificationItem {
  id: string;
  type: 'account' | 'keyword' | 'system';
  title: string;
  body: string;
  tweetId?: string;
  username?: string;
  timestamp: string;
  read: boolean;
}
