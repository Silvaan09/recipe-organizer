import { db } from './schema';
import type { Recipe, RecipeImage } from '../types/recipe';
import { logger } from '../utils/logger';
import { getLocalRecipeImage } from '../utils/recipeImages';
import {
  validateRecipe,
  validateRecipeImage,
  validateRecipeImageThumbnail,
} from '../validation/dataValidation';

export async function getAllRecipeImages(): Promise<RecipeImage[]> {
  const images = await db.recipeImages.toArray();

  return images.flatMap((image) => {
    const validation = validateRecipeImage(image);

    if (!validation.ok) {
      logger.warn('Ignoring corrupted recipe image during export/read.', {
        errors: validation.errors,
        imageId: image.id,
      });
      return [];
    }

    return [validation.data];
  });
}

export async function clearLocalDatabase(): Promise<void> {
  await db.transaction('rw', db.recipes, db.recipeImages, db.recipeImageThumbnails, async () => {
    await db.recipeImageThumbnails.clear();
    await db.recipeImages.clear();
    await db.recipes.clear();
  });
}

export async function replaceLocalDatabase(recipes: Recipe[], images: RecipeImage[]): Promise<void> {
  const validRecipes = recipes.map((recipe) => {
    const validation = validateRecipe(recipe);

    if (!validation.ok) {
      throw new Error(`Ungültiges Rezept in Wiederherstellungsdaten: ${validation.errors.join(' ')}`);
    }

    return validation.data;
  });
  const validImages = images.map((image) => {
    const validation = validateRecipeImage(image);

    if (!validation.ok) {
      throw new Error(`Ungültiges Bild in Wiederherstellungsdaten: ${validation.errors.join(' ')}`);
    }

    return validation.data;
  });

  await db.transaction('rw', db.recipes, db.recipeImages, db.recipeImageThumbnails, async () => {
    await db.recipeImageThumbnails.clear();
    await db.recipeImages.clear();
    await db.recipes.clear();
    await db.recipes.bulkPut(validRecipes);
    await db.recipeImages.bulkPut(validImages);
  });
}

export type DatabaseRepairReport = {
  corruptedImagesRemoved: number;
  corruptedRecipesSkipped: number;
  corruptedThumbnailsRemoved: number;
  localDisplayImagesPromoted: number;
  missingImageReferencesRemoved: number;
  orphanImagesRemoved: number;
  orphanThumbnailsRemoved: number;
};

export async function repairLocalDatabase(): Promise<DatabaseRepairReport> {
  const report: DatabaseRepairReport = {
    corruptedImagesRemoved: 0,
    corruptedRecipesSkipped: 0,
    corruptedThumbnailsRemoved: 0,
    localDisplayImagesPromoted: 0,
    missingImageReferencesRemoved: 0,
    orphanImagesRemoved: 0,
    orphanThumbnailsRemoved: 0,
  };

  await db.transaction('rw', db.recipes, db.recipeImages, db.recipeImageThumbnails, async () => {
    const recipes = await db.recipes.toArray();
    const images = await db.recipeImages.toArray();
    const thumbnails = await db.recipeImageThumbnails.toArray();
    const validRecipeIds = new Set<string>();
    const validImageIds = new Set<string>();
    const corruptedImageIds: string[] = [];
    const corruptedThumbnailIds: string[] = [];

    recipes.forEach((recipe) => {
      const validation = validateRecipe(recipe);

      if (validation.ok) {
        validRecipeIds.add(validation.data.id);
      } else {
        report.corruptedRecipesSkipped += 1;
        logger.warn('Corrupted recipe found during repair; leaving row untouched.', {
          errors: validation.errors,
          recipeId: recipe.id,
        });
      }
    });

    images.forEach((image) => {
      const validation = validateRecipeImage(image);

      if (validation.ok) {
        validImageIds.add(validation.data.id);
      } else {
        corruptedImageIds.push(image.id);
      }
    });

    thumbnails.forEach((thumbnail) => {
      const validation = validateRecipeImageThumbnail(thumbnail);

      if (!validation.ok) {
        corruptedThumbnailIds.push(thumbnail.id);
      }
    });

    if (corruptedImageIds.length > 0) {
      await db.recipeImages.bulkDelete(corruptedImageIds);
      await db.recipeImageThumbnails.bulkDelete(corruptedImageIds);
      report.corruptedImagesRemoved = corruptedImageIds.length;
    }

    if (corruptedThumbnailIds.length > 0) {
      await db.recipeImageThumbnails.bulkDelete(corruptedThumbnailIds);
      report.corruptedThumbnailsRemoved = corruptedThumbnailIds.length;
    }

    await Promise.all(
      recipes.map(async (recipe) => {
        const validation = validateRecipe(recipe);

        if (!validation.ok) {
          return;
        }

        const localDisplayImageId = validation.data.imageIds.find((imageId) =>
          Boolean(getLocalRecipeImage(imageId)),
        );
        const repairedImageIds = validation.data.imageIds.filter(
          (imageId) => !getLocalRecipeImage(imageId) && validImageIds.has(imageId),
        );
        const hasPreviewImage = Boolean(validation.data.previewImageId);
        const hasValidPreviewImage =
          Boolean(validation.data.previewImageId && validImageIds.has(validation.data.previewImageId)) ||
          Boolean(validation.data.previewImageId && getLocalRecipeImage(validation.data.previewImageId));
        const nextPreviewImageId =
          hasValidPreviewImage
            ? validation.data.previewImageId
            : localDisplayImageId;

        if (
          repairedImageIds.length !== validation.data.imageIds.length ||
          (hasPreviewImage && !hasValidPreviewImage) ||
          nextPreviewImageId !== validation.data.previewImageId
        ) {
          report.missingImageReferencesRemoved +=
            validation.data.imageIds.length -
            repairedImageIds.length +
            (hasPreviewImage && !hasValidPreviewImage ? 1 : 0);
          report.localDisplayImagesPromoted +=
            nextPreviewImageId && nextPreviewImageId !== validation.data.previewImageId ? 1 : 0;
          await db.recipes.update(validation.data.id, {
            previewImageId: nextPreviewImageId,
            imageIds: repairedImageIds,
          });
        }
      }),
    );

    const freshRecipes = await db.recipes.toArray();
    const referencedImageIds = new Set(
      freshRecipes.flatMap((recipe) => {
        const validation = validateRecipe(recipe);

        return validation.ok
          ? [...validation.data.imageIds, validation.data.previewImageId].filter(
              (imageId): imageId is string => Boolean(imageId),
            )
          : [];
      }),
    );
    const orphanImageIds = images
      .filter((image) => {
        const validation = validateRecipeImage(image);

        return (
          validation.ok &&
          (!validRecipeIds.has(validation.data.recipeId) || !referencedImageIds.has(validation.data.id))
        );
      })
      .map((image) => image.id);
    const orphanThumbnailIds = thumbnails
      .filter((thumbnail) => {
        const validation = validateRecipeImageThumbnail(thumbnail);

        return validation.ok && !validImageIds.has(validation.data.id);
      })
      .map((thumbnail) => thumbnail.id);

    if (orphanImageIds.length > 0) {
      await db.recipeImages.bulkDelete(orphanImageIds);
      await db.recipeImageThumbnails.bulkDelete(orphanImageIds);
      report.orphanImagesRemoved = orphanImageIds.length;
    }

    if (orphanThumbnailIds.length > 0) {
      await db.recipeImageThumbnails.bulkDelete(orphanThumbnailIds);
      report.orphanThumbnailsRemoved = orphanThumbnailIds.length;
    }
  });

  logger.debug('Database repair completed.', report);

  return report;
}
