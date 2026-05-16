import { db } from './schema';
import { generateRecipeImageThumbnail } from '../services/image';
import type { RecipeImage, RecipeImageThumbnail } from '../types/recipe';
import { logger } from '../utils/logger';
import { validateRecipeImage, validateRecipeImageThumbnail } from '../validation/dataValidation';

function nowIso() {
  return new Date().toISOString();
}

function createImageId() {
  if ('crypto' in globalThis && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }

  return `image-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function addRecipeImages(
  recipeId: string,
  files: Array<{ file: File; thumbnailFile?: File }>,
): Promise<string[]> {
  const imagePairs = await Promise.all(
    files.map(async ({ file, thumbnailFile }) => {
      const id = createImageId();
      const createdAt = nowIso();
      const thumbnail = thumbnailFile ?? (await generateRecipeImageThumbnail(file, file.name));
      const image: RecipeImage = {
        id,
        recipeId,
        blob: file,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        createdAt,
      };
      const imageThumbnail: RecipeImageThumbnail = {
        id,
        recipeId,
        blob: thumbnail,
        createdAt,
        mimeType: thumbnail.type,
        size: thumbnail.size,
      };

      return { image, imageThumbnail };
    }),
  );
  const images = imagePairs.map((pair) => pair.image);
  const thumbnails = imagePairs.map((pair) => pair.imageThumbnail);

  await db.transaction('rw', db.recipeImages, db.recipeImageThumbnails, async () => {
    await db.recipeImages.bulkAdd(images);
    await db.recipeImageThumbnails.bulkAdd(thumbnails);
  });

  return images.map((image) => image.id);
}

export async function getRecipeImage(id: string): Promise<RecipeImage | undefined> {
  const image = await db.recipeImages.get(id);

  if (!image) {
    return undefined;
  }

  const validation = validateRecipeImage(image);

  if (!validation.ok) {
    logger.warn('Ignoring corrupted recipe image.', { errors: validation.errors, imageId: id });
    return undefined;
  }

  return validation.data;
}

export async function getRecipeImageThumbnail(
  id: string,
): Promise<RecipeImageThumbnail | undefined> {
  const thumbnail = await db.recipeImageThumbnails.get(id);

  if (!thumbnail) {
    return undefined;
  }

  const validation = validateRecipeImageThumbnail(thumbnail);

  if (!validation.ok) {
    logger.warn('Ignoring corrupted recipe image thumbnail.', {
      errors: validation.errors,
      imageId: id,
    });
    return undefined;
  }

  return validation.data;
}

export async function getOrCreateRecipeImageThumbnail(
  id: string,
): Promise<RecipeImageThumbnail | undefined> {
  const existingThumbnail = await getRecipeImageThumbnail(id);

  if (existingThumbnail) {
    return existingThumbnail;
  }

  const image = await getRecipeImage(id);

  if (!image) {
    return undefined;
  }

  let thumbnailFile: File;

  try {
    thumbnailFile = await generateRecipeImageThumbnail(image.blob, image.fileName);
  } catch (error) {
    logger.warn('Could not generate thumbnail for recipe image.', { error, imageId: id });
    return undefined;
  }
  const thumbnail: RecipeImageThumbnail = {
    id: image.id,
    recipeId: image.recipeId,
    blob: thumbnailFile,
    createdAt: image.createdAt,
    mimeType: thumbnailFile.type,
    size: thumbnailFile.size,
  };

  await db.recipeImageThumbnails.put(thumbnail);

  return thumbnail;
}

export async function getRecipeImagesByRecipeId(recipeId: string): Promise<RecipeImage[]> {
  const images = await db.recipeImages.where('recipeId').equals(recipeId).sortBy('createdAt');

  return images.flatMap((image) => {
    const validation = validateRecipeImage(image);

    if (!validation.ok) {
      logger.warn('Ignoring corrupted recipe image in recipe image list.', {
        errors: validation.errors,
        imageId: image.id,
        recipeId,
      });
      return [];
    }

    return [validation.data];
  });
}

export async function deleteRecipeImages(ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  await db.transaction('rw', db.recipeImages, db.recipeImageThumbnails, async () => {
    await db.recipeImageThumbnails.bulkDelete(ids);
    await db.recipeImages.bulkDelete(ids);
  });
}

export async function deleteRecipeImagesByRecipeId(recipeId: string): Promise<void> {
  const images = await getRecipeImagesByRecipeId(recipeId);

  await deleteRecipeImages(images.map((image) => image.id));
}
