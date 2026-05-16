import { memo } from 'react';
import { BookOpen, Image as ImageIcon } from 'lucide-react';

import { useNearViewport } from '../../hooks/useNearViewport';
import { useRecipeImagePreview } from '../../hooks/useRecipeImagePreview';
import type { Recipe } from '../../types/recipe';
import { cn } from '../../utils/cn';
import { toImageObjectPosition } from '../../utils/imagePosition';
import { getRecipePreviewLabel, getRecipePreviewStyle } from '../../utils/recipePreview';

type RecipeCardProps = {
  recipe: Recipe;
  onOpen: (recipe: Recipe) => void;
};

function RecipeCardComponent({ recipe, onOpen }: RecipeCardProps) {
  const imageId = recipe.previewImageId;
  const { isNearViewport, ref } = useNearViewport<HTMLButtonElement>();
  const preview = useRecipeImagePreview(imageId, isNearViewport);

  return (
    <button
      type="button"
      ref={ref}
      className="group min-h-28 w-full rounded-lg border border-petal-100 bg-white p-3 text-left shadow-soft transition duration-200 hover:-translate-y-0.5 hover:border-petal-200 hover:shadow-lg active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-petal-300"
      onClick={() => onOpen(recipe)}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            'relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br',
            imageId ? getRecipePreviewStyle(imageId) : 'from-petal-50 to-herb-50 text-petal-500',
          )}
        >
          {preview.src ? (
            <img
              src={preview.src}
              alt={preview.alt}
              decoding="async"
              loading="lazy"
              className="size-full object-cover transition duration-300 group-hover:scale-105"
              style={{
                objectPosition: toImageObjectPosition(recipe.previewImagePosition),
              }}
            />
          ) : imageId ? (
            <>
              <div className="absolute -right-4 -top-4 size-12 rounded-full bg-white/35" />
              <div className="absolute -bottom-5 -left-3 size-14 rounded-full bg-white/30" />
              <span className="relative text-xs font-black uppercase tracking-wide">
                {getRecipePreviewLabel(imageId)}
              </span>
            </>
          ) : (
            <ImageIcon aria-hidden="true" size={24} />
          )}
        </div>

        <div className="min-w-0 flex-1 py-1">
          <div className="flex items-start gap-2">
            <BookOpen
              aria-hidden="true"
              size={18}
              className="mt-0.5 shrink-0 text-petal-500 transition group-hover:scale-110"
            />
            <h3 className="line-clamp-2 text-base font-bold leading-snug text-cocoa-900">
              {recipe.title}
            </h3>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {recipe.keywords.slice(0, 4).map((keyword) => (
              <span
                key={keyword}
                className="rounded-full bg-petal-50 px-2.5 py-1 text-xs font-semibold text-petal-700"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}

export const RecipeCard = memo(RecipeCardComponent);
