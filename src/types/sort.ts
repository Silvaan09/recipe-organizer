export type RecipeSortMode = 'alphabetical' | 'recentlyUsed' | 'recentlyCreated';
export type RecipeSortDirection = 'asc' | 'desc';

export type RecipeSortState = {
  direction: RecipeSortDirection;
  mode: RecipeSortMode;
};
