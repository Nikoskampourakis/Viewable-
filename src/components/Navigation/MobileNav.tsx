import React from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Home, Search, Bell, Newspaper, Feather, Settings } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const {
    activeView,
    navigate,
    unreadNotificationCount,
    setIsComposeOpen,
    setIsSettingsOpen,
  } = useApp();

  return (
    <>
      {/* Floating Action Button for compose */}
      <button
        onClick={() => setIsComposeOpen(true)}
        className="sm:hidden fixed bottom-18 right-4 z-40 w-13 h-13 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-xl shadow-sky-500/30"
        title="Compose Post"
      >
        <Feather className="w-6 h-6" />
      </button>

      {/* Bottom Nav Bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-md border-t border-neutral-800 flex items-center justify-around py-2 px-1">
        <button
          onClick={() => navigate('for-you')}
          className={`p-2 rounded-full transition ${activeView === 'for-you' ? 'text-sky-400 font-bold' : 'text-neutral-400'}`}
        >
          <Home className="w-6 h-6" />
        </button>

        <button
          onClick={() => navigate('explore')}
          className={`p-2 rounded-full transition ${activeView === 'explore' ? 'text-sky-400 font-bold' : 'text-neutral-400'}`}
        >
          <Search className="w-6 h-6" />
        </button>

        <button
          onClick={() => navigate('news')}
          className={`p-2 rounded-full transition ${activeView === 'news' ? 'text-sky-400 font-bold' : 'text-neutral-400'}`}
        >
          <Newspaper className="w-6 h-6" />
        </button>

        <button
          onClick={() => navigate('notifications')}
          className={`p-2 rounded-full relative transition ${activeView === 'notifications' ? 'text-sky-400 font-bold' : 'text-neutral-400'}`}
        >
          <Bell className="w-6 h-6" />
          {unreadNotificationCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-sky-500" />
          )}
        </button>

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 rounded-full text-neutral-400 hover:text-white transition"
        >
          <Settings className="w-6 h-6" />
        </button>
      </nav>
    </>
  );
};
