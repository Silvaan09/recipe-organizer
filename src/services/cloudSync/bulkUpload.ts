import { getAllStoredRecipes } from '../../db';
import { firebaseAuth, firebaseStorage, firestore } from '../../firebase';
import type { Recipe } from '../../types/recipe';
import { uploadSingleRecipeToFirebase } from './uploadRecipe';

export type BulkUploadProgress = {
  completedUploads: number;
  currentRecipeId?: string;
  currentRecipeTitle?: string;
  failedUploads: number;
  successfulUploads: number;
  totalPendingRecipes: number;
};

export type BulkUploadRecipeResult = {
  errorMessage?: string;
  imageCount?: number;
  recipeId: string;
  status: 'success' | 'failed';
  title: string;
};

export type BulkUploadSummary = {
  failedUploads: number;
  finishedAt: string;
  results: BulkUploadRecipeResult[];
  startedAt: string;
  successfulUploads: number;
  totalPendingRecipes: number;
};

export type BulkUploadProgressHandler = (progress: BulkUploadProgress) => void;

function getReadableError(error: unknown) {
  return error instanceof Error ? error.message : 'Recipe upload failed.';
}

function getTimestampValue(timestamp?: string) {
  if (!timestamp) {
    return undefined;
  }

  const value = Date.parse(timestamp);

  return Number.isFinite(value) ? value : undefined;
}

function wasChangedAfterLastSync(recipe: Recipe) {
  const localUpdatedAt = getTimestampValue(recipe.localUpdatedAt);
  const lastSyncedAt = getTimestampValue(recipe.lastSyncedAt);
  const deletedAt = getTimestampValue(recipe.deletedAt);

  if (!lastSyncedAt) {
    return true;
  }

  if (!localUpdatedAt) {
    return false;
  }

  return localUpdatedAt > lastSyncedAt || Boolean(deletedAt && deletedAt > lastSyncedAt);
}

export function recipeNeedsFirebaseUpload(recipe: Recipe) {
  return (
    recipe.syncStatus === 'pending-sync' ||
    recipe.syncStatus === 'sync-error' ||
    wasChangedAfterLastSync(recipe)
  );
}

export async function getPendingFirebaseUploadRecipes() {
  const recipes = await getAllStoredRecipes();

  return recipes.filter(recipeNeedsFirebaseUpload);
}

export async function uploadPendingRecipesToFirebase(
  onProgress?: BulkUploadProgressHandler,
): Promise<BulkUploadSummary> {
  if (!firestore || !firebaseStorage || !firebaseAuth) {
    throw new Error('Firebase is not configured. Add your Vite Firebase env vars first.');
  }

  if (!firebaseAuth.currentUser) {
    throw new Error('Sign in with Google before uploading pending changes.');
  }

  const startedAt = new Date().toISOString();
  const pendingRecipes = await getPendingFirebaseUploadRecipes();
  const results: BulkUploadRecipeResult[] = [];
  let successfulUploads = 0;
  let failedUploads = 0;

  const emitProgress = (currentRecipe?: Recipe) => {
    onProgress?.({
      completedUploads: results.length,
      currentRecipeId: currentRecipe?.id,
      currentRecipeTitle: currentRecipe?.title,
      failedUploads,
      successfulUploads,
      totalPendingRecipes: pendingRecipes.length,
    });
  };

  emitProgress();

  for (const recipe of pendingRecipes) {
    emitProgress(recipe);

    try {
      const result = await uploadSingleRecipeToFirebase(recipe.id);
      successfulUploads += 1;
      results.push({
        imageCount: result.imageCount,
        recipeId: recipe.id,
        status: 'success',
        title: recipe.title,
      });
    } catch (error) {
      failedUploads += 1;
      results.push({
        errorMessage: getReadableError(error),
        recipeId: recipe.id,
        status: 'failed',
        title: recipe.title,
      });
    }

    emitProgress(recipe);
  }

  emitProgress();

  return {
    failedUploads,
    finishedAt: new Date().toISOString(),
    results,
    startedAt,
    successfulUploads,
    totalPendingRecipes: pendingRecipes.length,
  };
}
