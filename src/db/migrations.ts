export const DATABASE_NAME = 'recipe-organizer';
export const DATABASE_SCHEMA_VERSION = 5;

export const DATABASE_STORES = {
  recipes: 'id, title, createdAt, updatedAt, lastUsedAt, *keywords, *imageIds',
  recipeImages: 'id, recipeId, createdAt',
  recipeImageThumbnails: 'id, recipeId, createdAt',
} as const;
