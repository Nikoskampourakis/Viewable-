import React, { useEffect, useState } from 'react';
import { Thread, Tweet } from '../../types/index.ts';
import { useApp } from '../../context/AppContext.tsx';
import { ArrowLeft, Printer, Share2, BookOpen } from 'lucide-react';
import { useToast } from '../../context/ToastContext.tsx';

interface Props {
  tweetId: string;
}

export const ArticleView: React.FC<Props> = ({ tweetId }) => {
  const { navigate, settings } = useApp();
  const { showToast } = useToast();
  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers: Record<string, string> = {};
    if (settings.byoCookies.authToken && settings.byoCookies.ct0) {
      headers['x-byo-auth-token'] = settings.byoCookies.authToken;
      headers['x-byo-ct0'] = settings.byoCookies.ct0;
    }

    fetch(`/api/thread/${tweetId}`, { headers })
      .then((r) => r.json())
      .then((data) => {
        setThread(data);
        setLoading(false);
      })
      .catch(() => {
        fetch(`/api/tweet/${tweetId}`, { headers })
          .then((r) => r.json())
          .then((tweet: Tweet) => {
            setThread({
              mainTweet: tweet,
              ancestors: [],
              replies: [],
              providerSource: tweet.providerSource,
            });
            setLoading(false);
          });
      });
  }, [tweetId, settings.byoCookies]);

  if (loading || !thread) {
    return <div className="p-12 text-center text-neutral-400">Formatting article...</div>;
  }

  const allTweets = [...thread.ancestors, thread.mainTweet, ...thread.replies];
  const main = thread.mainTweet;

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('Article link copied to clipboard', 'success');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Navigation & Controls */}
      <div className="flex items-center justify-between pb-6 mb-8 border-b border-neutral-800">
        <button
          onClick={() => navigate('tweet', { tweetId })}
          className="flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Post</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="p-2 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
            title="Print / Save PDF"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button
            onClick={handleShare}
            className="p-2 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
            title="Copy Link"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Article Header */}
      <header className="mb-8 space-y-3">
        <div className="flex items-center gap-2 text-xs font-medium text-sky-400 uppercase tracking-wider">
          <BookOpen className="w-4 h-4" />
          <span>Thread Reader Mode</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
          {main.text.slice(0, 85)}...
        </h1>
        <div className="flex items-center gap-3 pt-2">
          <img
            src={`/api/proxy/media?url=${encodeURIComponent(main.author.avatar)}`}
            alt=""
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <div className="font-bold text-sm text-white">{main.author.name}</div>
            <div className="text-xs text-neutral-400">
              @{main.author.username} · {new Date(main.createdAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>
      </header>

      {/* Article Body */}
      <article className="space-y-6 text-[17px] leading-relaxed text-neutral-200">
        {allTweets.map((t, index) => (
          <div key={t.id} className="space-y-3">
            <p className="whitespace-pre-line">{t.text}</p>
            {t.media && t.media.length > 0 && (
              <div className="rounded-xl overflow-hidden my-4 border border-neutral-800">
                <img
                  src={`/api/proxy/media?url=${encodeURIComponent(t.media[0].originalUrl || t.media[0].url)}`}
                  alt=""
                  className="w-full max-h-[500px] object-cover"
                />
              </div>
            )}
            {index < allTweets.length - 1 && (
              <div className="w-12 h-0.5 bg-neutral-800/80 mx-auto my-6" />
            )}
          </div>
        ))}
      </article>

      <footer className="mt-12 pt-6 border-t border-neutral-800 text-center text-xs text-neutral-500">
        Archived and rendered anonymously via Viewable. No trackers or third-party cookies.
      </footer>
    </div>
  );
};
