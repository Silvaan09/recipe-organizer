import type { Recipe } from '../types/recipe';
import type { RecipeSortMode } from '../types/sort';

export function matchesRecipeSearch(recipe: Recipe, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [recipe.title, ...recipe.keywords]
    .join(' ')
    .toLocaleLowerCase()
    .includes(normalizedQuery);
}

export function sortRecipes(recipes: Recipe[], sortMode: RecipeSortMode) {
  return [...recipes].sort((firstRecipe, secondRecipe) => {
    if (sortMode === 'alphabetical') {
      return firstRecipe.title.localeCompare(secondRecipe.title);
    }

    if (sortMode === 'recentlyCreated') {
      return secondRecipe.createdAt.localeCompare(firstRecipe.createdAt);
    }

    return secondRecipe.lastUsedAt.localeCompare(firstRecipe.lastUsedAt);
  });
}

export function getRecentRecipes(recipes: Recipe[], limit = 5) {
  return sortRecipes(recipes, 'recentlyUsed').slice(0, limit);
}
