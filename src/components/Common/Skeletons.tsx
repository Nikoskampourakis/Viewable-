import React from 'react';

export const TweetSkeleton: React.FC = () => {
  return (
    <div className="border-b border-neutral-800 p-4 animate-pulse">
      <div className="flex gap-3">
        {/* Avatar skeleton */}
        <div className="w-10 h-10 rounded-full bg-neutral-800 shrink-0" />
        <div className="flex-1 space-y-3">
          {/* Header line */}
          <div className="flex items-center gap-2">
            <div className="h-4 w-28 bg-neutral-800 rounded" />
            <div className="h-3 w-16 bg-neutral-800/60 rounded" />
            <div className="h-3 w-10 bg-neutral-800/40 rounded" />
          </div>
          {/* Body lines */}
          <div className="h-4 w-11/12 bg-neutral-800 rounded" />
          <div className="h-4 w-4/5 bg-neutral-800 rounded" />
          <div className="h-4 w-2/3 bg-neutral-800 rounded" />
          {/* Media box skeleton */}
          <div className="h-48 w-full bg-neutral-850 rounded-2xl border border-neutral-800" />
          {/* Action bar skeleton */}
          <div className="flex justify-between pt-2 pr-6">
            <div className="h-4 w-10 bg-neutral-800/50 rounded" />
            <div className="h-4 w-10 bg-neutral-800/50 rounded" />
            <div className="h-4 w-10 bg-neutral-800/50 rounded" />
            <div className="h-4 w-10 bg-neutral-800/50 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProfileSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse">
      <div className="h-44 sm:h-52 bg-neutral-850 w-full" />
      <div className="p-4 relative">
        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-neutral-800 border-4 border-black -mt-16 sm:-mt-20 mb-3" />
        <div className="h-6 w-40 bg-neutral-800 rounded mb-2" />
        <div className="h-4 w-24 bg-neutral-800/60 rounded mb-4" />
        <div className="h-4 w-3/4 bg-neutral-800 rounded mb-2" />
        <div className="h-4 w-1/2 bg-neutral-800 rounded mb-6" />
        <div className="flex gap-4 border-b border-neutral-800 pb-3">
          <div className="h-4 w-16 bg-neutral-800 rounded" />
          <div className="h-4 w-16 bg-neutral-800 rounded" />
          <div className="h-4 w-16 bg-neutral-800 rounded" />
        </div>
      </div>
    </div>
  );
};
