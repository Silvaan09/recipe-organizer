import { getAllRecipeImages, getAllStoredRecipes, replaceLocalDatabase } from '../../db';
import { isSyncStatus, normalizeSyncMetadata } from '../sync';
import type { Recipe, RecipeImage } from '../../types/recipe';
import type { SyncMetadata } from '../../types/sync';
import { getLocalRecipeImage } from '../../utils/recipeImages';
import {
  assertUniqueIds,
  isRecord,
  validateRecipe,
  validateRecipeImage,
} from '../../validation/dataValidation';

const BACKUP_FORMAT = 'recipe-organizer.backup';
const BACKUP_VERSION = 1;

type BackupImageRecord = Partial<SyncMetadata> & {
  id: string;
  recipeId: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  dataBase64: string;
};

type BackupFile = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  recipes: Recipe[];
  images: BackupImageRecord[];
};

export type ValidatedBackup = {
  exportedAt: string;
  imageCount: number;
  images: RecipeImage[];
  recipeCount: number;
  recipes: Recipe[];
};

function validateBackupImage(value: unknown): BackupImageRecord {
  if (!isRecord(value)) {
    throw new Error('Backup enthält ein ungültiges Bild.');
  }

  const image = value;

  if (
    typeof image.id !== 'string' ||
    typeof image.recipeId !== 'string' ||
    typeof image.fileName !== 'string' ||
    typeof image.mimeType !== 'string' ||
    typeof image.size !== 'number' ||
    typeof image.createdAt !== 'string' ||
    typeof image.dataBase64 !== 'string'
  ) {
    throw new Error('Backup enthält ein Bild mit fehlenden Feldern.');
  }

  if (!image.id.trim() || !image.recipeId.trim()) {
    throw new Error('Backup enthält ein Bild ohne ID oder Rezeptzuordnung.');
  }

  return {
    id: image.id,
    recipeId: image.recipeId,
    fileName: image.fileName,
    mimeType: image.mimeType || 'image/jpeg',
    size: image.size,
    createdAt: image.createdAt,
    dataBase64: image.dataBase64,
    ...normalizeSyncMetadata(
      {
        deletedAt: typeof image.deletedAt === 'string' ? image.deletedAt : undefined,
        lastSyncedAt: typeof image.lastSyncedAt === 'string' ? image.lastSyncedAt : undefined,
        localUpdatedAt:
          typeof image.localUpdatedAt === 'string' ? image.localUpdatedAt : image.createdAt,
        syncStatus: isSyncStatus(image.syncStatus) ? image.syncStatus : 'local-only',
      },
      image.createdAt,
    ),
  };
}

function validateBackupShape(value: unknown): Omit<BackupFile, 'recipes' | 'images'> & {
  recipes: Recipe[];
  images: BackupImageRecord[];
} {
  if (!isRecord(value)) {
    throw new Error('Backup-Datei enthält keine gültigen JSON-Daten.');
  }

  if (value.format !== BACKUP_FORMAT || value.version !== BACKUP_VERSION) {
    throw new Error('Backup-Dateiformat wird nicht unterstützt.');
  }

  if (typeof value.exportedAt !== 'string' || !Array.isArray(value.recipes) || !Array.isArray(value.images)) {
    throw new Error('Backup-Datei enthält nicht alle erforderlichen Bereiche.');
  }

  const recipes = value.recipes.map((recipe) => {
    const validation = validateRecipe(recipe);

    if (!validation.ok) {
      throw new Error(`Backup enthält ein ungültiges Rezept: ${validation.errors.join(' ')}`);
    }

    return validation.data;
  });
  const images = value.images.map(validateBackupImage);
  const recipeIds = recipes.map((recipe) => recipe.id);
  const imageIds = images.map((image) => image.id);
  const recipeIdSet = new Set(recipeIds);
  const imageIdSet = new Set(imageIds);

  assertUniqueIds(recipeIds, 'Rezept-IDs');
  assertUniqueIds(imageIds, 'Bild-IDs');

  images.forEach((image) => {
    if (!recipeIdSet.has(image.recipeId)) {
      throw new Error(`Bild ${image.id} verweist auf ein fehlendes Rezept.`);
    }
  });

  recipes.forEach((recipe) => {
    [...recipe.imageIds, recipe.previewImageId]
      .filter((imageId): imageId is string => Boolean(imageId))
      .forEach((imageId) => {
      if (!imageIdSet.has(imageId)) {
        throw new Error(`Rezept ${recipe.title} verweist auf ein fehlendes Bild.`);
      }

      const image = images.find((backupImage) => backupImage.id === imageId);

      if (image?.recipeId !== recipe.id) {
        throw new Error(`Bild ${imageId} ist mit dem falschen Rezept verknüpft.`);
      }
    });
  });

  images.forEach((image) => {
    const recipe = recipes.find((backupRecipe) => backupRecipe.id === image.recipeId);

    if (!recipe || (!recipe.imageIds.includes(image.id) && recipe.previewImageId !== image.id)) {
      throw new Error(`Bild ${image.id} wird vom Rezept nicht referenziert.`);
    }
  });

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: value.exportedAt,
    recipes,
    images,
  };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== 'string') {
        reject(new Error('Bilddaten konnten nicht gelesen werden.'));
        return;
      }

      resolve(result.split(',')[1] ?? '');
    };

    reader.onerror = () => reject(new Error('Bilddaten konnten nicht gelesen werden.'));
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mimeType: string) {
  let binary: string;

  try {
    binary = atob(base64);
  } catch {
    throw new Error('Backup enthält ungültige Bilddaten.');
  }

  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Backup-Datei konnte nicht gelesen werden.'));
    };

    reader.onerror = () => reject(new Error('Backup-Datei konnte nicht gelesen werden.'));
    reader.readAsText(file);
  });
}

export async function createBackupFile(): Promise<BackupFile> {
  const [recipes, images] = await Promise.all([getAllStoredRecipes(), getAllRecipeImages()]);
  const storedImageById = new Map(images.map((image) => [image.id, image]));
  const exportedImageIds = new Set<string>();
  const backupImages = await Promise.all(
    recipes.flatMap((recipe) =>
      [...recipe.imageIds, recipe.previewImageId]
        .filter((imageId): imageId is string => Boolean(imageId))
        .filter((imageId) => {
          if (exportedImageIds.has(imageId)) {
            return false;
          }

          exportedImageIds.add(imageId);
          return true;
        })
        .map(async (imageId) => {
        const storedImage = storedImageById.get(imageId);

        if (storedImage) {
          return createBackupImageRecord(storedImage);
        }

        const localImage = getLocalRecipeImage(imageId);

        if (!localImage) {
          throw new Error(`Rezept ${recipe.title} verweist auf ein Bild, das nicht exportiert werden konnte.`);
        }

        const response = await fetch(localImage.src);
        const blob = await response.blob();

        return createBackupImageRecord({
          id: imageId,
          recipeId: recipe.id,
          blob,
          fileName: `${imageId}.svg`,
          mimeType: blob.type || 'image/svg+xml',
          size: blob.size,
          createdAt: recipe.createdAt,
          localUpdatedAt: recipe.localUpdatedAt,
          syncStatus: recipe.syncStatus,
        });
      }),
    ),
  );

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    recipes,
    images: backupImages,
  };
}

async function createBackupImageRecord(image: RecipeImage): Promise<BackupImageRecord> {
  return {
    id: image.id,
    recipeId: image.recipeId,
    fileName: image.fileName,
    mimeType: image.mimeType,
    size: image.size,
    createdAt: image.createdAt,
    dataBase64: await blobToBase64(image.blob),
    deletedAt: image.deletedAt,
    lastSyncedAt: image.lastSyncedAt,
    localUpdatedAt: image.localUpdatedAt,
    syncStatus: image.syncStatus,
  };
}

export async function downloadBackupFile(): Promise<{ imageCount: number; recipeCount: number }> {
  const backupFile = await createBackupFile();
  const json = JSON.stringify(backupFile, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateLabel = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `recipe-organizer-backup-${dateLabel}.json`;
  link.click();
  URL.revokeObjectURL(url);

  return {
    imageCount: backupFile.images.length,
    recipeCount: backupFile.recipes.length,
  };
}

export async function validateBackupFile(file: File): Promise<ValidatedBackup> {
  const text = await readTextFile(file);
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(text);
  } catch {
    throw new Error('Backup-Datei ist kein gültiges JSON.');
  }

  const parsedBackup = validateBackupShape(parsedJson);
  const images = parsedBackup.images.map((image) => ({
    id: image.id,
    recipeId: image.recipeId,
    blob: base64ToBlob(image.dataBase64, image.mimeType),
    fileName: image.fileName,
    mimeType: image.mimeType,
    size: image.size,
    createdAt: image.createdAt,
    ...normalizeSyncMetadata(image, image.createdAt),
  }));
  images.forEach((image) => {
    const validation = validateRecipeImage(image);

    if (!validation.ok) {
      throw new Error(`Backup enthält ein ungültiges Bild: ${validation.errors.join(' ')}`);
    }
  });

  return {
    exportedAt: parsedBackup.exportedAt,
    imageCount: images.length,
    images,
    recipeCount: parsedBackup.recipes.length,
    recipes: parsedBackup.recipes,
  };
}

export async function restoreBackup(validatedBackup: ValidatedBackup): Promise<void> {
  await replaceLocalDatabase(validatedBackup.recipes, validatedBackup.images);
}
