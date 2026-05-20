import { BookHeart, Image as ImageIcon } from 'lucide-react';

import { useRecipeFullImage } from '../../hooks/useRecipeFullImage';
import type { RecipeImagePosition } from '../../types/recipe';
import { toImageObjectPosition } from '../../utils/imagePosition';
import { Skeleton } from '../ui/Skeleton';

type RecipeDisplayImageProps = {
  imageId?: string;
  imagePosition?: RecipeImagePosition;
  title: string;
};

export function RecipeDisplayImage({ imageId, imagePosition, title }: RecipeDisplayImageProps) {
  const displayImage = useRecipeFullImage(imageId, Boolean(imageId));

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-petal-600">
            Anzeigebild
          </p>
          <h2 className="mt-1 text-lg font-bold text-cocoa-900">Rezeptcover</h2>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-petal-100 bg-white shadow-soft">
        <div className="aspect-[4/3] bg-gradient-to-br from-petal-100 via-white to-herb-100">
          {displayImage.src ? (
            <img
              src={displayImage.src}
              alt={displayImage.alt || title}
              className="size-full object-cover"
              decoding="async"
              style={{
                objectPosition: toImageObjectPosition(imagePosition),
              }}
            />
          ) : displayImage.isLoading ? (
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
                  {imageId ? 'Anzeigebild konnte nicht geladen werden' : 'Kein Anzeigebild ausgewählt'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
