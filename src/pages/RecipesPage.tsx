import { useCallback, useState } from 'react';

import { FloatingAddRecipeButton } from '../components/recipes/FloatingAddRecipeButton';
import { RecipeList } from '../components/recipes/RecipeList';
import { RecipeSortControl } from '../components/recipes/RecipeSortControl';
import { useRecipes } from '../hooks/useRecipes';
import type { Recipe } from '../types/recipe';
import type { RecipeSortState } from '../types/sort';

type RecipesPageProps = {
  onAddRecipe: () => void;
  onOpenRecipe: (recipeId: string) => void;
};

export function RecipesPage({ onAddRecipe, onOpenRecipe }: RecipesPageProps) {
  const [sortMode, setSortMode] = useState<RecipeSortState>({
    direction: 'asc',
    mode: 'alphabetical',
  });
  const { error, isLoading, visibleRecipes } = useRecipes({ sortMode });

  const handleRecipeClick = useCallback(async (recipe: Recipe) => {
    onOpenRecipe(recipe.id);
  }, [onOpenRecipe]);

  return (
    <>
      <section className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-petal-600">
            Recipe library
          </p>
          <h2 className="mt-1 font-serif text-3xl font-bold">All recipes</h2>
        </div>

        <RecipeSortControl value={sortMode} onChange={setSortMode} />
      </section>

      {error ? (
        <div className="rounded-lg border border-petal-200 bg-white p-4 text-sm font-semibold text-petal-700 shadow-soft">
          {error}
        </div>
      ) : null}

      <RecipeList
        emptyLabel="No recipes saved locally yet. Add one from Home and it will be stored on this device."
        emptyTitle="Your shelf is waiting"
        isLoading={isLoading}
        recipes={visibleRecipes}
        onRecipeClick={handleRecipeClick}
      />

      <FloatingAddRecipeButton onClick={onAddRecipe} />
    </>
  );
}
