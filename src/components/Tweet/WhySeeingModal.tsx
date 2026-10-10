import React from 'react';
import { Tweet } from '../../types/index.ts';
import { useApp } from '../../context/AppContext.tsx';
import { Sliders, X, ShieldCheck } from 'lucide-react';

interface Props {
  tweet: Tweet;
  onClose: () => void;
}

export const WhySeeingModal: React.FC<Props> = ({ tweet, onClose }) => {
  const { scoreTweet, settings } = useApp();
  const { score, factors } = scoreTweet(tweet);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 text-sky-400 mb-2">
          <Sliders className="w-5 h-5" />
          <h3 className="text-base font-bold text-white">Why Am I Seeing This?</h3>
        </div>

        <p className="text-xs text-neutral-300 leading-relaxed mb-4">
          Viewable computes your feed ranking <strong>entirely on-device</strong> using local math. No behavioral profile is sent to any server.
        </p>

        {/* Formula breakdown */}
        <div className="p-3 rounded-xl bg-black/50 border border-neutral-800/80 mb-4 font-mono text-[11px] text-neutral-400 overflow-x-auto">
          <code>score = w1·recency + w2·affinity + w3·velocity + w4·diversity - w5·repetition</code>
        </div>

        {/* Factors Breakdown */}
        <div className="space-y-2.5 mb-5">
          {Object.entries(factors).map(([factorName, value]) => (
            <div key={factorName} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-300">{factorName}</span>
                <span className="font-semibold text-sky-400">{value}%</span>
              </div>
              <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Computed locally on your device</span>
          </div>
          <span className="font-mono text-neutral-300">Score: {score.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};
