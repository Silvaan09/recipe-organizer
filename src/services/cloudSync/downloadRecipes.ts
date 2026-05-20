import { collection, getDocs, type DocumentData } from 'firebase/firestore';
import { getBlob, ref } from 'firebase/storage';

import {
  getRecipe,
  getRecipeImage,
  markRecipeSyncConflict,
  putSyncedRecipe,
  putSyncedRecipeImage,
} from '../../db';
import { firebaseAuth, firebaseStorage, firestore } from '../../firebase';
import { generateRecipeImageThumbnail } from '../image';
import { logger } from '../../utils/logger';
import type { Recipe, RecipeImage, RecipeImageThumbnail } from '../../types/recipe';
import { isRecord, isStringArray } from '../../validation/dataValidation';

type CloudImageUpload = {
  downloadURL?: string;
  fileName: string;
  id: string;
  mimeType: string;
  role?: 'preview' | 'recipe';
  size?: number;
  storagePath?: string;
};

type CloudRecipe = Recipe & {
  cloudUpdatedAt: string;
  imageUploads: CloudImageUpload[];
};

const IMAGE_DOWNLOAD_TIMEOUT_MS = 15_000;

export type DownloadSyncProgress = {
  cloudRecipesFound: number;
  conflicts: number;
  currentRecipeId?: string;
  currentRecipeTitle?: string;
  errors: number;
  imagesDownloaded: number;
  recipesProcessed: number;
  recipesAdded: number;
  recipesSkipped: number;
  recipesUpdated: number;
};

export type DownloadSyncSummary = DownloadSyncProgress & {
  finishedAt: string;
  imageErrors: Array<{
    imageId: string;
    message: string;
    recipeId: string;
    recipeTitle: string;
  }>;
  messages: Array<{
    id: string;
    message: string;
    status: 'added' | 'conflict' | 'error' | 'skipped' | 'updated';
    title: string;
  }>;
  startedAt: string;
};

export type DownloadSyncProgressHandler = (progress: DownloadSyncProgress) => void;

function nowIso() {
  return new Date().toISOString();
}

function getReadableError(error: unknown) {
  return error instanceof Error ? error.message : 'Cloud-Download fehlgeschlagen.';
}

function withTimeout<T>(promise: Promise<T>, message: string, timeoutMs = IMAGE_DOWNLOAD_TIMEOUT_MS) {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timeoutId);
  });
}

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asDateString(value: unknown) {
  const text = asString(value);

  return text && !Number.isNaN(Date.parse(text)) ? text : undefined;
}

function getCloudUpdatedAt(data: DocumentData) {
  return (
    asDateString(data.cloudUpdatedAt) ??
    asDateString(data.updatedAt) ??
    asDateString(data.uploadedAt) ??
    nowIso()
  );
}

function isCloudNewerThanLocal(cloudRecipe: CloudRecipe, localRecipe: Recipe) {
  const cloudTime = Date.parse(cloudRecipe.cloudUpdatedAt);
  const localTime = Date.parse(localRecipe.updatedAt);

  return Number.isFinite(cloudTime) && (!Number.isFinite(localTime) || cloudTime > localTime);
}

function hasUnsyncedLocalChanges(recipe: Recipe) {
  return recipe.syncStatus !== 'synced';
}

function normalizeCloudImageUpload(value: unknown): CloudImageUpload | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = asString(value.id);

  if (!id) {
    return undefined;
  }

  return {
    downloadURL: asString(value.downloadURL),
    fileName: asString(value.fileName) ?? `${id}.jpg`,
    id,
    mimeType: asString(value.mimeType) ?? 'image/jpeg',
    role: value.role === 'preview' || value.role === 'recipe' ? value.role : undefined,
    size: typeof value.size === 'number' && Number.isFinite(value.size) ? value.size : undefined,
    storagePath: asString(value.storagePath),
  };
}

function getCloudImageUploads(data: DocumentData) {
  const uploads = Array.isArray(data.imageUploads)
    ? data.imageUploads.flatMap((item) => {
        const upload = normalizeCloudImageUpload(item);

        return upload ? [upload] : [];
      })
    : [];
  const previewUpload = normalizeCloudImageUpload(data.previewImageUpload);
  const uploadsById = new Map(uploads.map((upload) => [upload.id, upload]));

  if (previewUpload) {
    uploadsById.set(previewUpload.id, previewUpload);
  }

  return [...uploadsById.values()];
}

function getCloudRecipeImageIds(data: DocumentData, imageUploads: CloudImageUpload[]) {
  const uploadedRecipeImageIds = imageUploads
    .filter((upload) => upload.role !== 'preview')
    .map((upload) => upload.id);
  const imageIds = isStringArray(data.imageIds) ? data.imageIds : uploadedRecipeImageIds;

  return [...new Set([...imageIds, ...uploadedRecipeImageIds])];
}

function createCloudRecipe(documentId: string, data: DocumentData, syncedAt: string): CloudRecipe {
  const id = asString(data.id) ?? documentId;
  const cloudUpdatedAt = getCloudUpdatedAt(data);
  const deletedAt = asDateString(data.deletedAt);
  const createdAt = asDateString(data.createdAt) ?? cloudUpdatedAt;
  const updatedAt = asDateString(data.updatedAt) ?? cloudUpdatedAt;
  const imageUploads = getCloudImageUploads(data);

  return {
    id,
    title: asString(data.title) ?? 'Untitled recipe',
    keywords: isStringArray(data.keywords) ? data.keywords : [],
    previewImageId: asString(data.previewImageId),
    previewImagePosition: isRecord(data.previewImagePosition)
      ? {
          x: Number(data.previewImagePosition.x),
          y: Number(data.previewImagePosition.y),
        }
      : undefined,
    imageIds: getCloudRecipeImageIds(data, imageUploads),
    archivedAt: deletedAt ? (asDateString(data.archivedAt) ?? deletedAt) : asDateString(data.archivedAt),
    createdAt,
    deletedAt,
    lastSyncedAt: syncedAt,
    lastUsedAt: asDateString(data.lastUsedAt) ?? updatedAt,
    localUpdatedAt: cloudUpdatedAt,
    syncError: undefined,
    syncStatus: 'synced',
    updatedAt,
    cloudUpdatedAt,
    imageUploads,
  };
}

async function downloadBlobFromUrl(upload: CloudImageUpload) {
  if (!upload.downloadURL) {
    throw new Error(`Cloud-Bild ${upload.id} hat keine Download-URL.`);
  }

  const response = await withTimeout(
    fetch(upload.downloadURL),
    `Download von Cloud-Bild ${upload.id} hat zu lange gedauert.`,
  );

  if (!response.ok) {
    throw new Error(`Cloud-Bild ${upload.id} konnte nicht heruntergeladen werden.`);
  }

  return withTimeout(
    response.blob(),
    `Umwandlung von Cloud-Bild ${upload.id} hat zu lange gedauert.`,
  );
}

async function downloadBlobFromStorage(upload: CloudImageUpload) {
  if (!upload.storagePath) {
    throw new Error(`Cloud-Bild ${upload.id} hat keinen Storage-Pfad.`);
  }

  if (!firebaseStorage) {
    throw new Error('Firebase Storage ist nicht konfiguriert.');
  }

  return withTimeout(
    getBlob(ref(firebaseStorage, upload.storagePath)),
    `Storage-Download von Cloud-Bild ${upload.id} hat zu lange gedauert.`,
  );
}

async function downloadCloudImageBlob(upload: CloudImageUpload) {
  if (upload.downloadURL) {
    try {
      return await downloadBlobFromUrl(upload);
    } catch (error) {
      if (!upload.storagePath) {
        throw error;
      }

      logger.warn('Download URL image download failed; falling back to Storage path.', {
        imageId: upload.id,
        storagePath: upload.storagePath,
      });
    }
  }

  if (upload.storagePath) {
    try {
      return await downloadBlobFromStorage(upload);
    } catch (error) {
      if (!upload.downloadURL) {
        throw error;
      }

      logger.warn('Storage path image download failed; falling back to download URL.', {
        imageId: upload.id,
        storagePath: upload.storagePath,
      });
    }
  }

  return downloadBlobFromUrl(upload);
}

async function saveMissingCloudImages(
  recipe: CloudRecipe,
  syncedAt: string,
): Promise<{
  downloaded: number;
  errors: Array<{ imageId: string; message: string; recipeId: string; recipeTitle: string }>;
}> {
  let downloaded = 0;
  const errors: Array<{ imageId: string; message: string; recipeId: string; recipeTitle: string }> = [];

  for (const upload of recipe.imageUploads) {
    const existingImage = await getRecipeImage(upload.id);

    if (existingImage) {
      continue;
    }

    try {
      const blob = await downloadCloudImageBlob(upload);
      const image: RecipeImage = {
        id: upload.id,
        recipeId: recipe.id,
        blob,
        fileName: upload.fileName,
        mimeType: blob.type || upload.mimeType,
        size: blob.size || upload.size || 0,
        createdAt: syncedAt,
        lastSyncedAt: syncedAt,
        localUpdatedAt: syncedAt,
        syncStatus: 'synced',
      };
      let thumbnail: RecipeImageThumbnail | undefined;

      try {
        const thumbnailFile = await generateRecipeImageThumbnail(blob, upload.fileName);
        thumbnail = {
          id: upload.id,
          recipeId: recipe.id,
          blob: thumbnailFile,
          createdAt: syncedAt,
          mimeType: thumbnailFile.type,
          size: thumbnailFile.size,
        };
      } catch {
        thumbnail = undefined;
      }

      await putSyncedRecipeImage(image, thumbnail);
      downloaded += 1;
    } catch (error) {
      const message = getReadableError(error);
      errors.push({
        imageId: upload.id,
        message,
        recipeId: recipe.id,
        recipeTitle: recipe.title,
      });
      logger.warn('Cloud image download failed.', {
        error,
        imageId: upload.id,
        recipeId: recipe.id,
      });
    }
  }

  return { downloaded, errors };
}

export async function downloadRecipesFromFirebase(
  onProgress?: DownloadSyncProgressHandler,
): Promise<DownloadSyncSummary> {
  if (!firestore || !firebaseStorage || !firebaseAuth) {
    throw new Error('Firebase ist nicht konfiguriert. Füge zuerst deine Vite-Firebase-Umgebungsvariablen hinzu.');
  }

  const currentUser = firebaseAuth.currentUser;

  if (!currentUser) {
    throw new Error('Melde dich mit Google an, bevor du aus der Cloud herunterlädst.');
  }

  const startedAt = nowIso();
  const syncedAt = nowIso();
  const snapshot = await getDocs(collection(firestore, 'users', currentUser.uid, 'recipes'));
  const cloudRecipes = snapshot.docs.map((cloudDocument) =>
    createCloudRecipe(cloudDocument.id, cloudDocument.data(), syncedAt),
  );
  const progress: DownloadSyncProgress = {
    cloudRecipesFound: cloudRecipes.length,
    conflicts: 0,
    errors: 0,
    imagesDownloaded: 0,
    recipesProcessed: 0,
    recipesAdded: 0,
    recipesSkipped: 0,
    recipesUpdated: 0,
  };
  const messages: DownloadSyncSummary['messages'] = [];
  const imageErrors: DownloadSyncSummary['imageErrors'] = [];
  const emitProgress = (recipe?: CloudRecipe) => {
    onProgress?.({
      ...progress,
      currentRecipeId: recipe?.id,
      currentRecipeTitle: recipe?.title,
    });
  };

  emitProgress();

  for (const cloudRecipe of cloudRecipes) {
    emitProgress(cloudRecipe);

    try {
      const localRecipe = await getRecipe(cloudRecipe.id);

      if (!localRecipe) {
        await putSyncedRecipe(cloudRecipe);
        const imageResult = await saveMissingCloudImages(cloudRecipe, syncedAt);
        progress.imagesDownloaded += imageResult.downloaded;
        progress.errors += imageResult.errors.length;
        imageErrors.push(...imageResult.errors);
        progress.recipesAdded += 1;
        progress.recipesProcessed += 1;
        messages.push({
          id: cloudRecipe.id,
          message: 'Aus der Cloud hinzugefügt.',
          status: 'added',
          title: cloudRecipe.title,
        });
        emitProgress(cloudRecipe);
        continue;
      }

      if (hasUnsyncedLocalChanges(localRecipe)) {
        const message = 'Cloud-Version unterscheidet sich, während lokale Änderungen ausstehen.';
        await markRecipeSyncConflict(localRecipe.id, message);
        progress.conflicts += 1;
        progress.recipesProcessed += 1;
        messages.push({
          id: cloudRecipe.id,
          message,
          status: 'conflict',
          title: cloudRecipe.title,
        });
        emitProgress(cloudRecipe);
        continue;
      }

      if (!cloudRecipe.deletedAt && !isCloudNewerThanLocal(cloudRecipe, localRecipe)) {
        const imageResult = await saveMissingCloudImages(cloudRecipe, syncedAt);
        progress.imagesDownloaded += imageResult.downloaded;
        progress.errors += imageResult.errors.length;
        imageErrors.push(...imageResult.errors);
        progress.recipesSkipped += 1;
        progress.recipesProcessed += 1;
        messages.push({
          id: cloudRecipe.id,
          message:
            imageResult.downloaded > 0
              ? `Lokale synchronisierte Version war aktuell. ${imageResult.downloaded} fehlende Bilder heruntergeladen.`
              : 'Lokale synchronisierte Version ist bereits aktuell.',
          status: 'skipped',
          title: cloudRecipe.title,
        });
        emitProgress(cloudRecipe);
        continue;
      }

      await putSyncedRecipe(cloudRecipe);
      const imageResult = await saveMissingCloudImages(cloudRecipe, syncedAt);
      progress.imagesDownloaded += imageResult.downloaded;
      progress.errors += imageResult.errors.length;
      imageErrors.push(...imageResult.errors);
      progress.recipesUpdated += 1;
      progress.recipesProcessed += 1;
      messages.push({
        id: cloudRecipe.id,
        message: cloudRecipe.deletedAt ? 'Aus der Cloud als gelöscht markiert.' : 'Aus der Cloud aktualisiert.',
        status: 'updated',
        title: cloudRecipe.title,
      });
    } catch (error) {
      progress.errors += 1;
      progress.recipesProcessed += 1;
      messages.push({
        id: cloudRecipe.id,
        message: getReadableError(error),
        status: 'error',
        title: cloudRecipe.title,
      });
    }

    emitProgress(cloudRecipe);
  }

  emitProgress();

  return {
    ...progress,
    finishedAt: nowIso(),
    imageErrors,
    messages,
    startedAt,
  };
}
