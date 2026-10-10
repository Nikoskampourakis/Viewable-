import React from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { ShieldAlert, Trash2, X } from 'lucide-react';

export const PanicButtonModal: React.FC = () => {
  const { isPanicModalOpen, setIsPanicModalOpen, panicWipe } = useApp();

  if (!isPanicModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-neutral-950 border border-rose-900/60 p-6 shadow-2xl relative">
        <button
          onClick={() => setIsPanicModalOpen(false)}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-800 flex items-center justify-center text-rose-400 mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <h3 className="text-xl font-bold text-white">Emergency Panic Purge</h3>
        <p className="mt-2 text-sm text-neutral-300 leading-relaxed">
          Executing this will <strong>instantly destroy</strong>:
        </p>

        <ul className="mt-2 text-xs text-neutral-400 space-y-1 list-disc list-inside">
          <li>All stored bookmarks and custom watchlists</li>
          <li>Cached timelines, avatars, and media files</li>
          <li>BYO session cookies and X developer tokens</li>
          <li>Local interaction logs and algorithm preferences</li>
          <li>All service worker offline caches and cookies</li>
        </ul>

        <p className="mt-3 text-xs text-rose-400/90 font-medium">
          Zero network packets are sent. Your browser state is wiped completely clean in a single operation.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setIsPanicModalOpen(false)}
            className="flex-1 py-2.5 px-4 rounded-full border border-neutral-700 hover:bg-neutral-900 text-sm font-semibold text-neutral-300 transition"
          >
            Cancel
          </button>
          <button
            onClick={panicWipe}
            className="flex-1 py-2.5 px-4 rounded-full bg-rose-600 hover:bg-rose-500 text-sm font-semibold text-white flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40 transition"
          >
            <Trash2 className="w-4 h-4" />
            <span>Purge Everything</span>
          </button>
        </div>
      </div>
    </div>
  );
};
