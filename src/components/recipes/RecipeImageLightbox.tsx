import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useRecipeFullImage } from '../../hooks/useRecipeFullImage';
import { cn } from '../../utils/cn';
import { Skeleton } from '../ui/Skeleton';

type RecipeImageLightboxProps = {
  imageIds: string[];
  initialIndex?: number;
  onClose: () => void;
  title: string;
};

export function RecipeImageLightbox({
  imageIds,
  initialIndex = 0,
  onClose,
  title,
}: RecipeImageLightboxProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const activeImageId = imageIds[activeIndex];
  const activeImage = useRecipeFullImage(activeImageId, Boolean(activeImageId));
  const canGoPrevious = activeIndex > 0;
  const canGoNext = activeIndex < imageIds.length - 1;
  const hasMultipleImages = imageIds.length > 1;
  const imageLabel = useMemo(
    () => `${activeIndex + 1} von ${Math.max(imageIds.length, 1)}`,
    [activeIndex, imageIds.length],
  );

  useEffect(() => {
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }

      if (event.key === 'ArrowLeft' && canGoPrevious) {
        setActiveIndex((currentIndex) => Math.max(0, currentIndex - 1));
      }

      if (event.key === 'ArrowRight' && canGoNext) {
        setActiveIndex((currentIndex) => Math.min(imageIds.length - 1, currentIndex + 1));
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [canGoNext, canGoPrevious, imageIds.length, onClose]);

  function goToPrevious() {
    setActiveIndex((currentIndex) => Math.max(0, currentIndex - 1));
  }

  function goToNext() {
    setActiveIndex((currentIndex) => Math.min(imageIds.length - 1, currentIndex + 1));
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-cocoa-900/95 text-white backdrop-blur-sm">
      <div className="flex min-h-16 items-center justify-between gap-3 px-4 pt-[env(safe-area-inset-top)]">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{title}</p>
          <p className="text-xs font-semibold text-white/70">{imageLabel}</p>
        </div>
        <button
          type="button"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          aria-label="Vollbild schließen"
          onClick={onClose}
        >
          <X aria-hidden="true" size={22} />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        {activeImage.src ? (
          <img
            src={activeImage.src}
            alt={activeImage.alt || title}
            className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
            decoding="async"
          />
        ) : activeImage.isLoading ? (
          <Skeleton className="h-3/4 w-full max-w-screen-sm rounded-lg bg-white/20" />
        ) : (
          <div className="rounded-lg border border-white/15 bg-white/10 p-6 text-center text-sm font-bold">
            Bild konnte nicht geladen werden.
          </div>
        )}

        {hasMultipleImages ? (
          <>
            <button
              type="button"
              className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white shadow-soft transition hover:bg-white/25 disabled:opacity-30"
              aria-label="Vorheriges Bild"
              disabled={!canGoPrevious}
              onClick={goToPrevious}
            >
              <ChevronLeft aria-hidden="true" size={24} />
            </button>
            <button
              type="button"
              className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white shadow-soft transition hover:bg-white/25 disabled:opacity-30"
              aria-label="Nächstes Bild"
              disabled={!canGoNext}
              onClick={goToNext}
            >
              <ChevronRight aria-hidden="true" size={24} />
            </button>
          </>
        ) : null}
      </div>

      {hasMultipleImages ? (
        <div className="flex justify-center gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          {imageIds.map((imageId, index) => (
            <button
              key={imageId}
              type="button"
              className={cn(
                'size-2.5 rounded-full transition',
                activeIndex === index ? 'bg-white' : 'bg-white/35',
              )}
              aria-label={`Bild ${index + 1} anzeigen`}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
