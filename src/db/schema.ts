import Dexie, { type EntityTable } from 'dexie';

import { DATABASE_NAME, DATABASE_STORES } from './migrations';
import type { Recipe, RecipeImage, RecipeImageThumbnail } from '../types/recipe';

export class RecipeOrganizerDatabase extends Dexie {
  recipes!: EntityTable<Recipe, 'id'>;
  recipeImages!: EntityTable<RecipeImage, 'id'>;
  recipeImageThumbnails!: EntityTable<RecipeImageThumbnail, 'id'>;

  constructor() {
    super(DATABASE_NAME);

    this.version(1).stores({
      recipes: 'id, title, createdAt, updatedAt, lastUsedAt, *keywords, *imageIds',
    });

    this.version(2).stores({
      recipes: 'id, title, createdAt, updatedAt, lastUsedAt, *keywords, *imageIds',
      recipeImages: 'id, createdAt, fileName, mimeType',
    });

    this.version(3)
      .stores({
        recipes: 'id, title, createdAt, updatedAt, lastUsedAt, *keywords, *imageIds',
        recipeImages: 'id, recipeId, createdAt',
      })
      .upgrade(async (transaction) => {
        const recipes = await transaction.table<Recipe, string>('recipes').toArray();
        const imageRecipeIdByImageId = new Map<string, string>();

        recipes.forEach((recipe) => {
          recipe.imageIds.forEach((imageId) => {
            imageRecipeIdByImageId.set(imageId, recipe.id);
          });
        });

        await transaction.table<RecipeImage, string>('recipeImages').toCollection().modify((image) => {
          image.recipeId = image.recipeId ?? imageRecipeIdByImageId.get(image.id) ?? '';
        });
      });

    this.version(4).stores({
      recipes: DATABASE_STORES.recipes,
      recipeImages: DATABASE_STORES.recipeImages,
      recipeImageThumbnails: DATABASE_STORES.recipeImageThumbnails,
    });

    this.version(5).stores({
      recipes: DATABASE_STORES.recipes,
      recipeImages: DATABASE_STORES.recipeImages,
      recipeImageThumbnails: DATABASE_STORES.recipeImageThumbnails,
    });
  }
}

export const db = new RecipeOrganizerDatabase();
