import React, { useState } from 'react';
import { Tweet } from '../../types/index.ts';
import { useApp } from '../../context/AppContext.tsx';
import { MediaGrid } from './MediaGrid.tsx';
import { PollCard } from './PollCard.tsx';
import { CommunityNoteCard } from './CommunityNoteCard.tsx';
import { ExportMenu } from './ExportMenu.tsx';
import { WhySeeingModal } from './WhySeeingModal.tsx';
import { AIAnalysisModal } from './AIAnalysisModal.tsx';
import { ProviderStatusBadge } from '../Common/ProviderStatusBadge.tsx';
import {
  MessageCircle,
  Repeat2,
  Heart,
  Bookmark,
  BarChart2,
  BadgeCheck,
  Sparkles,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

interface Props {
  tweet: Tweet;
  isDetailedView?: boolean;
}

export const TweetCard: React.FC<Props> = ({ tweet, isDetailedView = false }) => {
  const {
    navigate,
    likedTweetIds,
    toggleLike,
    retweetedTweetIds,
    toggleRetweet,
    isBookmarked,
    toggleBookmark,
  } = useApp();

  const [showWhyModal, setShowWhyModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);

  const isLiked = likedTweetIds.has(tweet.id);
  const isRetweeted = retweetedTweetIds.has(tweet.id);
  const bookmarked = isBookmarked(tweet.id);

  const likesCount = tweet.stats.likes + (isLiked ? 1 : 0);
  const retweetsCount = tweet.stats.retweets + (isRetweeted ? 1 : 0);

  const getProxyUrl = (url?: string) =>
    url ? `/api/proxy/media?url=${encodeURIComponent(url)}` : '';

  const formatNumber = (num?: number) => {
    if (!num) return '0';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const timeAgo = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return 'now';
      if (mins < 60) return `${mins}m`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `${days}d`;
      return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  // Render text with clickable hashtag/mention highlights
  const renderFormattedText = (content: string) => {
    const parts = content.split(/(\s+)/);
    return parts.map((part, index) => {
      if (part.startsWith('#') && part.length > 1) {
        return (
          <span
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              navigate('explore', { query: part });
            }}
            className="text-sky-400 hover:underline cursor-pointer"
          >
            {part}
          </span>
        );
      }
      if (part.startsWith('@') && part.length > 1) {
        const username = part.replace(/^@|[.,!?:]+$/g, '');
        return (
          <span
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              navigate('profile', { username });
            }}
            className="text-sky-400 hover:underline cursor-pointer"
          >
            {part}
          </span>
        );
      }
      if (part.startsWith('http://') || part.startsWith('https://')) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-sky-400 hover:underline inline-flex items-center gap-0.5 break-all"
          >
            <span>{part.replace(/^https?:\/\//, '').slice(0, 24)}...</span>
            <ExternalLink className="w-2.5 h-2.5 inline" />
          </a>
        );
      }
      return part;
    });
  };

  return (
    <article
      onClick={() => !isDetailedView && navigate('tweet', { tweetId: tweet.id })}
      className={`border-b border-neutral-800 transition ${
        isDetailedView ? 'p-4 sm:p-5' : 'p-4 hover:bg-neutral-900/40 cursor-pointer'
      }`}
    >
      <div className="flex gap-3">
        {/* Author Avatar (Always proxied) */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            navigate('profile', { username: tweet.author.username });
          }}
          className="shrink-0 cursor-pointer group"
        >
          {tweet.author.avatar ? (
            <img
              src={getProxyUrl(tweet.author.avatar)}
              alt={tweet.author.name}
              className="w-10 h-10 rounded-full object-cover group-hover:brightness-90 transition bg-neutral-800 border border-neutral-800"
              loading="lazy"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-neutral-400 border border-neutral-750">
              {tweet.author.name.charAt(0)}
            </div>
          )}
        </div>

        {/* Tweet content body */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center justify-between gap-1 mb-1">
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('profile', { username: tweet.author.username });
                }}
                className="font-bold text-[15px] text-white hover:underline truncate cursor-pointer"
              >
                {tweet.author.name}
              </span>
              {tweet.author.verified && (
                <BadgeCheck className="w-4 h-4 text-sky-400 shrink-0 fill-current" />
              )}
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('profile', { username: tweet.author.username });
                }}
                className="text-neutral-500 text-sm truncate cursor-pointer hover:underline"
              >
                @{tweet.author.username}
              </span>
              <span className="text-neutral-600 text-sm">·</span>
              <time className="text-neutral-500 text-sm shrink-0 hover:underline">
                {timeAgo(tweet.createdAt)}
              </time>
            </div>

            {/* Provider origin tag */}
            <ProviderStatusBadge
              source={tweet.providerSource}
              isFromCache={tweet.isFromCache}
              cachedAt={tweet.cachedAt}
            />
          </div>

          {/* Replying indicator if present */}
          {tweet.replyToUsername && (
            <p className="text-xs text-neutral-500 mb-1.5">
              Replying to{' '}
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('profile', { username: tweet.replyToUsername! });
                }}
                className="text-sky-400 hover:underline cursor-pointer"
              >
                @{tweet.replyToUsername}
              </span>
            </p>
          )}

          {/* Main Tweet Text */}
          <p
            className={`text-neutral-100 whitespace-pre-line leading-relaxed break-words font-normal ${
              isDetailedView ? 'text-[17px] my-3' : 'text-[15px]'
            }`}
          >
            {renderFormattedText(tweet.text)}
          </p>

          {/* Media Grid */}
          {tweet.media && tweet.media.length > 0 && (
            <MediaGrid media={tweet.media} isSensitive={tweet.isSensitive} />
          )}

          {/* Poll Card */}
          {tweet.poll && <PollCard poll={tweet.poll} />}

          {/* Quoted Tweet */}
          {tweet.quotedTweet && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                navigate('tweet', { tweetId: tweet.quotedTweet!.id });
              }}
              className="mt-3 rounded-2xl border border-neutral-800 p-3 hover:bg-neutral-800/40 transition cursor-pointer"
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <img
                  src={getProxyUrl(tweet.quotedTweet.author.avatar)}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover"
                />
                <span className="font-bold text-xs text-white">{tweet.quotedTweet.author.name}</span>
                <span className="text-xs text-neutral-500">@{tweet.quotedTweet.author.username}</span>
              </div>
              <p className="text-xs text-neutral-200 line-clamp-3">{tweet.quotedTweet.text}</p>
            </div>
          )}

          {/* Link / URL Card Preview */}
          {tweet.card && tweet.card.url && (
            <a
              href={tweet.card.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-3 block rounded-2xl border border-neutral-800 overflow-hidden hover:bg-neutral-850/50 transition group"
            >
              {tweet.card.imageUrl && (
                <img
                  src={getProxyUrl(tweet.card.imageUrl)}
                  alt=""
                  className="w-full h-36 object-cover group-hover:scale-102 transition duration-200"
                  loading="lazy"
                />
              )}
              <div className="p-3">
                <span className="text-[11px] text-neutral-500 uppercase tracking-wider font-medium">
                  {tweet.card.domain || new URL(tweet.card.url).hostname}
                </span>
                {tweet.card.title && (
                  <h4 className="text-sm font-semibold text-white truncate mt-0.5">{tweet.card.title}</h4>
                )}
                {tweet.card.description && (
                  <p className="text-xs text-neutral-400 line-clamp-2 mt-1">{tweet.card.description}</p>
                )}
              </div>
            </a>
          )}

          {/* Community Note ("Readers added context") */}
          {tweet.communityNote && <CommunityNoteCard note={tweet.communityNote} />}

          {/* Detailed view timestamp & stats */}
          {isDetailedView && (
            <div className="py-3.5 my-2 border-y border-neutral-800 text-xs text-neutral-500 flex flex-wrap gap-4">
              <span>{new Date(tweet.createdAt).toLocaleTimeString()}</span>
              <span>·</span>
              <span>{new Date(tweet.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              {tweet.stats.views !== undefined && (
                <>
                  <span>·</span>
                  <span className="text-white font-semibold">{formatNumber(tweet.stats.views)} Views</span>
                </>
              )}
            </div>
          )}

          {/* Interaction Bar */}
          <div className="flex items-center justify-between text-neutral-500 mt-3 pt-1 max-w-md text-xs">
            {/* Reply */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate('tweet', { tweetId: tweet.id });
              }}
              className="flex items-center gap-1.5 hover:text-sky-400 transition group p-1 -m-1"
              title="Reply"
            >
              <div className="p-1.5 rounded-full group-hover:bg-sky-500/10">
                <MessageCircle className="w-4 h-4" />
              </div>
              <span>{formatNumber(tweet.stats.replies)}</span>
            </button>

            {/* Retweet */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleRetweet(tweet.id);
              }}
              className={`flex items-center gap-1.5 hover:text-emerald-400 transition group p-1 -m-1 ${
                isRetweeted ? 'text-emerald-400 font-semibold' : ''
              }`}
              title="Repost"
            >
              <div className="p-1.5 rounded-full group-hover:bg-emerald-500/10">
                <Repeat2 className="w-4 h-4" />
              </div>
              <span>{formatNumber(retweetsCount)}</span>
            </button>

            {/* Like */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleLike(tweet.id);
              }}
              className={`flex items-center gap-1.5 hover:text-rose-500 transition group p-1 -m-1 ${
                isLiked ? 'text-rose-500 font-semibold' : ''
              }`}
              title="Like"
            >
              <div className="p-1.5 rounded-full group-hover:bg-rose-500/10">
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              </div>
              <span>{formatNumber(likesCount)}</span>
            </button>

            {/* Views */}
            {tweet.stats.views !== undefined && (
              <div className="flex items-center gap-1.5 text-neutral-500 p-1 -m-1">
                <div className="p-1.5">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <span>{formatNumber(tweet.stats.views)}</span>
              </div>
            )}

            {/* Bookmark */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleBookmark(tweet);
              }}
              className={`p-1.5 rounded-full hover:text-sky-400 hover:bg-sky-500/10 transition ${
                bookmarked ? 'text-sky-400' : ''
              }`}
              title="Bookmark"
            >
              <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
            </button>

            {/* AI Deep Thinker / Fact-Check */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAIModal(true);
              }}
              className="p-1.5 rounded-full hover:text-purple-400 hover:bg-purple-500/10 transition"
              title="AI Deep Thinker & Fact Check (Gemini 3.1 Pro)"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
            </button>

            {/* Why Am I Seeing This? */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowWhyModal(true);
              }}
              className="p-1.5 rounded-full hover:text-sky-400 hover:bg-sky-500/10 transition"
              title="Why am I seeing this?"
            >
              <HelpCircle className="w-4 h-4 text-neutral-500 hover:text-sky-400" />
            </button>

            {/* Export Menu */}
            <ExportMenu tweet={tweet} />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showWhyModal && <WhySeeingModal tweet={tweet} onClose={() => setShowWhyModal(false)} />}
      {showAIModal && <AIAnalysisModal tweet={tweet} onClose={() => setShowAIModal(false)} />}
    </article>
  );
};
