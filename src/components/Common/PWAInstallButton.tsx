import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall.ts';
import { Download } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-full bg-sky-500 hover:bg-sky-400 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-full border border-neutral-700 hover:border-neutral-500 px-3 py-1.5 text-xs font-semibold text-neutral-300 transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl">
              <h3 className="text-base font-bold text-white">Install Viewable on iPhone / iPad</h3>
              <p className="mt-3 text-sm text-neutral-300 leading-relaxed">
                1. Tap the <strong>Share</strong> icon (square with arrow) in the Safari toolbar.<br />
                2. Scroll down and tap <strong>Add to Home Screen</strong>.<br />
                3. Enjoy an anonymous, fullscreen X client!
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-full bg-neutral-800 hover:bg-neutral-700 py-2.5 text-sm font-semibold text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
