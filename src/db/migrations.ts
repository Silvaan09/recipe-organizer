export const DATABASE_NAME = 'recipe-organizer';
export const DATABASE_SCHEMA_VERSION = 7;

export const DATABASE_STORES = {
  recipes:
    'id, title, archivedAt, deletedAt, syncStatus, createdAt, updatedAt, localUpdatedAt, lastSyncedAt, lastUsedAt, *keywords, *imageIds',
  recipeImages: 'id, recipeId, deletedAt, syncStatus, createdAt, localUpdatedAt, lastSyncedAt',
  recipeImageThumbnails: 'id, recipeId, createdAt',
} as const;
