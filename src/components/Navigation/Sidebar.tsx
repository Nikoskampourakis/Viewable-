import React from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { ViewType } from '../../types/index.ts';
import { PWAInstallButton } from '../Common/PWAInstallButton.tsx';
import {
  Home,
  Search,
  Bell,
  Bookmark,
  Settings,
  Feather,
  ShieldAlert,
  Activity,
  Newspaper,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    activeView,
    navigate,
    unreadNotificationCount,
    setIsComposeOpen,
    setIsSettingsOpen,
    setIsPanicModalOpen,
  } = useApp();

  const navItems: { id: ViewType; label: string; icon: any; badge?: number }[] = [
    { id: 'for-you', label: 'Home', icon: Home },
    { id: 'explore', label: 'Explore', icon: Search },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotificationCount },
    { id: 'news', label: 'News', icon: Newspaper },
    { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
    { id: 'health', label: 'Health', icon: Activity },
  ];

  return (
    <aside className="w-16 xl:w-64 h-screen sticky top-0 flex flex-col justify-between py-3 px-2 sm:px-3 border-r border-neutral-800 select-none">
      <div className="flex flex-col gap-2">
        {/* Viewable Logo */}
        <div
          onClick={() => navigate('for-you')}
          className="p-3 rounded-full hover:bg-neutral-900 transition cursor-pointer w-fit flex items-center gap-3 text-white"
          title="Viewable Home"
        >
          <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center font-black shadow-lg shadow-sky-500/20">
            <span className="text-lg">V</span>
          </div>
          <span className="hidden xl:inline text-xl font-extrabold tracking-tight">Viewable</span>
        </div>

        {/* Navigation items */}
        <nav className="flex flex-col gap-1 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`flex items-center gap-4 p-3 rounded-full transition w-full xl:w-fit group ${
                  isActive
                    ? 'font-bold text-white'
                    : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px] text-sky-400' : ''}`} />
                  {Boolean(item.badge && item.badge > 0) && (
                    <span className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-sky-500 text-[10px] text-white font-bold flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="hidden xl:inline text-lg">{item.label}</span>
              </button>
            );
          })}

          {/* Settings button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-4 p-3 rounded-full transition w-full xl:w-fit text-neutral-300 hover:bg-neutral-900 hover:text-white"
          >
            <Settings className="w-6 h-6" />
            <span className="hidden xl:inline text-lg">Settings</span>
          </button>
        </nav>

        {/* Post Button */}
        <button
          onClick={() => setIsComposeOpen(true)}
          className="mt-4 p-3 xl:py-3.5 xl:px-8 rounded-full bg-sky-500 hover:bg-sky-400 text-white font-bold shadow-lg shadow-sky-500/20 transition flex items-center justify-center gap-2"
          title="Compose Post"
        >
          <Feather className="w-5 h-5 xl:hidden" />
          <span className="hidden xl:inline text-base">Post</span>
        </button>

        {/* PWA Install Button */}
        <div className="hidden xl:block mt-3 px-1">
          <PWAInstallButton />
        </div>
      </div>

      {/* Bottom Emergency Panic Button */}
      <div className="pt-3 border-t border-neutral-850">
        <button
          onClick={() => setIsPanicModalOpen(true)}
          className="flex items-center gap-3 p-3 rounded-full hover:bg-rose-950/40 text-rose-400/90 hover:text-rose-400 transition w-full group border border-transparent hover:border-rose-900/50"
          title="Emergency Panic Purge (Shift+P)"
        >
          <ShieldAlert className="w-6 h-6 shrink-0" />
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-bold leading-tight">Panic Purge</span>
            <span className="text-[10px] text-neutral-500">Wipe all local data</span>
          </div>
        </button>
      </div>
    </aside>
  );
};
