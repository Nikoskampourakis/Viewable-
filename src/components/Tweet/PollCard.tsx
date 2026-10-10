import React, { useState } from 'react';
import { Poll } from '../../types/index.ts';
import { CheckCircle2 } from 'lucide-react';

interface Props {
  poll: Poll;
}

export const PollCard: React.FC<Props> = ({ poll }) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(poll.isClosed);

  const handleVote = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasVoted) return;
    setSelectedOption(idx);
    setHasVoted(true);
  };

  return (
    <div className="mt-3 space-y-2 max-w-lg">
      {poll.options.map((opt, idx) => {
        const isSelected = selectedOption === idx;
        const percent = opt.percent || 0;

        return (
          <div
            key={idx}
            onClick={(e) => handleVote(idx, e)}
            className={`relative overflow-hidden rounded-xl border text-sm font-medium transition cursor-pointer select-none ${
              hasVoted
                ? 'border-neutral-800 bg-neutral-900/50'
                : 'border-neutral-750 hover:bg-neutral-800/50 bg-neutral-900/20'
            }`}
          >
            {/* Progress bar background */}
            {hasVoted && (
              <div
                className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                  isSelected ? 'bg-sky-500/25' : 'bg-neutral-800/60'
                }`}
                style={{ width: `${percent}%` }}
              />
            )}

            <div className="relative z-10 flex items-center justify-between p-3">
              <span className="flex items-center gap-2 text-white">
                {isSelected && <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />}
                <span>{opt.label}</span>
              </span>
              {hasVoted && (
                <span className="font-semibold text-neutral-300 ml-2 shrink-0">
                  {percent}%
                </span>
              )}
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-between text-xs text-neutral-400 px-1 pt-1">
        <span>{poll.totalVotes.toLocaleString()} votes</span>
        <span>{poll.isClosed ? 'Final results' : 'Poll active'}</span>
      </div>
    </div>
  );
};
