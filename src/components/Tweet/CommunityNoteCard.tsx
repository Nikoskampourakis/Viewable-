import React from 'react';
import { CommunityNote } from '../../types/index.ts';
import { Info, ExternalLink } from 'lucide-react';

interface Props {
  note: CommunityNote;
}

export const CommunityNoteCard: React.FC<Props> = ({ note }) => {
  return (
    <div className="mt-3 rounded-2xl border border-neutral-700/80 bg-neutral-900/60 p-3.5 text-neutral-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-400">
          <Info className="w-4 h-4 shrink-0" />
          <span>Readers added context they thought people might want to know</span>
        </div>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
          {note.status === 'CURRENTLY_RATED_HELPFUL' ? 'Rated Helpful' : 'Under Review'}
        </span>
      </div>

      <p className="text-xs text-neutral-300 leading-relaxed font-normal whitespace-pre-line">
        {note.text}
      </p>

      {note.sources && note.sources.length > 0 && (
        <div className="mt-2.5 pt-2 border-t border-neutral-800/80 flex flex-wrap gap-2 text-[11px] text-neutral-400">
          <span className="font-medium text-neutral-500">Sources:</span>
          {note.sources.map((src, i) => (
            <a
              key={i}
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sky-400 hover:underline max-w-[200px] truncate"
            >
              <span>{new URL(src).hostname}</span>
              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
