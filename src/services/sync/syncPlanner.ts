import { getAllRecipeImages, getAllStoredRecipes } from '../../db';
import type { Recipe, RecipeImage } from '../../types/recipe';
import type { SyncStatus } from '../../types/sync';

type SyncPlanItem = {
  id: string;
  reason: string;
  syncStatus: SyncStatus;
  title: string;
};

export type FirebaseSyncPlan = {
  createdAt: string;
  estimatedUploadSize: number;
  imagePlan: SyncPlanItem[];
  imagesMarkedDeleted: number;
  imagesPendingSync: number;
  recipePlan: SyncPlanItem[];
  recipesInConflict: number;
  recipesMarkedDeleted: number;
  recipesPendingSync: number;
  totalImages: number;
  totalRecipes: number;
  warnings: string[];
};

function shouldSyncRecord(record: Pick<Recipe | RecipeImage, 'deletedAt' | 'syncStatus'>) {
  return (
    record.syncStatus === 'local-only' ||
    record.syncStatus === 'pending-sync' ||
    record.syncStatus === 'sync-error' ||
    Boolean(record.deletedAt)
  );
}

function getPlanReason(record: Pick<Recipe | RecipeImage, 'deletedAt' | 'syncStatus'>) {
  if (record.deletedAt) {
    return 'als gelöscht markiert';
  }

  if (record.syncStatus === 'local-only') {
    return 'nur lokal';
  }

  if (record.syncStatus === 'sync-error') {
    return 'vorheriger Sync-Fehler';
  }

  return 'Sync ausstehend';
}

function estimateRecipeSize(recipe: Recipe) {
  return new Blob([JSON.stringify(recipe)]).size;
}

function formatRecipeTitle(recipe: Recipe) {
  return recipe.deletedAt ? `${recipe.title} (gelöscht)` : recipe.title;
}

export async function createFirebaseSyncPlan(): Promise<FirebaseSyncPlan> {
  const [recipes, images] = await Promise.all([getAllStoredRecipes(), getAllRecipeImages()]);
  const recipesToSync = recipes.filter(shouldSyncRecord);
  const imagesToSync = images.filter(shouldSyncRecord);
  const recipesInConflict = recipes.filter((recipe) => recipe.syncStatus === 'sync-conflict').length;
  const estimatedUploadSize =
    recipesToSync.reduce((totalSize, recipe) => totalSize + estimateRecipeSize(recipe), 0) +
    imagesToSync.reduce((totalSize, image) => totalSize + image.size, 0);
  const warnings = [
    'Nur Testlauf: Es werden keine Firestore-Dokumente geschrieben.',
    'Nur Testlauf: Es werden keine Firebase-Storage-Dateien hochgeladen.',
    ...(recipesInConflict > 0
      ? [`${recipesInConflict} Rezeptkonflikt${recipesInConflict === 1 ? '' : 'e'} müssen geprüft werden.`]
      : []),
  ];

  return {
    createdAt: new Date().toISOString(),
    estimatedUploadSize,
    imagePlan: imagesToSync.map((image) => ({
      id: image.id,
      reason: getPlanReason(image),
      syncStatus: image.syncStatus,
      title: image.fileName,
    })),
    imagesMarkedDeleted: images.filter((image) => image.deletedAt).length,
    imagesPendingSync: imagesToSync.length,
    recipePlan: recipesToSync.map((recipe) => ({
      id: recipe.id,
      reason: getPlanReason(recipe),
      syncStatus: recipe.syncStatus,
      title: formatRecipeTitle(recipe),
    })),
    recipesInConflict,
    recipesMarkedDeleted: recipes.filter((recipe) => recipe.deletedAt).length,
    recipesPendingSync: recipesToSync.length,
    totalImages: images.length,
    totalRecipes: recipes.length,
    warnings,
  };
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
