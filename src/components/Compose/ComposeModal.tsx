import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import {
  X,
  Image,
  BarChart2,
  Smile,
  Plus,
  Trash2,
  Send,
  Loader2,
  KeyRound,
  FileText,
} from 'lucide-react';

export const ComposeModal: React.FC = () => {
  const { isComposeOpen, setIsComposeOpen, setIsSettingsOpen } = useApp();
  const { showToast } = useToast();

  const [text, setText] = useState('');
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollDurationHours, setPollDurationHours] = useState(24);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userToken, setUserToken] = useState<string | null>(null);

  // Load drafts and user tokens from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('viewable_x_bearer_token');
    if (savedToken) setUserToken(savedToken);

    const savedDraft = localStorage.getItem('viewable_draft');
    if (savedDraft) setText(savedDraft);
  }, [isComposeOpen]);

  if (!isComposeOpen) return null;

  const charCount = text.length;
  const charsRemaining = 280 - charCount;
  const isOverLimit = charsRemaining < 0;

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    localStorage.setItem('viewable_draft', e.target.value);
  };

  const handleAddPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const handlePollOptionChange = (index: number, val: string) => {
    const next = [...pollOptions];
    next[index] = val;
    setPollOptions(next);
  };

  const handlePost = async () => {
    if (!text.trim() && !showPoll) return;
    if (isOverLimit) {
      showToast('Tweet exceeds 280 character limit', 'error');
      return;
    }

    if (!userToken) {
      showToast('Connect your X Developer account or Bearer token in Settings to post', 'info');
      setIsSettingsOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = { text };
      if (showPoll) {
        const validOptions = pollOptions.filter((o) => o.trim().length > 0);
        if (validOptions.length < 2) {
          showToast('Polls require at least 2 options', 'error');
          setIsSubmitting(false);
          return;
        }
        payload.poll = {
          options: validOptions,
          durationMinutes: pollDurationHours * 60,
        };
      }

      const res = await fetch('/api/tweet/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to publish tweet');
      }

      showToast('Post published successfully!', 'success');
      localStorage.removeItem('viewable_draft');
      setText('');
      setShowPoll(false);
      setIsComposeOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Error posting to X', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={() => setIsComposeOpen(false)}
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl p-4 sm:p-5 relative"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <button
            onClick={() => setIsComposeOpen(false)}
            className="text-neutral-400 hover:text-white p-1 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            {text && (
              <button
                onClick={() => {
                  setText('');
                  localStorage.removeItem('viewable_draft');
                }}
                className="text-xs text-neutral-500 hover:text-rose-400 font-medium flex items-center gap-1 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Draft</span>
              </button>
            )}
          </div>
        </div>

        {/* Text Input Area */}
        <div className="mt-3 flex gap-3">
          <div className="w-10 h-10 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-sm shrink-0">
            You
          </div>
          <div className="flex-1">
            <textarea
              value={text}
              onChange={handleTextChange}
              placeholder="What is happening?!"
              rows={4}
              className="w-full bg-transparent text-white placeholder-neutral-500 text-base resize-none focus:outline-none leading-relaxed"
              autoFocus
            />

            {/* Poll Builder Component */}
            {showPoll && (
              <div className="p-3.5 rounded-xl border border-neutral-800 bg-black/40 space-y-2.5 my-3">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-400 mb-1">
                  <span>Poll Options</span>
                  <button
                    onClick={() => setShowPoll(false)}
                    className="text-neutral-500 hover:text-neutral-300"
                  >
                    Remove
                  </button>
                </div>
                {pollOptions.map((opt, i) => (
                  <input
                    key={i}
                    type="text"
                    value={opt}
                    onChange={(e) => handlePollOptionChange(i, e.target.value)}
                    placeholder={`Choice ${i + 1}`}
                    maxLength={25}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-sky-500"
                  />
                ))}
                {pollOptions.length < 4 && (
                  <button
                    onClick={handleAddPollOption}
                    className="text-xs text-sky-400 hover:underline flex items-center gap-1 pt-1 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Choice</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Account connection status disclaimer */}
        {!userToken && (
          <div className="my-3 p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-neutral-400">
              <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Connect X developer credentials to publish</span>
            </div>
            <button
              onClick={() => {
                setIsComposeOpen(false);
                setIsSettingsOpen(true);
              }}
              className="text-sky-400 font-semibold hover:underline"
            >
              Settings
            </button>
          </div>
        )}

        {/* Bottom toolbar */}
        <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-1 text-sky-400">
            <button
              onClick={() => setShowPoll(!showPoll)}
              className={`p-2 rounded-full hover:bg-sky-500/10 transition ${showPoll ? 'text-white bg-sky-500/20' : ''}`}
              title="Add Poll"
            >
              <BarChart2 className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Character counter circle */}
            <span
              className={`text-xs font-mono font-semibold ${
                isOverLimit
                  ? 'text-rose-500'
                  : charsRemaining <= 20
                  ? 'text-amber-400'
                  : 'text-neutral-500'
              }`}
            >
              {charsRemaining}
            </span>

            <button
              onClick={handlePost}
              disabled={isSubmitting || (!text.trim() && !showPoll) || isOverLimit}
              className="px-5 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm disabled:opacity-50 transition flex items-center gap-1.5 shadow-md shadow-sky-500/20"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>Post</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
