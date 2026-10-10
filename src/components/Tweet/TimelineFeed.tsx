import React, { useEffect, useState } from 'react';
import { Tweet, TimelineResponse } from '../../types/index.ts';
import { TweetCard } from './TweetCard.tsx';
import { TweetSkeleton } from '../Common/Skeletons.tsx';
import { useApp } from '../../context/AppContext.tsx';
import { RefreshCw, Sparkles, AlertCircle } from 'lucide-react';

interface Props {
  mode: 'for-you' | 'following';
}

// Curated default accounts for high-signal feed initialization
const DEFAULT_CURATED_ACCOUNTS = [
  'NASA',
  'Nature',
  'OpenAI',
  'github',
  'SpaceX',
];

export const TimelineFeed: React.FC<Props> = ({ mode }) => {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { settings, scoreTweet } = useApp();

  const loadFeed = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const headers: Record<string, string> = {};
    if (settings.byoCookies.authToken && settings.byoCookies.ct0) {
      headers['x-byo-auth-token'] = settings.byoCookies.authToken;
      headers['x-byo-ct0'] = settings.byoCookies.ct0;
    }

    try {
      const accountsToFetch =
        mode === 'following' && settings.watchlist.accounts.length > 0
          ? settings.watchlist.accounts
          : settings.watchlist.accounts.length > 0
          ? [...settings.watchlist.accounts, ...DEFAULT_CURATED_ACCOUNTS]
          : DEFAULT_CURATED_ACCOUNTS;

      // Fetch sample of timelines in parallel
      const selected = accountsToFetch.slice(0, 4);
      const results = await Promise.allSettled(
        selected.map(async (acc) => {
          const res = await fetch(`/api/timeline/${acc}`, { headers });
          if (!res.ok) throw new Error('Fetch failed');
          const data: TimelineResponse = await res.json();
          return data.tweets || [];
        })
      );

      const aggregated: Tweet[] = [];
      results.forEach((r) => {
        if (r.status === 'fulfilled') {
          aggregated.push(...r.value);
        }
      });

      // Filter muted words
      const muted = settings.mutedWords;
      const cleanList = aggregated.filter((t) => {
        if (!t || !t.text) return false;
        const lower = t.text.toLowerCase();
        return !muted.some((m) => lower.includes(m.toLowerCase()));
      });

      // Deduplicate by Tweet ID
      const seen = new Set<string>();
      const deduped: Tweet[] = [];
      cleanList.forEach((t) => {
        if (!seen.has(t.id)) {
          seen.add(t.id);
          deduped.push(t);
        }
      });

      // Ranking
      if (mode === 'for-you') {
        // Sort by on-device algorithm score
        deduped.sort((a, b) => {
          const scoreA = scoreTweet(a).score;
          const scoreB = scoreTweet(b).score;
          return scoreB - scoreA;
        });
      } else {
        // Sort strictly chronologically
        deduped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      setTweets(deduped);
    } catch (err: any) {
      setError(err?.message || 'Could not load feed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, [mode, settings.watchlist.accounts, settings.byoCookies]);

  if (loading) {
    return (
      <div className="divide-y divide-neutral-800">
        <TweetSkeleton />
        <TweetSkeleton />
        <TweetSkeleton />
      </div>
    );
  }

  return (
    <div>
      {/* Feed freshness indicator */}
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-950/40 border-b border-neutral-800 text-xs text-neutral-400">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>
            {mode === 'for-you' ? 'Personalized on-device ranking' : 'Chronological watchlist'}
          </span>
        </div>
        <button
          onClick={() => loadFeed(true)}
          disabled={refreshing}
          className="flex items-center gap-1 text-sky-400 hover:underline font-semibold"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="m-4 p-4 rounded-2xl bg-rose-950/30 border border-rose-900/60 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Tweets stream */}
      <div className="divide-y divide-neutral-800">
        {tweets.map((tweet) => (
          <TweetCard key={tweet.id} tweet={tweet} />
        ))}
      </div>

      {tweets.length === 0 && !error && (
        <div className="p-12 text-center text-xs text-neutral-500">
          No posts available right now. Add accounts to your Watchlist in Notifications or use Search.
        </div>
      )}
    </div>
  );
};
