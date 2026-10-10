import React from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { TweetCard } from '../Tweet/TweetCard.tsx';
import { Bookmark, Trash2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext.tsx';

export const BookmarksView: React.FC = () => {
  const { bookmarks, updateSettings } = useApp();
  const { showToast } = useToast();

  const handleClearAll = () => {
    localStorage.removeItem('viewable_bookmarks');
    window.location.reload();
  };

  return (
    <div>
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-sky-400" />
            <span>Bookmarks</span>
          </h2>
          <p className="text-xs text-neutral-500">Saved privately on this device</p>
        </div>
        {bookmarks.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs font-semibold text-neutral-400 hover:text-rose-400 flex items-center gap-1 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear all</span>
          </button>
        )}
      </div>

      <div className="divide-y divide-neutral-800">
        {bookmarks.length === 0 ? (
          <div className="p-12 text-center text-xs text-neutral-500 space-y-2">
            <Bookmark className="w-8 h-8 mx-auto opacity-30 text-sky-400" />
            <p className="font-bold text-white">Save posts for later</p>
            <p className="max-w-xs mx-auto text-neutral-400">
              Click the bookmark icon on any post to store it locally in private storage.
            </p>
          </div>
        ) : (
          bookmarks.map((tweet) => <TweetCard key={tweet.id} tweet={tweet} />)
        )}
      </div>
    </div>
  );
};
