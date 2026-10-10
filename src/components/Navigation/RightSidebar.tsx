import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Search, Shield, Flame, UserCheck, Keyboard } from 'lucide-react';

export const RightSidebar: React.FC = () => {
  const { navigate, settings } = useApp();
  const [quickQuery, setQuickQuery] = useState('');
  const [trending, setTrending] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/news')
      .then((r) => r.json())
      .then((data) => {
        if (data.trending) setTrending(data.trending.slice(0, 5));
      })
      .catch(() => {});
  }, []);

  const suggestedAccounts = [
    { name: 'NASA', username: 'NASA', desc: 'Space exploration & science' },
    { name: 'OpenAI', username: 'OpenAI', desc: 'Artificial intelligence research' },
    { name: 'Nature', username: 'Nature', desc: 'Leading multidisciplinary science journal' },
  ];

  return (
    <aside className="hidden lg:block w-80 xl:w-88 h-screen sticky top-0 p-4 space-y-4 select-none overflow-y-auto no-scrollbar">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
        <input
          type="text"
          value={quickQuery}
          onChange={(e) => setQuickQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && quickQuery.trim()) {
              navigate('explore', { query: quickQuery.trim() });
            }
          }}
          placeholder="Search Viewable..."
          className="w-full bg-neutral-900 border border-neutral-800 rounded-full pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-sky-500 transition"
        />
      </div>

      {/* Privacy Guarantee Box */}
      <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
        <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase tracking-wider">
          <Shield className="w-4 h-4" />
          <span>Anonymous Client</span>
        </div>
        <p className="text-xs text-neutral-300 leading-relaxed">
          All images, avatars, videos, and requests are proxied with EXIF metadata stripped. No IP addresses or queries are ever logged.
        </p>
      </div>

      {/* Trending Topics Box */}
      {trending.length > 0 && (
        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
            <Flame className="w-4 h-4 text-amber-500" />
            <span>What's Happening</span>
          </div>
          <div className="space-y-2.5">
            {trending.map((tag, idx) => (
              <div
                key={tag}
                onClick={() => navigate('explore', { query: tag })}
                className="cursor-pointer group flex items-center justify-between"
              >
                <div>
                  <span className="text-[11px] text-neutral-500 block">Trending · #{idx + 1}</span>
                  <span className="text-sm font-bold text-white group-hover:text-sky-400 transition">{tag}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Who to Watch / Suggested Creators */}
      <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Who to Watch</h3>
        <div className="space-y-3">
          {suggestedAccounts.map((acc) => (
            <div
              key={acc.username}
              onClick={() => navigate('profile', { username: acc.username })}
              className="flex items-center justify-between group cursor-pointer"
            >
              <div className="min-w-0 pr-2">
                <span className="text-xs font-bold text-white group-hover:underline block truncate">
                  {acc.name}
                </span>
                <span className="text-[11px] text-neutral-500 block truncate">@{acc.username}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('profile', { username: acc.username });
                }}
                className="px-3 py-1 rounded-full bg-white hover:bg-neutral-200 text-black text-[11px] font-bold shrink-0 transition"
              >
                View
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="px-2 text-[11px] text-neutral-500 space-y-1">
        <div className="flex items-center gap-1.5 font-semibold text-neutral-400">
          <Keyboard className="w-3.5 h-3.5" />
          <span>Hotkeys:</span>
        </div>
        <p>
          <kbd className="bg-neutral-800 px-1 rounded text-neutral-300">C</kbd> Post ·{' '}
          <kbd className="bg-neutral-800 px-1 rounded text-neutral-300">/</kbd> Search ·{' '}
          <kbd className="bg-neutral-800 px-1 rounded text-neutral-300">Shift+P</kbd> Panic Purge
        </p>
      </div>
    </aside>
  );
};
