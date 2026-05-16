import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { deleteRecipe, getRecipe, updateLastUsed } from '../db';
import { RecipeImageGallery } from '../components/recipes/RecipeImageGallery';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import type { Recipe } from '../types/recipe';
import { logAndReturnMessage } from '../utils/errors';

type RecipeDetailPageProps = {
  onBack: () => void;
  onDeleted: () => void;
  onEdit: (recipeId: string) => void;
  recipeId: string;
};

export function RecipeDetailPage({ onBack, onDeleted, onEdit, recipeId }: RecipeDetailPageProps) {
  const [recipe, setRecipe] = useState<Recipe>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadRecipe() {
      try {
        setIsLoading(true);
        const nextRecipe = await getRecipe(recipeId);

        if (!nextRecipe) {
          throw new Error('Recipe could not be found locally.');
        }

        await updateLastUsed(recipeId);

        if (isMounted) {
          setRecipe({
            ...nextRecipe,
            lastUsedAt: new Date().toISOString(),
          });
          setError(null);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(logAndReturnMessage(loadError, 'Recipe could not be loaded.', { recipeId }));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadRecipe();

    return () => {
      isMounted = false;
    };
  }, [recipeId]);

  async function handleDeleteRecipe() {
    if (!recipe) {
      return;
    }

    const shouldDelete = window.confirm(
      `Delete "${recipe.title}" from this device? This removes the recipe and its saved images.`,
    );

    if (!shouldDelete) {
      return;
    }

    try {
      await deleteRecipe(recipe.id);
      onDeleted();
    } catch (deleteError) {
      setError(logAndReturnMessage(deleteError, 'Recipe could not be deleted.', { recipeId: recipe.id }));
    }
  }

  if (isLoading) {
    return (
      <>
        <Skeleton className="h-11 w-24" />
        <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
        <Skeleton className="h-8 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      </>
    );
  }

  if (error || !recipe) {
    return (
      <>
        <button
          type="button"
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg bg-white px-3 text-sm font-bold text-petal-700 shadow-soft transition hover:bg-petal-50"
          onClick={onBack}
        >
          <ArrowLeft aria-hidden="true" size={18} />
          Back
        </button>
        <Card>
          <p className="text-sm font-semibold text-petal-700">{error}</p>
        </Card>
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg bg-white px-3 text-sm font-bold text-petal-700 shadow-soft transition hover:bg-petal-50"
        onClick={onBack}
      >
        <ArrowLeft aria-hidden="true" size={18} />
        Back
      </button>

      <RecipeImageGallery imageIds={recipe.imageIds} title={recipe.title} />

      <section className="rounded-lg bg-white p-5 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-wide text-petal-600">Recipe card</p>
        <h2 className="mt-2 font-serif text-4xl font-bold leading-tight text-cocoa-900">
          {recipe.title}
        </h2>

        <div className="mt-4 flex flex-wrap gap-2">
          {recipe.keywords.length > 0 ? (
            recipe.keywords.map((keyword) => (
              <span
                key={keyword}
                className="rounded-full bg-petal-100 px-3 py-1.5 text-xs font-bold text-petal-700"
              >
                {keyword}
              </span>
            ))
          ) : (
            <span className="rounded-full bg-petal-50 px-3 py-1.5 text-xs font-bold text-cocoa-700">
              no keywords
            </span>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-petal-500 px-4 text-sm font-bold text-white shadow-lg shadow-petal-300/40 transition hover:bg-petal-600"
          onClick={() => onEdit(recipe.id)}
        >
          <Pencil aria-hidden="true" size={18} />
          Edit
        </button>
        <button
          type="button"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-petal-200 bg-white px-4 text-sm font-bold text-petal-700 shadow-soft transition hover:bg-petal-50"
          onClick={() => void handleDeleteRecipe()}
        >
          <Trash2 aria-hidden="true" size={18} />
          Delete
        </button>
      </div>
    </>
  );
}
