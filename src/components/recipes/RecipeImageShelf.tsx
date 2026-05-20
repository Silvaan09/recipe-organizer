import { BookHeart, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { useState } from 'react';

import { useRecipeFullImage } from '../../hooks/useRecipeFullImage';
import { cn } from '../../utils/cn';
import { Skeleton } from '../ui/Skeleton';

type RecipeImageShelfProps = {
  imageIds: string[];
  onImageOpen?: (index: number) => void;
  title: string;
};

type ShelfImageCardProps = {
  imageId?: string;
  index?: number;
  onImageOpen?: (index: number) => void;
  title: string;
  total?: number;
};

function ShelfImageCard({ imageId, index, onImageOpen, title, total }: ShelfImageCardProps) {
  const image = useRecipeFullImage(imageId, Boolean(imageId));

  return (
    <div className="relative overflow-hidden rounded-2xl border border-petal-100 bg-white shadow-soft">
      <div className="aspect-[4/3] bg-gradient-to-br from-petal-100 via-white to-herb-100">
        {image.src ? (
          <button
            type="button"
            className="block size-full cursor-zoom-in"
            aria-label="Bild im Vollbild öffnen"
            onClick={() => {
              if (index !== undefined && onImageOpen) {
                onImageOpen(index);
              }
            }}
          >
            <img
              src={image.src}
              alt={image.alt || title}
              className="size-full object-contain"
              decoding="async"
              loading="lazy"
            />
          </button>
        ) : image.isLoading ? (
          <Skeleton className="size-full rounded-none" />
        ) : (
          <div className="grid size-full place-items-center p-8 text-center text-petal-600">
            <div>
              <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-white/80 shadow-soft">
                {imageId ? (
                  <ImageIcon aria-hidden="true" size={30} />
                ) : (
                  <BookHeart aria-hidden="true" size={30} />
                )}
              </div>
              <p className="mt-4 text-sm font-bold text-cocoa-700">
                {imageId ? 'Rezeptbild konnte nicht geladen werden' : 'Keine Rezeptbilder ausgewählt'}
              </p>
            </div>
          </div>
        )}
      </div>

      {index !== undefined ? (
        <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-petal-700 shadow-soft">
          {index + 1} von {Math.max(total ?? 1, 1)}
        </div>
      ) : null}
    </div>
  );
}

export function RecipeImageShelf({ imageIds, onImageOpen, title }: RecipeImageShelfProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (imageIds.length === 0) {
    return <ShelfImageCard title={title} />;
  }

  const activeImageId = imageIds[activeIndex];
  const canGoPrevious = activeIndex > 0;
  const canGoNext = activeIndex < imageIds.length - 1;
  const hasMultipleImages = imageIds.length > 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <ShelfImageCard
          imageId={activeImageId}
          index={activeIndex}
          onImageOpen={onImageOpen}
          title={title}
          total={imageIds.length}
        />

        {hasMultipleImages ? (
          <>
            <button
              type="button"
              className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-petal-700 shadow-soft transition hover:bg-petal-50 disabled:opacity-35"
              aria-label="Vorheriges Rezeptbild"
              disabled={!canGoPrevious}
              onClick={() => setActiveIndex((currentIndex) => Math.max(0, currentIndex - 1))}
            >
              <ChevronLeft aria-hidden="true" size={24} />
            </button>
            <button
              type="button"
              className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-petal-700 shadow-soft transition hover:bg-petal-50 disabled:opacity-35"
              aria-label="Nächstes Rezeptbild"
              disabled={!canGoNext}
              onClick={() =>
                setActiveIndex((currentIndex) => Math.min(imageIds.length - 1, currentIndex + 1))
              }
            >
              <ChevronRight aria-hidden="true" size={24} />
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
              aria-label={`Rezeptbild ${index + 1} anzeigen`}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
