import React, { useState } from 'react';
import { Tweet } from '../../types/index.ts';
import { BrainCircuit, X, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface Props {
  tweet: Tweet;
  onClose: () => void;
}

export const AIAnalysisModal: React.FC<Props> = ({ tweet, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async (userQuestion?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tweetText: tweet.text,
          author: tweet.author.username,
          question: userQuestion || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(`Analysis service returned HTTP ${res.status}`);
      }

      const data = await res.json();
      setAnalysis(data.analysis);
    } catch (err: any) {
      setError(err?.message || 'Failed to complete AI reasoning');
    } finally {
      setLoading(false);
    }
  };

  // Run on mount
  React.useEffect(() => {
    runAnalysis();
  }, []);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl relative overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Deep Thread Thinker & Fact-Checker</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60">
                  Gemini 3.1 Pro · High Thinking
                </span>
              </h3>
              <p className="text-[11px] text-neutral-400">
                Rigorous logical breakdown, verification, and counter-perspectives
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content area */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Quote of tweet being analyzed */}
          <div className="p-3 rounded-xl bg-black/40 border border-neutral-800 text-xs text-neutral-300">
            <span className="font-semibold text-neutral-400">@{tweet.author.username}: </span>
            <span>"{tweet.text.slice(0, 220)}{tweet.text.length > 220 ? '...' : ''}"</span>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-white">Engaging High Reasoning Mode...</p>
                <p className="text-xs text-neutral-400">
                  Synthesizing evidence, checking facts, and balancing viewpoints
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="prose prose-invert prose-xs max-w-none text-neutral-200 leading-relaxed space-y-3 whitespace-pre-wrap">
              {analysis}
            </div>
          )}
        </div>

        {/* Custom question input */}
        <div className="p-3.5 border-t border-neutral-800 bg-neutral-950/60 flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && question.trim()) {
                runAnalysis(question.trim());
              }
            }}
            placeholder="Ask a specific question about this post..."
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-full px-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-sky-500"
          />
          <button
            onClick={() => question.trim() && runAnalysis(question.trim())}
            disabled={loading || !question.trim()}
            className="px-4 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold disabled:opacity-40 transition flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Analyze</span>
          </button>
        </div>
      </div>
    </div>
  );
};
