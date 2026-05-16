import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';

import { RecipeForm } from '../components/forms/RecipeForm';
import { getRecipe } from '../db';
import type { Recipe } from '../types/recipe';

type RecipeFormPageProps = {
  recipeId?: string;
  onCancel: () => void;
  onSaved: (recipe: Recipe) => void;
};

export function RecipeFormPage({ recipeId, onCancel, onSaved }: RecipeFormPageProps) {
  const [recipe, setRecipe] = useState<Recipe | undefined>();
  const [isLoading, setIsLoading] = useState(Boolean(recipeId));

  useEffect(() => {
    let isMounted = true;

    async function loadRecipe() {
      if (!recipeId) {
        setRecipe(undefined);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const nextRecipe = await getRecipe(recipeId);

      if (isMounted) {
        setRecipe(nextRecipe);
        setIsLoading(false);
      }
    }

    void loadRecipe();

    return () => {
      isMounted = false;
    };
  }, [recipeId]);

  return (
    <>
      <button
        type="button"
        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg bg-white px-3 text-sm font-bold text-petal-700 shadow-soft transition hover:bg-petal-50"
        onClick={onCancel}
      >
        <ArrowLeft aria-hidden="true" size={18} />
        Back
      </button>

      {isLoading ? (
        <div className="h-96 animate-pulse rounded-lg border border-petal-100 bg-white/80 shadow-soft" />
      ) : recipeId && !recipe ? (
        <div className="rounded-lg border border-petal-100 bg-white p-5 text-sm font-semibold text-cocoa-700 shadow-soft">
          Recipe could not be found locally.
        </div>
      ) : (
        <RecipeForm initialRecipe={recipe} onCancel={onCancel} onSaved={onSaved} />
      )}
    </>
  );
}
