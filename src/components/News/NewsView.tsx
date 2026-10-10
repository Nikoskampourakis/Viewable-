import React, { useEffect, useState } from 'react';
import { NewsTopicCluster, NewsItem } from '../../types/index.ts';
import { Newspaper, Layers, ExternalLink, RefreshCw, Flame } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';

export const NewsView: React.FC = () => {
  const [clusters, setClusters] = useState<NewsTopicCluster[]>([]);
  const [trending, setTrending] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { navigate, settings } = useApp();

  const loadNews = async () => {
    setLoading(true);
    try {
      const customParam = settings.customFeeds.length > 0 ? `?feeds=${encodeURIComponent(settings.customFeeds.join(','))}` : '';
      const res = await fetch(`/api/news${customParam}`);
      const data = await res.json();
      setClusters(data.clusters || []);
      setTrending(data.trending || []);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, [settings.customFeeds]);

  return (
    <div>
      {/* Sticky top header */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-sky-400" />
          <h2 className="text-lg font-bold text-white">News Channels</h2>
        </div>
        <button
          onClick={loadNews}
          disabled={loading}
          className="p-1.5 rounded-full hover:bg-neutral-900 text-neutral-400 hover:text-white transition disabled:opacity-50"
          title="Refresh Feeds"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Trending Topics Ribbon */}
      {trending.length > 0 && (
        <div className="p-4 border-b border-neutral-800 bg-neutral-950/40">
          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
            <Flame className="w-4 h-4 text-amber-500" />
            <span>Trending Topics</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {trending.map((tag) => (
              <button
                key={tag}
                onClick={() => navigate('explore', { query: tag })}
                className="px-3 py-1 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-sky-400 transition"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Clusters List */}
      <div className="divide-y divide-neutral-800">
        {loading ? (
          <div className="p-12 text-center text-xs text-neutral-500">
            Fetching and clustering news feeds...
          </div>
        ) : clusters.length === 0 ? (
          <div className="p-12 text-center text-xs text-neutral-500">
            No news clusters available at this time.
          </div>
        ) : (
          clusters.map((cluster) => (
            <article key={cluster.id} className="p-4 hover:bg-neutral-900/30 transition">
              <div className="flex items-center gap-2 text-xs text-sky-400 mb-1.5 font-medium">
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span className="font-bold">{cluster.topic}</span>
                <span className="text-neutral-500">·</span>
                <span className="text-neutral-500">{cluster.articleCount} sources covering</span>
              </div>

              {/* Lead Article */}
              <h3 className="text-base font-bold text-white hover:text-sky-400 transition leading-snug mb-2">
                <a href={cluster.leadArticle.link} target="_blank" rel="noopener noreferrer">
                  {cluster.leadArticle.title}
                </a>
              </h3>

              <p className="text-xs text-neutral-300 leading-relaxed line-clamp-3 mb-3">
                {cluster.leadArticle.summary}
              </p>

              {/* Multi-source coverage pills */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-neutral-850 text-xs">
                <span className="text-neutral-500 text-[11px]">Reported by:</span>
                {cluster.sources.map((src) => (
                  <span
                    key={src}
                    className="px-2 py-0.5 rounded-full bg-neutral-850 text-neutral-300 border border-neutral-800 text-[11px]"
                  >
                    {src}
                  </span>
                ))}
                <a
                  href={cluster.leadArticle.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-sky-400 hover:underline flex items-center gap-1 text-[11px] font-semibold"
                >
                  <span>Read Article</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
};
