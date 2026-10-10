/**
 * Viewable Main Application
 */

import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { ToastProvider } from './context/ToastContext.tsx';
import { Sidebar } from './components/Navigation/Sidebar.tsx';
import { RightSidebar } from './components/Navigation/RightSidebar.tsx';
import { MobileNav } from './components/Navigation/MobileNav.tsx';
import { Header } from './components/Navigation/Header.tsx';
import { TimelineFeed } from './components/Tweet/TimelineFeed.tsx';
import { SearchBar } from './components/Search/SearchBar.tsx';
import { NotificationCenter } from './components/Notifications/NotificationCenter.tsx';
import { NewsView } from './components/News/NewsView.tsx';
import { BookmarksView } from './components/Bookmarks/BookmarksView.tsx';
import { ProviderHealthView } from './components/Health/ProviderHealthView.tsx';
import { TweetThread } from './components/Tweet/TweetThread.tsx';
import { ProfileView } from './components/Profile/ProfileView.tsx';
import { ArticleView } from './components/Tweet/ArticleView.tsx';
import { ComposeModal } from './components/Compose/ComposeModal.tsx';
import { SettingsModal } from './components/Settings/SettingsModal.tsx';
import { PanicButtonModal } from './components/Common/PanicButton.tsx';
import { MediaLightbox } from './components/Tweet/MediaLightbox.tsx';
import { useOnlineStatus } from './hooks/useOnlineStatus.ts';
import { useHotkeys } from './hooks/useHotkeys.ts';
import { WifiOff } from 'lucide-react';

const MainView: React.FC = () => {
  const { activeView, selectedTweetId, selectedUsername } = useApp();
  const isOnline = useOnlineStatus();
  useHotkeys();

  // Register service worker on mount
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex justify-center">
      <div className="w-full max-w-7xl flex">
        {/* Left Nav Sidebar */}
        <Sidebar />

        {/* Center Main Stream */}
        <main className="flex-1 min-h-screen border-r border-neutral-800 max-w-2xl w-full pb-20 sm:pb-8">
          {/* Header */}
          {activeView !== 'tweet' && activeView !== 'profile' && activeView !== 'article-view' && (
            <Header />
          )}

          {/* Offline Banner */}
          {!isOnline && (
            <div className="bg-amber-600/90 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2">
              <WifiOff className="w-4 h-4 shrink-0" />
              <span>You are currently offline. Serving cached posts from local storage.</span>
            </div>
          )}

          {/* View Routing */}
          {activeView === 'for-you' && <TimelineFeed mode="for-you" />}
          {activeView === 'following' && <TimelineFeed mode="following" />}
          {activeView === 'explore' && <SearchBar />}
          {activeView === 'notifications' && <NotificationCenter />}
          {activeView === 'news' && <NewsView />}
          {activeView === 'bookmarks' && <BookmarksView />}
          {activeView === 'health' && <ProviderHealthView />}
          {activeView === 'tweet' && <TweetThread tweetId={selectedTweetId || ''} />}
          {activeView === 'profile' && <ProfileView username={selectedUsername || ''} />}
          {activeView === 'article-view' && <ArticleView tweetId={selectedTweetId || ''} />}
        </main>

        {/* Right Sidebar (Trends, Search, News) */}
        <RightSidebar />
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />

      {/* Global Modals & Lightbox */}
      <ComposeModal />
      <SettingsModal />
      <PanicButtonModal />
      <MediaLightbox />
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AppProvider>
        <MainView />
      </AppProvider>
    </ToastProvider>
  );
}
