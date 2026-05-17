import type { SyncMetadata } from './sync';

export type RecipeImagePosition = {
  x: number;
  y: number;
};

export type Recipe = SyncMetadata & {
  id: string;
  title: string;
  keywords: string[];
  previewImageId?: string;
  previewImagePosition?: RecipeImagePosition;
  imageIds: string[];
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string;
};

export type RecipeImage = SyncMetadata & {
  id: string;
  recipeId: string;
  blob: Blob;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

export type RecipeImageThumbnail = {
  id: string;
  recipeId: string;
  blob: Blob;
  createdAt: string;
  mimeType: string;
  size: number;
};

export type NewRecipeInput = {
  title: string;
  keywords: string[];
  previewImageId?: string;
  previewImagePosition?: RecipeImagePosition;
  imageIds: string[];
  lastUsedAt?: string;
};

export type RecipeUpdateInput = Partial<
  Pick<
    Recipe,
    | 'title'
    | 'keywords'
    | 'previewImageId'
    | 'previewImagePosition'
    | 'imageIds'
    | 'archivedAt'
    | 'deletedAt'
    | 'lastUsedAt'
  >
>;

export type RecipeSummary = {
  id: string;
  title: string;
  keywords: string[];
  previewImageId?: string;
  previewImagePosition?: RecipeImagePosition;
  imageIds: string[];
  lastUsedAt: string;
};
