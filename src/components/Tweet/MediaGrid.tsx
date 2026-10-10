import React, { useState } from 'react';
import { Media } from '../../types/index.ts';
import { Play, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';

interface Props {
  media: Media[];
  isSensitive?: boolean;
}

export const MediaGrid: React.FC<Props> = ({ media, isSensitive }) => {
  const { settings, openLightbox } = useApp();
  const [revealed, setRevealed] = useState(!settings.blurSensitive || !isSensitive);

  if (!media || media.length === 0) return null;

  const count = media.length;

  const getProxyUrl = (url: string) => `/api/proxy/media?url=${encodeURIComponent(url)}`;

  return (
    <div className="mt-3 relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900">
      {/* Sensitive Media Overlay */}
      {isSensitive && settings.blurSensitive && !revealed && (
        <div className="absolute inset-0 z-10 backdrop-blur-2xl bg-neutral-950/70 flex flex-col items-center justify-center p-4 text-center">
          <EyeOff className="w-8 h-8 text-neutral-400 mb-2" />
          <p className="text-sm font-semibold text-white">Sensitive Content</p>
          <p className="text-xs text-neutral-400 max-w-xs mt-1">
            This media has been flagged as sensitive. Click below to reveal.
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setRevealed(true);
            }}
            className="mt-3 px-4 py-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white border border-neutral-700 flex items-center gap-1.5 transition"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Show Media</span>
          </button>
        </div>
      )}

      {/* 1 Media item */}
      {count === 1 && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            openLightbox(media, 0);
          }}
          className="relative max-h-[520px] overflow-hidden cursor-pointer group"
        >
          {media[0].type === 'video' || media[0].type === 'animated_gif' ? (
            <div className="relative">
              <img
                src={getProxyUrl(media[0].previewUrl || media[0].url)}
                alt={media[0].alt || 'Video preview'}
                className="w-full object-cover max-h-[500px]"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/35 transition">
                <div className="w-14 h-14 rounded-full bg-sky-500/90 text-white flex items-center justify-center shadow-xl group-hover:scale-105 transition">
                  <Play className="w-6 h-6 ml-0.5 fill-current" />
                </div>
              </div>
              {media[0].type === 'animated_gif' && (
                <span className="absolute bottom-2 left-2 bg-black/75 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                  GIF
                </span>
              )}
            </div>
          ) : (
            <img
              src={getProxyUrl(media[0].url)}
              alt={media[0].alt || 'Post media'}
              className="w-full object-cover max-h-[500px] hover:scale-[1.01] transition duration-200"
              loading="lazy"
            />
          )}
        </div>
      )}

      {/* 2 Media items */}
      {count === 2 && (
        <div className="grid grid-cols-2 gap-0.5 h-72">
          {media.map((item, idx) => (
            <div
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                openLightbox(media, idx);
              }}
              className="relative h-full overflow-hidden cursor-pointer group"
            >
              <img
                src={getProxyUrl(item.previewUrl || item.url)}
                alt={item.alt || ''}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                loading="lazy"
              />
              {item.type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Play className="w-10 h-10 text-white fill-current" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 3 Media items */}
      {count === 3 && (
        <div className="grid grid-cols-2 gap-0.5 h-72">
          <div
            onClick={(e) => {
              e.stopPropagation();
              openLightbox(media, 0);
            }}
            className="relative h-full overflow-hidden cursor-pointer"
          >
            <img
              src={getProxyUrl(media[0].previewUrl || media[0].url)}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="grid grid-rows-2 gap-0.5 h-full">
            {media.slice(1, 3).map((item, idx) => (
              <div
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  openLightbox(media, idx + 1);
                }}
                className="relative h-full overflow-hidden cursor-pointer"
              >
                <img
                  src={getProxyUrl(item.previewUrl || item.url)}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4 Media items */}
      {count >= 4 && (
        <div className="grid grid-cols-2 grid-rows-2 gap-0.5 h-80">
          {media.slice(0, 4).map((item, idx) => (
            <div
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                openLightbox(media, idx);
              }}
              className="relative h-full overflow-hidden cursor-pointer group"
            >
              <img
                src={getProxyUrl(item.previewUrl || item.url)}
                alt=""
                className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
