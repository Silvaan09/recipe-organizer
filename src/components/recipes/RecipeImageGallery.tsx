import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useRecipeFullImage } from '../../hooks/useRecipeFullImage';
import type { RecipeImagePosition } from '../../types/recipe';
import { cn } from '../../utils/cn';
import { toImageObjectPosition } from '../../utils/imagePosition';
import { Skeleton } from '../ui/Skeleton';

type RecipeImageGalleryProps = {
  imageIds: string[];
  imagePosition?: RecipeImagePosition;
  onImageOpen?: (index: number) => void;
  showLabel?: boolean;
  title: string;
};

export function RecipeImageGallery({
  imageIds,
  imagePosition,
  onImageOpen,
  showLabel = true,
  title,
}: RecipeImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const activeImageId = imageIds[activeIndex];
  const activeImage = useRecipeFullImage(activeImageId, Boolean(activeImageId));
  const hasMultipleImages = imageIds.length > 1;
  const canGoPrevious = activeIndex > 0;
  const canGoNext = activeIndex < imageIds.length - 1;
  const galleryLabel = useMemo(
    () => `${activeIndex + 1} von ${Math.max(imageIds.length, 1)}`,
    [activeIndex, imageIds.length],
  );

  function goToPrevious() {
    setActiveIndex((currentIndex) => Math.max(0, currentIndex - 1));
  }

  function goToNext() {
    setActiveIndex((currentIndex) => Math.min(imageIds.length - 1, currentIndex + 1));
  }

  function handleTouchEnd(touchEndX: number) {
    if (touchStartX === null) {
      return;
    }

    const swipeDistance = touchStartX - touchEndX;

    if (swipeDistance > 40 && canGoNext) {
      goToNext();
    }

    if (swipeDistance < -40 && canGoPrevious) {
      goToPrevious();
    }

    setTouchStartX(null);
  }

  if (imageIds.length === 0) {
    return (
      <div className="grid aspect-[4/3] place-items-center rounded-2xl border border-dashed border-petal-200 bg-white/80 text-petal-500 shadow-soft">
        <div className="text-center">
          <ImageIcon aria-hidden="true" size={36} className="mx-auto" />
          <p className="mt-3 text-sm font-bold text-cocoa-700">Noch keine Bilder</p>
        </div>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div
        className="relative overflow-hidden rounded-2xl border border-petal-100 bg-white shadow-soft"
        onTouchStart={(event) => setTouchStartX(event.touches[0]?.clientX ?? null)}
        onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
      >
        <div className="aspect-[4/3] bg-petal-100/70">
          {activeImage.src ? (
            <button
              type="button"
              className="block size-full cursor-zoom-in"
              aria-label="Bild im Vollbild öffnen"
              onClick={() => onImageOpen?.(activeIndex)}
            >
              <img
                src={activeImage.src}
                alt={activeImage.alt || title}
                className="size-full object-cover"
                decoding="async"
                style={{
                  objectPosition: toImageObjectPosition(imagePosition),
                }}
              />
            </button>
          ) : activeImage.isLoading ? (
            <Skeleton className="size-full rounded-none" />
          ) : (
            <div className="grid size-full place-items-center text-petal-500">
              <ImageIcon aria-hidden="true" size={34} />
            </div>
          )}
        </div>

        {showLabel ? (
          <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-petal-700 shadow-soft">
            {galleryLabel}
          </div>
        ) : null}

        {hasMultipleImages ? (
          <>
            <button
              type="button"
              className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-petal-700 shadow-soft transition hover:bg-petal-50 disabled:opacity-35"
              aria-label="Vorheriges Bild"
              disabled={!canGoPrevious}
              onClick={goToPrevious}
            >
              <ChevronLeft aria-hidden="true" size={22} />
            </button>
            <button
              type="button"
              className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-petal-700 shadow-soft transition hover:bg-petal-50 disabled:opacity-35"
              aria-label="Nächstes Bild"
              disabled={!canGoNext}
              onClick={goToNext}
            >
              <ChevronRight aria-hidden="true" size={22} />
            </button>
          </>
        ) : null}
      </div>

      {hasMultipleImages ? (
        <div className="flex justify-center gap-2">
          {imageIds.map((imageId, index) => (
            <button
              key={imageId}
              type="button"
              className={cn(
                'size-2.5 rounded-full transition',
                activeIndex === index ? 'bg-petal-500' : 'bg-petal-200',
              )}
              aria-label={`Bild ${index + 1} anzeigen`}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
