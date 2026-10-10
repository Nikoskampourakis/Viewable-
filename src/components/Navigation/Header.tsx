import React from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { PWAInstallButton } from '../Common/PWAInstallButton.tsx';
import { Sparkles } from 'lucide-react';

export const Header: React.FC = () => {
  const { activeView, navigate } = useApp();

  const isHome = activeView === 'for-you' || activeView === 'following';

  return (
    <header className="sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-neutral-800">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          {isHome ? (
            <div className="flex text-sm font-bold">
              <button
                onClick={() => navigate('for-you')}
                className={`px-4 py-2 transition relative ${
                  activeView === 'for-you' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <span>For You</span>
                {activeView === 'for-you' && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-sky-500 rounded-full" />
                )}
              </button>
              <button
                onClick={() => navigate('following')}
                className={`px-4 py-2 transition relative ${
                  activeView === 'following' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <span>Following</span>
                {activeView === 'following' && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-sky-500 rounded-full" />
                )}
              </button>
            </div>
          ) : (
            <h1 className="text-lg font-bold text-white capitalize">
              {activeView.replace('-', ' ')}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-2">
          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};
