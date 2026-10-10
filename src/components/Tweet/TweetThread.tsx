import React, { useEffect, useState } from 'react';
import { Thread, Tweet } from '../../types/index.ts';
import { TweetCard } from './TweetCard.tsx';
import { TweetSkeleton } from '../Common/Skeletons.tsx';
import { useApp } from '../../context/AppContext.tsx';
import { ArrowLeft, MessageSquare, AlertCircle } from 'lucide-react';

interface Props {
  tweetId: string;
}

export const TweetThread: React.FC<Props> = ({ tweetId }) => {
  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { navigate, settings, setIsComposeOpen } = useApp();

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const headers: Record<string, string> = {};
    if (settings.byoCookies.authToken && settings.byoCookies.ct0) {
      headers['x-byo-auth-token'] = settings.byoCookies.authToken;
      headers['x-byo-ct0'] = settings.byoCookies.ct0;
    }

    fetch(`/api/thread/${tweetId}`, { headers })
      .then((res) => {
        if (!res.ok) throw new Error(`Thread query failed: HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Thread) => {
        if (isMounted) {
          setThread(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          // If thread endpoint failed, try single tweet endpoint
          fetch(`/api/tweet/${tweetId}`, { headers })
            .then((r) => r.json())
            .then((singleTweet: Tweet) => {
              if (singleTweet && singleTweet.id) {
                setThread({
                  mainTweet: singleTweet,
                  ancestors: [],
                  replies: [],
                  providerSource: singleTweet.providerSource,
                });
                setLoading(false);
              } else {
                setError(err.message || 'Post could not be loaded');
                setLoading(false);
              }
            })
            .catch(() => {
              setError(err.message || 'Post could not be loaded');
              setLoading(false);
            });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [tweetId, settings.byoCookies]);

  if (loading) {
    return (
      <div>
        <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-neutral-800 p-3 flex items-center gap-6">
          <button
            onClick={() => navigate('for-you')}
            className="p-2 rounded-full hover:bg-neutral-900 transition text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-white">Post</h2>
        </div>
        <TweetSkeleton />
        <TweetSkeleton />
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-800 text-rose-400 mx-auto flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">Post Unavailable</h3>
        <p className="text-xs text-neutral-400 max-w-sm mx-auto mb-4">
          {error || 'This post may have been deleted, restricted, or blocked by upstream rate limits.'}
        </p>
        <button
          onClick={() => navigate('for-you')}
          className="px-4 py-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white border border-neutral-700 transition"
        >
          Return to Feed
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Sticky top header */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-neutral-800 px-4 py-3 flex items-center gap-6">
        <button
          onClick={() => window.history.back()}
          className="p-1.5 rounded-full hover:bg-neutral-900 transition text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-white">Post</h2>
      </div>

      {/* Ancestor parent tweets with vertical thread line */}
      {thread.ancestors.map((ancestor) => (
        <div key={ancestor.id} className="relative">
          {/* Vertical hairline thread */}
          <div className="absolute left-[34px] top-12 bottom-0 w-0.5 bg-neutral-800 -z-0" />
          <TweetCard tweet={ancestor} />
        </div>
      ))}

      {/* Main Focal Tweet */}
      <TweetCard tweet={thread.mainTweet} isDetailedView={true} />

      {/* Quick Reply Bar */}
      <div
        onClick={() => setIsComposeOpen(true)}
        className="p-3.5 border-b border-neutral-800 flex items-center gap-3 bg-neutral-950/40 cursor-pointer hover:bg-neutral-900/30 transition"
      >
        <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-bold">
          You
        </div>
        <span className="text-sm text-neutral-500 flex-1">Post your reply</span>
        <button className="px-3.5 py-1.5 rounded-full bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs transition">
          Reply
        </button>
      </div>

      {/* Replies Tree */}
      <div className="divide-y divide-neutral-800">
        {thread.replies.map((reply) => (
          <TweetCard key={reply.id} tweet={reply} />
        ))}
      </div>

      {thread.replies.length === 0 && (
        <div className="p-8 text-center text-neutral-500 text-xs">
          <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-40" />
          No replies yet for this post
        </div>
      )}
    </div>
  );
};
