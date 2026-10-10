/**
 * Viewable Global Application Context
 * Handles on-device ranking, settings persistence, panic wipe, navigation,
 * bookmarks, interactions, and media lightbox state.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppSettings, ViewType, Tweet, Media, NotificationItem } from '../types/index.ts';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  accent: 'blue',
  fontSize: 'medium',
  density: 'comfortable',
  blurSensitive: true,
  ageVerified18Plus: false,
  mutedWords: [],
  byoCookies: { authToken: '', ct0: '' },
  rankingWeights: {
    recency: 0.35,
    affinity: 0.30,
    velocity: 0.20,
    diversity: 0.15,
    repetition: 0.25,
  },
  customFeeds: [],
  watchlist: { accounts: [], keywords: [] },
  quietHours: { enabled: false, start: 22, end: 8 },
};

interface AppContextType {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  activeView: ViewType;
  selectedTweetId: string | null;
  selectedUsername: string | null;
  searchQuery: string;
  bookmarks: Tweet[];
  likedTweetIds: Set<string>;
  retweetedTweetIds: Set<string>;
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  isComposeOpen: boolean;
  setIsComposeOpen: (open: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  isPanicModalOpen: boolean;
  setIsPanicModalOpen: (open: boolean) => void;
  activeLightbox: { media: Media[]; initialIndex: number } | null;
  openLightbox: (media: Media[], initialIndex?: number) => void;
  closeLightbox: () => void;
  navigate: (view: ViewType, params?: { tweetId?: string; username?: string; query?: string }) => void;
  toggleBookmark: (tweet: Tweet) => void;
  isBookmarked: (id: string) => boolean;
  toggleLike: (tweetId: string) => void;
  toggleRetweet: (tweetId: string) => void;
  panicWipe: () => Promise<void>;
  markNotificationsAsRead: () => void;
  addNotification: (item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => void;
  scoreTweet: (tweet: Tweet) => { score: number; factors: Record<string, number> };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load settings from localStorage
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem('viewable_settings');
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [activeView, setActiveView] = useState<ViewType>('for-you');
  const [selectedTweetId, setSelectedTweetId] = useState<string | null>(null);
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [bookmarks, setBookmarks] = useState<Tweet[]>(() => {
    try {
      const stored = localStorage.getItem('viewable_bookmarks');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [likedTweetIds, setLikedTweetIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('viewable_likes');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [retweetedTweetIds, setRetweetedTweetIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('viewable_retweets');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const stored = localStorage.getItem('viewable_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPanicModalOpen, setIsPanicModalOpen] = useState(false);
  const [activeLightbox, setActiveLightbox] = useState<{ media: Media[]; initialIndex: number } | null>(null);

  // Sync settings to localStorage and document classes
  useEffect(() => {
    try {
      localStorage.setItem('viewable_settings', JSON.stringify(settings));
    } catch {
      // Ignore
    }

    // Apply theme classes to body
    const body = document.body;
    body.classList.remove('theme-dark', 'theme-dim', 'theme-light');
    if (settings.theme === 'dim') {
      body.classList.add('theme-dim');
      body.style.backgroundColor = '#15202b';
      body.style.color = '#f7f9f9';
    } else if (settings.theme === 'light') {
      body.classList.add('theme-light');
      body.style.backgroundColor = '#ffffff';
      body.style.color = '#0f1419';
    } else {
      body.classList.add('theme-dark');
      body.style.backgroundColor = '#000000';
      body.style.color = '#ffffff';
    }

    // Apply font-size
    if (settings.fontSize === 'small') {
      document.documentElement.style.fontSize = '14px';
    } else if (settings.fontSize === 'large') {
      document.documentElement.style.fontSize = '18px';
    } else {
      document.documentElement.style.fontSize = '16px';
    }
  }, [settings]);

  const updateSettings = (partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const navigate = (view: ViewType, params?: { tweetId?: string; username?: string; query?: string }) => {
    setActiveView(view);
    if (params?.tweetId) setSelectedTweetId(params.tweetId);
    if (params?.username) setSelectedUsername(params.username);
    if (params?.query !== undefined) setSearchQuery(params.query);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleBookmark = (tweet: Tweet) => {
    setBookmarks((prev) => {
      const exists = prev.some((b) => b.id === tweet.id);
      const next = exists ? prev.filter((b) => b.id !== tweet.id) : [tweet, ...prev];
      try {
        localStorage.setItem('viewable_bookmarks', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const isBookmarked = (id: string) => bookmarks.some((b) => b.id === id);

  const toggleLike = (tweetId: string) => {
    setLikedTweetIds((prev) => {
      const next = new Set(prev);
      if (next.has(tweetId)) next.delete(tweetId);
      else next.add(tweetId);
      try {
        localStorage.setItem('viewable_likes', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const toggleRetweet = (tweetId: string) => {
    setRetweetedTweetIds((prev) => {
      const next = new Set(prev);
      if (next.has(tweetId)) next.delete(tweetId);
      else next.add(tweetId);
      try {
        localStorage.setItem('viewable_retweets', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const openLightbox = (media: Media[], initialIndex = 0) => {
    setActiveLightbox({ media, initialIndex });
  };

  const closeLightbox = () => {
    setActiveLightbox(null);
  };

  /**
   * PANIC BUTTON: Instant wipe of all local data, caches, IndexedDB, cookies
   */
  const panicWipe = async () => {
    try {
      localStorage.clear();
      sessionStorage.clear();

      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }

      if ('indexedDB' in window) {
        const dbs = await window.indexedDB.databases?.();
        if (dbs) {
          dbs.forEach((db) => {
            if (db.name) window.indexedDB.deleteDatabase(db.name);
          });
        }
      }

      // Clear cookies
      document.cookie.split(';').forEach((c) => {
        document.cookie = c.replace(/^ +/, '').replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
      });
    } finally {
      window.location.href = '/';
    }
  };

  const addNotification = (item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
    const newItem: NotificationItem = {
      ...item,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => {
      const next = [newItem, ...prev.slice(0, 49)];
      try {
        localStorage.setItem('viewable_notifications', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const markNotificationsAsRead = () => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      try {
        localStorage.setItem('viewable_notifications', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  /**
   * ON-DEVICE "FOR YOU" RECOMMENDATION ENGINE
   * Formula: score = w1*recency_decay + w2*topic_affinity + w3*engagement_velocity + w4*source_diversity - w5*repetition_penalty
   * Executed 100% in client memory without sending metrics to any external server.
   */
  const scoreTweet = (tweet: Tweet): { score: number; factors: Record<string, number> } => {
    const w = settings.rankingWeights;

    // 1. Recency Decay (exponential half-life: 12 hours)
    const ageHours = Math.max(0, (Date.now() - new Date(tweet.createdAt).getTime()) / (1000 * 60 * 60));
    const recencyDecay = Math.exp(-ageHours / 12);

    // 2. Topic / Author Affinity
    const isAuthorWatched = settings.watchlist.accounts.includes(tweet.author.username.toLowerCase());
    const hasWatchedKeyword = settings.watchlist.keywords.some((kw) =>
      tweet.text.toLowerCase().includes(kw.toLowerCase())
    );
    const hasLikedAuthor = Array.from(likedTweetIds).length > 0;
    const topicAffinity = (isAuthorWatched ? 0.6 : 0) + (hasWatchedKeyword ? 0.3 : 0) + (hasLikedAuthor ? 0.1 : 0);

    // 3. Engagement Velocity
    const totalEngagement = tweet.stats.likes + tweet.stats.retweets * 2 + tweet.stats.replies * 1.5;
    const engagementVelocity = Math.min(1, Math.log10(totalEngagement + 1) / 4);

    // 4. Source Diversity Bonus (higher score for fresh creators)
    const sourceDiversityBonus = isAuthorWatched ? 0.3 : 0.7;

    // 5. Repetition Penalty
    const repetitionPenalty = likedTweetIds.has(tweet.id) ? 0.8 : 0.0;

    const rawScore =
      w.recency * recencyDecay +
      w.affinity * topicAffinity +
      w.velocity * engagementVelocity +
      w.diversity * sourceDiversityBonus -
      w.repetition * repetitionPenalty;

    return {
      score: Math.max(0, rawScore),
      factors: {
        'Recency Decay': Math.round(recencyDecay * 100),
        'Topic & Author Affinity': Math.round(topicAffinity * 100),
        'Engagement Velocity': Math.round(engagementVelocity * 100),
        'Source Diversity': Math.round(sourceDiversityBonus * 100),
        'Repetition Penalty': Math.round(repetitionPenalty * 100),
      },
    };
  };

  return (
    <AppContext.Provider
      value={{
        settings,
        updateSettings,
        activeView,
        selectedTweetId,
        selectedUsername,
        searchQuery,
        bookmarks,
        likedTweetIds,
        retweetedTweetIds,
        notifications,
        unreadNotificationCount,
        isComposeOpen,
        setIsComposeOpen,
        isSettingsOpen,
        setIsSettingsOpen,
        isPanicModalOpen,
        setIsPanicModalOpen,
        activeLightbox,
        openLightbox,
        closeLightbox,
        navigate,
        toggleBookmark,
        isBookmarked,
        toggleLike,
        toggleRetweet,
        panicWipe,
        markNotificationsAsRead,
        addNotification,
        scoreTweet,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
