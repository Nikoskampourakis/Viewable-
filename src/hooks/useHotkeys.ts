import { useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';

export function useHotkeys() {
  const {
    isComposeOpen,
    setIsComposeOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    isPanicModalOpen,
    setIsPanicModalOpen,
    activeLightbox,
    closeLightbox,
    navigate,
  } = useApp();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      switch (e.key) {
        case 'Escape':
          if (activeLightbox) closeLightbox();
          else if (isComposeOpen) setIsComposeOpen(false);
          else if (isSettingsOpen) setIsSettingsOpen(false);
          else if (isPanicModalOpen) setIsPanicModalOpen(false);
          break;

        case 'n':
        case 'c':
          e.preventDefault();
          setIsComposeOpen(true);
          break;

        case '/':
          e.preventDefault();
          navigate('explore');
          break;

        case 'h':
          navigate('for-you');
          break;

        case 'p':
          // Panic trigger with Shift+P
          if (e.shiftKey) {
            e.preventDefault();
            setIsPanicModalOpen(true);
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isComposeOpen,
    isSettingsOpen,
    isPanicModalOpen,
    activeLightbox,
    closeLightbox,
    setIsComposeOpen,
    setIsSettingsOpen,
    setIsPanicModalOpen,
    navigate,
  ]);
}
