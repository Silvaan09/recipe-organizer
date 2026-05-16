import { getAllRecipeImages, getAllRecipes, replaceLocalDatabase } from '../../db';
import type { Recipe, RecipeImage } from '../../types/recipe';
import { getLocalRecipeImage } from '../../utils/recipeImages';
import {
  assertUniqueIds,
  isRecord,
  validateRecipe,
  validateRecipeImage,
} from '../../validation/dataValidation';

const BACKUP_FORMAT = 'recipe-organizer.backup';
const BACKUP_VERSION = 1;

type BackupImageRecord = {
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
    throw new Error('Backup contains an invalid image.');
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
    throw new Error('Backup contains an image with missing fields.');
  }

  if (!image.id.trim() || !image.recipeId.trim()) {
    throw new Error('Backup contains an image without an id or recipe relationship.');
  }

  return {
    id: image.id,
    recipeId: image.recipeId,
    fileName: image.fileName,
    mimeType: image.mimeType || 'image/jpeg',
    size: image.size,
    createdAt: image.createdAt,
    dataBase64: image.dataBase64,
  };
}

function validateBackupShape(value: unknown): Omit<BackupFile, 'recipes' | 'images'> & {
  recipes: Recipe[];
  images: BackupImageRecord[];
} {
  if (!isRecord(value)) {
    throw new Error('Backup file is not valid JSON data.');
  }

  if (value.format !== BACKUP_FORMAT || value.version !== BACKUP_VERSION) {
    throw new Error('Backup file format is not supported.');
  }

  if (typeof value.exportedAt !== 'string' || !Array.isArray(value.recipes) || !Array.isArray(value.images)) {
    throw new Error('Backup file is missing required sections.');
  }

  const recipes = value.recipes.map((recipe) => {
    const validation = validateRecipe(recipe);

    if (!validation.ok) {
      throw new Error(`Backup contains an invalid recipe: ${validation.errors.join(' ')}`);
    }

    return validation.data;
  });
  const images = value.images.map(validateBackupImage);
  const recipeIds = recipes.map((recipe) => recipe.id);
  const imageIds = images.map((image) => image.id);
  const recipeIdSet = new Set(recipeIds);
  const imageIdSet = new Set(imageIds);

  assertUniqueIds(recipeIds, 'recipe ids');
  assertUniqueIds(imageIds, 'image ids');

  images.forEach((image) => {
    if (!recipeIdSet.has(image.recipeId)) {
      throw new Error(`Image ${image.id} references a missing recipe.`);
    }
  });

  recipes.forEach((recipe) => {
    [...recipe.imageIds, recipe.previewImageId]
      .filter((imageId): imageId is string => Boolean(imageId))
      .forEach((imageId) => {
      if (!imageIdSet.has(imageId)) {
        throw new Error(`Recipe ${recipe.title} references a missing image.`);
      }

      const image = images.find((backupImage) => backupImage.id === imageId);

      if (image?.recipeId !== recipe.id) {
        throw new Error(`Image ${imageId} is linked to the wrong recipe.`);
      }
    });
  });

  images.forEach((image) => {
    const recipe = recipes.find((backupRecipe) => backupRecipe.id === image.recipeId);

    if (!recipe || (!recipe.imageIds.includes(image.id) && recipe.previewImageId !== image.id)) {
      throw new Error(`Image ${image.id} is not referenced by its recipe.`);
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
        reject(new Error('Image data could not be read.'));
        return;
      }

      resolve(result.split(',')[1] ?? '');
    };

    reader.onerror = () => reject(new Error('Image data could not be read.'));
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mimeType: string) {
  let binary: string;

  try {
    binary = atob(base64);
  } catch {
    throw new Error('Backup contains invalid image data.');
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

      reject(new Error('Backup file could not be read.'));
    };

    reader.onerror = () => reject(new Error('Backup file could not be read.'));
    reader.readAsText(file);
  });
}

export async function createBackupFile(): Promise<BackupFile> {
  const [recipes, images] = await Promise.all([getAllRecipes(), getAllRecipeImages()]);
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
          throw new Error(`Recipe ${recipe.title} references an image that could not be exported.`);
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
    throw new Error('Backup file is not valid JSON.');
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
  }));
  images.forEach((image) => {
    const validation = validateRecipeImage(image);

    if (!validation.ok) {
      throw new Error(`Backup contains an invalid image: ${validation.errors.join(' ')}`);
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
