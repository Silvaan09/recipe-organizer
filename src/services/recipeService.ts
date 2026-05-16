import { getAllRecipes } from '../db';
import type { Recipe, RecipeSummary } from '../types/recipe';

export async function getRecipeSummaries(): Promise<RecipeSummary[]> {
  const recipes = await getAllRecipes();

  return recipes.map(toRecipeSummary);
}

function toRecipeSummary(recipe: Recipe): RecipeSummary {
  return {
    id: recipe.id,
    title: recipe.title,
    keywords: recipe.keywords,
    previewImageId: recipe.previewImageId,
    previewImagePosition: recipe.previewImagePosition,
    imageIds: recipe.imageIds,
    lastUsedAt: recipe.lastUsedAt,
  };
}
