import React from 'react';
import { Database, ShieldCheck, Archive } from 'lucide-react';

interface Props {
  source?: string;
  isFromCache?: boolean;
  cachedAt?: string;
}

export const ProviderStatusBadge: React.FC<Props> = ({ source, isFromCache, cachedAt }) => {
  if (isFromCache) {
    const formattedDate = cachedAt ? new Date(cachedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-950/60 text-amber-300 border border-amber-800/60">
        <Database className="w-3 h-3 text-amber-400" />
        <span>Served from cache{formattedDate ? ` · ${formattedDate}` : ''}</span>
      </div>
    );
  }

  if (!source) return null;

  if (source.includes('Wayback')) {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-950/50 text-purple-300 border border-purple-800/40">
        <Archive className="w-2.5 h-2.5" />
        <span>Wayback Archive</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-900 text-neutral-400 border border-neutral-800">
      <ShieldCheck className="w-2.5 h-2.5 text-sky-400" />
      <span>{source}</span>
    </div>
  );
};
