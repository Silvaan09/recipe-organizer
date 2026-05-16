import type { Recipe } from '../types/recipe';
import type { RecipeSortMode, RecipeSortState } from '../types/sort';

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

export function sortRecipes(
  recipes: Recipe[],
  sort: RecipeSortMode | RecipeSortState,
) {
  const sortState: RecipeSortState =
    typeof sort === 'string'
      ? {
          direction: sort === 'alphabetical' ? 'asc' : 'desc',
          mode: sort,
        }
      : sort;

  return [...recipes].sort((firstRecipe, secondRecipe) => {
    let result: number;

    if (sortState.mode === 'alphabetical') {
      result = firstRecipe.title.localeCompare(secondRecipe.title);
    } else if (sortState.mode === 'recentlyCreated') {
      result = firstRecipe.createdAt.localeCompare(secondRecipe.createdAt);
    } else {
      result = firstRecipe.lastUsedAt.localeCompare(secondRecipe.lastUsedAt);
    }

    return sortState.direction === 'asc' ? result : result * -1;
  });
}

export function getRecentRecipes(recipes: Recipe[], limit = 5) {
  return sortRecipes(recipes, 'recentlyUsed').slice(0, limit);
}
