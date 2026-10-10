import React, { useEffect, useState } from 'react';
import { User, Tweet, TimelineResponse } from '../../types/index.ts';
import { TweetCard } from '../Tweet/TweetCard.tsx';
import { ProfileSkeleton, TweetSkeleton } from '../Common/Skeletons.tsx';
import { useApp } from '../../context/AppContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Link as LinkIcon,
  BadgeCheck,
  Bell,
  BellOff,
  Share2,
} from 'lucide-react';

interface Props {
  username: string;
}

export const ProfileView: React.FC<Props> = ({ username }) => {
  const cleanUsername = username.replace(/^@/, '');
  const [profile, setProfile] = useState<User | null>(null);
  const [timeline, setTimeline] = useState<Tweet[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'replies' | 'media' | 'likes'>('posts');
  const [loading, setLoading] = useState(true);
  const [loadingTweets, setLoadingTweets] = useState(true);
  const { navigate, settings, updateSettings } = useApp();
  const { showToast } = useToast();

  const isWatched = settings.watchlist.accounts.includes(cleanUsername.toLowerCase());

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setLoadingTweets(true);

    const headers: Record<string, string> = {};
    if (settings.byoCookies.authToken && settings.byoCookies.ct0) {
      headers['x-byo-auth-token'] = settings.byoCookies.authToken;
      headers['x-byo-ct0'] = settings.byoCookies.ct0;
    }

    // Fetch Profile
    fetch(`/api/profile/${cleanUsername}`, { headers })
      .then((r) => r.json())
      .then((data: User) => {
        if (isMounted) {
          setProfile(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    // Fetch Timeline
    fetch(`/api/timeline/${cleanUsername}`, { headers })
      .then((r) => r.json())
      .then((data: TimelineResponse) => {
        if (isMounted) {
          setTimeline(data.tweets || []);
          setLoadingTweets(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoadingTweets(false);
      });

    return () => {
      isMounted = false;
    };
  }, [cleanUsername, settings.byoCookies]);

  const toggleWatch = () => {
    const list = settings.watchlist.accounts;
    const lower = cleanUsername.toLowerCase();
    const next = isWatched ? list.filter((u) => u !== lower) : [...list, lower];
    updateSettings({
      watchlist: { ...settings.watchlist, accounts: next },
    });
    showToast(isWatched ? `Removed @${cleanUsername} from watchlist` : `Watching @${cleanUsername} for updates`, 'info');
  };

  const getProxyUrl = (url?: string) =>
    url ? `/api/proxy/media?url=${encodeURIComponent(url)}` : '';

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (!profile) {
    return (
      <div className="p-8 text-center">
        <h3 className="text-base font-bold text-white mb-2">Account does not exist</h3>
        <p className="text-xs text-neutral-400 mb-4">Try searching for another user or verify the handle.</p>
        <button
          onClick={() => navigate('for-you')}
          className="px-4 py-2 rounded-full bg-neutral-800 text-xs font-semibold text-white"
        >
          Return Home
        </button>
      </div>
    );
  }

  const filteredTweets = timeline.filter((t) => {
    if (activeTab === 'media') return t.media && t.media.length > 0;
    if (activeTab === 'replies') return Boolean(t.replyToUsername);
    return true;
  });

  return (
    <div>
      {/* Sticky top bar */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-neutral-800 px-4 py-2 flex items-center gap-6">
        <button
          onClick={() => window.history.back()}
          className="p-1.5 rounded-full hover:bg-neutral-900 transition text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-white leading-tight flex items-center gap-1.5">
            <span>{profile.name}</span>
            {profile.verified && <BadgeCheck className="w-4 h-4 text-sky-400 fill-current" />}
          </h2>
          <p className="text-xs text-neutral-500">{profile.stats.tweets.toLocaleString()} posts</p>
        </div>
      </div>

      {/* Banner */}
      <div className="h-36 sm:h-48 bg-neutral-850 w-full overflow-hidden relative">
        {profile.banner && (
          <img
            src={getProxyUrl(profile.banner)}
            alt="Header banner"
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Profile Header Card */}
      <div className="px-4 pb-4 border-b border-neutral-800 relative">
        <div className="flex items-end justify-between -mt-14 sm:-mt-16 mb-4">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-black bg-neutral-900 overflow-hidden relative shadow-xl">
            {profile.avatar ? (
              <img
                src={getProxyUrl(profile.avatar)}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-neutral-500">
                {profile.name.charAt(0)}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(`https://x.com/${profile.username}`);
                  showToast('Profile link copied', 'info');
                }
              }}
              className="p-2 rounded-full border border-neutral-700 hover:bg-neutral-900 text-white transition"
              title="Share Profile"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={toggleWatch}
              className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition ${
                isWatched
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
                  : 'bg-white hover:bg-neutral-200 text-black'
              }`}
            >
              {isWatched ? (
                <>
                  <BellOff className="w-3.5 h-3.5 text-sky-400" />
                  <span>Watching</span>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5" />
                  <span>Watch Account</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Name and Handle */}
        <div className="mb-3">
          <h1 className="text-xl font-bold text-white flex items-center gap-1">
            <span>{profile.name}</span>
            {profile.verified && <BadgeCheck className="w-4 h-4 text-sky-400 fill-current" />}
          </h1>
          <p className="text-xs text-neutral-500">@{profile.username}</p>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-sm text-neutral-200 leading-relaxed mb-3 whitespace-pre-line">
            {profile.bio}
          </p>
        )}

        {/* Metadata info */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-neutral-400 mb-3">
          {profile.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-neutral-500" />
              <span>{profile.location}</span>
            </div>
          )}
          {profile.website && (
            <div className="flex items-center gap-1">
              <LinkIcon className="w-3.5 h-3.5 text-neutral-500" />
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:underline truncate max-w-[200px]"
              >
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
          {profile.joined && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-neutral-500" />
              <span>Joined {new Date(profile.joined).toLocaleDateString([], { month: 'long', year: 'numeric' })}</span>
            </div>
          )}
        </div>

        {/* Following / Followers count */}
        <div className="flex gap-4 text-xs">
          <span>
            <strong className="text-white font-bold">{profile.stats.following.toLocaleString()}</strong>{' '}
            <span className="text-neutral-500">Following</span>
          </span>
          <span>
            <strong className="text-white font-bold">{profile.stats.followers.toLocaleString()}</strong>{' '}
            <span className="text-neutral-500">Followers</span>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-800 text-sm font-semibold">
        {(['posts', 'replies', 'media', 'likes'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-center capitalize transition relative ${
              activeTab === tab ? 'text-white font-bold' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <span>{tab}</span>
            {activeTab === tab && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-sky-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tweets list */}
      {loadingTweets ? (
        <>
          <TweetSkeleton />
          <TweetSkeleton />
        </>
      ) : filteredTweets.length > 0 ? (
        filteredTweets.map((tweet) => <TweetCard key={tweet.id} tweet={tweet} />)
      ) : (
        <div className="p-12 text-center text-xs text-neutral-500">
          No {activeTab} available for this account
        </div>
      )}
    </div>
  );
};
