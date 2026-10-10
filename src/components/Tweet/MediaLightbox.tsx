import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { X, ChevronLeft, ChevronRight, Download, Volume2, VolumeX } from 'lucide-react';

export const MediaLightbox: React.FC = () => {
  const { activeLightbox, closeLightbox } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    if (activeLightbox) {
      setCurrentIndex(activeLightbox.initialIndex || 0);
    }
  }, [activeLightbox]);

  if (!activeLightbox || !activeLightbox.media.length) return null;

  const currentMedia = activeLightbox.media[currentIndex];
  const total = activeLightbox.media.length;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : total - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev < total - 1 ? prev + 1 : 0));
  };

  const getProxyUrl = (url: string) => `/api/proxy/media?url=${encodeURIComponent(url)}`;

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const downloadUrl = getProxyUrl(currentMedia.url);
      const res = await fetch(downloadUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const ext = currentMedia.type === 'video' ? 'mp4' : currentMedia.type === 'animated_gif' ? 'gif' : 'jpg';
      a.download = `viewable-media-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(getProxyUrl(currentMedia.url), '_blank');
    }
  };

  return (
    <div
      onClick={closeLightbox}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200"
    >
      {/* Top action bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-auto">
        <span className="text-sm font-medium text-neutral-400">
          {total > 1 ? `${currentIndex + 1} / ${total}` : ''}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="p-2.5 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-white transition border border-neutral-850"
            title="Download Media"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={closeLightbox}
            className="p-2.5 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-white transition border border-neutral-850"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main content display */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-w-5xl max-h-[85vh] w-full h-full flex items-center justify-center p-4 relative"
      >
        {currentMedia.type === 'video' || currentMedia.type === 'animated_gif' ? (
          <div className="relative max-h-full max-w-full flex items-center justify-center">
            <video
              src={getProxyUrl(currentMedia.url)}
              controls
              autoPlay
              muted={isMuted}
              loop={currentMedia.type === 'animated_gif'}
              className="max-h-[82vh] max-w-full rounded-lg shadow-2xl"
            />
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="absolute bottom-16 right-4 p-2 bg-black/70 hover:bg-black/90 text-white rounded-full transition"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        ) : (
          <img
            src={getProxyUrl(currentMedia.originalUrl || currentMedia.url)}
            alt={currentMedia.alt || 'Full size media'}
            className="max-h-[82vh] max-w-full object-contain rounded-lg shadow-2xl select-none"
          />
        )}
      </div>

      {/* Navigation Chevrons */}
      {total > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 p-3 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-white transition z-20 border border-neutral-850"
            title="Previous (Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 p-3 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-white transition z-20 border border-neutral-850"
            title="Next (Right Arrow)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}
    </div>
  );
};
