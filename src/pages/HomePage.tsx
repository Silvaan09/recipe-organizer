import { Plus } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { FloatingAddRecipeButton } from '../components/recipes/FloatingAddRecipeButton';
import { RecipeList } from '../components/recipes/RecipeList';
import { RecipeSearchBar } from '../components/recipes/RecipeSearchBar';
import { useRecipes } from '../hooks/useRecipes';
import type { Recipe } from '../types/recipe';
import { getRecentRecipes } from '../utils/recipeFilters';

type HomePageProps = {
  onAddRecipe: () => void;
  onOpenRecipe: (recipeId: string) => void;
};

export function HomePage({ onAddRecipe, onOpenRecipe }: HomePageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { error, isLoading, recipes, visibleRecipes } = useRecipes({
    searchQuery,
    sortMode: 'recentlyUsed',
  });

  const isSearching = searchQuery.trim().length > 0;
  const displayedRecipes = useMemo(
    () => (isSearching ? visibleRecipes : getRecentRecipes(recipes)),
    [isSearching, recipes, visibleRecipes],
  );

  const handleRecipeClick = useCallback(async (recipe: Recipe) => {
    onOpenRecipe(recipe.id);
  }, [onOpenRecipe]);

  return (
    <>
      <RecipeSearchBar value={searchQuery} onChange={setSearchQuery} />

      <section className="rounded-lg bg-gradient-to-br from-petal-400 via-petal-300 to-herb-100 p-5 text-white shadow-soft motion-safe:animate-[fade-in_220ms_ease-out]">
        <p className="text-sm font-semibold text-white/85">Welcome back</p>
        <h2 className="mt-2 font-serif text-3xl font-bold leading-tight">Find a favorite bite fast.</h2>
        <p className="mt-3 max-w-sm text-sm leading-6 text-white/85">
          Search your local recipe box or jump back into something you used recently.
        </p>
      </section>

      {error ? (
        <div className="rounded-lg border border-petal-200 bg-white p-4 text-sm font-semibold text-petal-700 shadow-soft">
          {error}
        </div>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-petal-600">
              {isSearching ? 'Search results' : 'Recently used'}
            </p>
            <h2 className="mt-1 text-xl font-bold">
              {isSearching ? `Matches for "${searchQuery}"` : 'Cook again soon'}
            </h2>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-petal-700 shadow-soft">
            {displayedRecipes.length}
          </span>
        </div>

        <RecipeList
          emptyAction={
            !isSearching ? (
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-petal-500 px-4 text-sm font-bold text-white shadow-soft transition hover:bg-petal-600"
                onClick={onAddRecipe}
              >
                <Plus aria-hidden="true" size={18} />
                Add recipe
              </button>
            ) : undefined
          }
          emptyLabel={
            isSearching
              ? 'No local recipes matched that search. Try a title, ingredient, or tag.'
              : 'Save your first cozy recipe and it will stay available offline.'
          }
          emptyTitle={isSearching ? 'No matches' : 'Start your recipe book'}
          isLoading={isLoading}
          recipes={displayedRecipes}
          onRecipeClick={handleRecipeClick}
        />
      </section>

      <FloatingAddRecipeButton onClick={onAddRecipe} />
    </>
  );
}
