import { useCallback, useEffect, useMemo, useState } from 'react';

import { getAllRecipes, repairLocalDatabase, seedMockRecipes, updateLastUsed } from '../db';
import type { Recipe } from '../types/recipe';
import type { RecipeSortMode, RecipeSortState } from '../types/sort';
import { logAndReturnMessage } from '../utils/errors';
import { matchesRecipeSearch, sortRecipes } from '../utils/recipeFilters';

type UseRecipesOptions = {
  searchQuery?: string;
  sortMode?: RecipeSortMode | RecipeSortState;
};

export function useRecipes({ searchQuery = '', sortMode = 'recentlyUsed' }: UseRecipesOptions = {}) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshRecipes = useCallback(async () => {
    const nextRecipes = await getAllRecipes();
    setRecipes(nextRecipes);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadRecipes() {
      try {
        setIsLoading(true);
        await seedMockRecipes();
        await repairLocalDatabase();
        const nextRecipes = await getAllRecipes();

        if (isMounted) {
          setRecipes(nextRecipes);
          setError(null);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(logAndReturnMessage(loadError, 'Recipes could not be loaded.'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadRecipes();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleRecipes = useMemo(() => {
    const filteredRecipes = recipes.filter((recipe) => matchesRecipeSearch(recipe, searchQuery));

    return sortRecipes(filteredRecipes, sortMode);
  }, [recipes, searchQuery, sortMode]);

  const markRecipeUsed = useCallback(
    async (recipeId: string) => {
      const timestamp = new Date().toISOString();

      setRecipes((currentRecipes) =>
        currentRecipes.map((recipe) =>
          recipe.id === recipeId ? { ...recipe, lastUsedAt: timestamp } : recipe,
        ),
      );

      await updateLastUsed(recipeId);
      await refreshRecipes();
    },
    [refreshRecipes],
  );

  return {
    error,
    isLoading,
    markRecipeUsed,
    recipes,
    refreshRecipes,
    visibleRecipes,
  };
}
