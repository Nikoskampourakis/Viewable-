import React, { useState, useEffect } from 'react';
import { Tweet, TimelineResponse } from '../../types/index.ts';
import { TweetCard } from '../Tweet/TweetCard.tsx';
import { TweetSkeleton } from '../Common/Skeletons.tsx';
import { useApp } from '../../context/AppContext.tsx';
import { Search, X, Filter, KeyRound } from 'lucide-react';

export const SearchBar: React.FC = () => {
  const { searchQuery, navigate, settings, setIsSettingsOpen } = useApp();
  const [query, setQuery] = useState(searchQuery || '');
  const [filter, setFilter] = useState<'top' | 'latest' | 'media' | 'people'>('top');
  const [results, setResults] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const hasSession = Boolean(settings.byoCookies.authToken && settings.byoCookies.ct0);

  const handleSearch = async (term = query) => {
    if (!term.trim()) return;
    setLoading(true);
    setSearched(true);

    const headers: Record<string, string> = {};
    if (hasSession) {
      headers['x-byo-auth-token'] = settings.byoCookies.authToken;
      headers['x-byo-ct0'] = settings.byoCookies.ct0;
    }

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(term.trim())}`, { headers });
      if (!res.ok) throw new Error('Search failed');
      const data: TimelineResponse = await res.json();
      setResults(data.tweets || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery) {
      setQuery(searchQuery);
      handleSearch(searchQuery);
    }
  }, [searchQuery]);

  const insertOperator = (op: string) => {
    setQuery((prev) => `${prev.trim()} ${op} `);
  };

  return (
    <div>
      {/* Top Search Input Box */}
      <div className="sticky top-0 z-30 bg-black/85 backdrop-blur-md border-b border-neutral-800 p-3 space-y-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="relative flex items-center"
        >
          <Search className="absolute left-3.5 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search keywords, #hashtags, @users, or operators..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded-full pl-10 pr-9 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-sky-500 transition"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 text-neutral-500 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Search Operator Helpers */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] text-neutral-400 no-scrollbar">
          <span className="font-semibold text-neutral-500 flex items-center gap-1 shrink-0">
            <Filter className="w-3 h-3" />
            <span>Operators:</span>
          </span>
          <button
            onClick={() => insertOperator('from:')}
            className="px-2 py-0.5 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-sky-400 shrink-0"
          >
            from:user
          </button>
          <button
            onClick={() => insertOperator('since:2026-01-01')}
            className="px-2 py-0.5 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-sky-400 shrink-0"
          >
            since:date
          </button>
          <button
            onClick={() => insertOperator('until:2026-12-31')}
            className="px-2 py-0.5 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-sky-400 shrink-0"
          >
            until:date
          </button>
          <button
            onClick={() => insertOperator('min_faves:100')}
            className="px-2 py-0.5 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-sky-400 shrink-0"
          >
            min_faves:100
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex border-t border-neutral-850 pt-2 text-xs font-semibold text-neutral-500">
          {(['top', 'latest', 'media', 'people'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`flex-1 py-1 text-center capitalize transition ${
                filter === t ? 'text-white font-bold border-b-2 border-sky-500' : 'hover:text-neutral-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* BYO Session Reminder Notice if search failed or session missing */}
      {!hasSession && (
        <div className="m-4 p-3.5 rounded-2xl bg-neutral-900/80 border border-neutral-800 text-xs text-neutral-300 flex items-start gap-3">
          <KeyRound className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-semibold text-white">Full-Text Search Tip</p>
            <p className="text-neutral-400 leading-relaxed">
              Live Twitter/X search endpoints require authenticated session cookies. You can optionally supply your own <code className="text-amber-300">auth_token</code> and <code className="text-amber-300">ct0</code> in Settings. They stay 100% on your device.
            </p>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-sky-400 hover:underline font-semibold pt-1 block"
            >
              Open Settings → BYO Session
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <>
          <TweetSkeleton />
          <TweetSkeleton />
        </>
      ) : searched && results.length === 0 ? (
        <div className="p-12 text-center text-xs text-neutral-500">
          No results found for "{query}". Try adjusting keywords or adding session cookies in Settings.
        </div>
      ) : (
        <div className="divide-y divide-neutral-800">
          {results.map((tweet) => (
            <TweetCard key={tweet.id} tweet={tweet} />
          ))}
        </div>
      )}
    </div>
  );
};
