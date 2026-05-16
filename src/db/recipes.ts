import { deleteRecipeImagesByRecipeId } from './images';
import { hasSeededMockRecipes, markMockRecipesSeeded } from './maintenance';
import { db } from './schema';
import { mockRecipes } from './seed';
import type { NewRecipeInput, Recipe, RecipeUpdateInput } from '../types/recipe';
import { logger } from '../utils/logger';
import { validateRecipe } from '../validation/dataValidation';

function nowIso() {
  return new Date().toISOString();
}

function createRecipeId() {
  if ('crypto' in globalThis && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }

  return `recipe-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeKeywords(keywords: string[]) {
  return [...new Set(keywords.map((keyword) => keyword.trim().toLocaleLowerCase()).filter(Boolean))];
}

function createSearchText(recipe: Recipe) {
  return [recipe.title, ...recipe.keywords].join(' ').toLocaleLowerCase();
}

export async function addRecipe(input: NewRecipeInput): Promise<Recipe> {
  const timestamp = nowIso();
  const recipe: Recipe = {
    id: createRecipeId(),
    title: input.title.trim(),
    keywords: normalizeKeywords(input.keywords),
    previewImageId: input.previewImageId,
    imageIds: [...input.imageIds],
    createdAt: timestamp,
    updatedAt: timestamp,
    lastUsedAt: input.lastUsedAt ?? timestamp,
  };

  const validation = validateRecipe(recipe);

  if (!validation.ok) {
    throw new Error(validation.errors.join(' '));
  }

  await db.recipes.add(validation.data);

  return validation.data;
}

export async function updateRecipe(id: string, changes: RecipeUpdateInput): Promise<Recipe> {
  const existingRecipe = await getRecipe(id);

  if (!existingRecipe) {
    throw new Error(`Recipe ${id} was not found.`);
  }

  const updatedRecipe: Recipe = {
    ...existingRecipe,
    ...changes,
    title: changes.title?.trim() ?? existingRecipe.title,
    keywords: changes.keywords ? normalizeKeywords(changes.keywords) : existingRecipe.keywords,
    previewImageId:
      'previewImageId' in changes ? changes.previewImageId : existingRecipe.previewImageId,
    imageIds: changes.imageIds ? [...changes.imageIds] : existingRecipe.imageIds,
    updatedAt: nowIso(),
  };

  const validation = validateRecipe(updatedRecipe);

  if (!validation.ok) {
    throw new Error(validation.errors.join(' '));
  }

  await db.recipes.put(validation.data);

  return validation.data;
}

export async function deleteRecipe(id: string): Promise<void> {
  await deleteRecipeImagesByRecipeId(id);
  await db.recipes.delete(id);
}

export async function getRecipe(id: string): Promise<Recipe | undefined> {
  const recipe = await db.recipes.get(id);

  if (!recipe) {
    return undefined;
  }

  const validation = validateRecipe(recipe);

  if (!validation.ok) {
    logger.warn('Ignoring corrupted recipe.', { errors: validation.errors, recipeId: id });
    return undefined;
  }

  return validation.data;
}

export async function getAllRecipes(): Promise<Recipe[]> {
  const recipes = await db.recipes.orderBy('updatedAt').reverse().toArray();

  return recipes.flatMap((recipe) => {
    const validation = validateRecipe(recipe);

    if (!validation.ok) {
      logger.warn('Ignoring corrupted recipe in recipe list.', {
        errors: validation.errors,
        recipeId: recipe.id,
      });
      return [];
    }

    return [validation.data];
  });
}

export async function searchRecipes(query: string): Promise<Recipe[]> {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  if (!normalizedQuery) {
    return getAllRecipes();
  }

  const recipes = await getAllRecipes();

  return recipes
    .filter((recipe) => createSearchText(recipe).includes(normalizedQuery))
    .sort((firstRecipe, secondRecipe) => secondRecipe.updatedAt.localeCompare(firstRecipe.updatedAt));
}

export async function updateLastUsed(id: string): Promise<void> {
  await db.recipes.update(id, {
    lastUsedAt: nowIso(),
  });
}

export async function seedMockRecipes(): Promise<void> {
  if (hasSeededMockRecipes()) {
    return;
  }

  const recipeCount = await db.recipes.count();

  if (recipeCount > 0) {
    markMockRecipesSeeded();
    return;
  }

  await db.transaction('rw', db.recipes, async () => {
    await Promise.all(mockRecipes.map((recipe) => addRecipe(recipe)));
  });

  markMockRecipesSeeded();
}
