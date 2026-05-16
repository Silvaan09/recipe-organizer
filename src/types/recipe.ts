export type Recipe = {
  id: string;
  title: string;
  keywords: string[];
  previewImageId?: string;
  imageIds: string[];
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string;
};

export type RecipeImage = {
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
  imageIds: string[];
  lastUsedAt?: string;
};

export type RecipeUpdateInput = Partial<
  Pick<Recipe, 'title' | 'keywords' | 'previewImageId' | 'imageIds' | 'lastUsedAt'>
>;

export type RecipeSummary = {
  id: string;
  title: string;
  keywords: string[];
  previewImageId?: string;
  imageIds: string[];
  lastUsedAt: string;
};
