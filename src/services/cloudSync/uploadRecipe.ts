import { doc, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import {
  getRecipe,
  getRecipeImage,
  markRecipeImagesSyncError,
  markRecipeImagesSynced,
  markRecipeSyncError,
  markRecipeSynced,
} from '../../db';
import { firebaseAuth, firebaseStorage, firestore } from '../../firebase';
import { logger } from '../../utils/logger';
import type { Recipe, RecipeImage } from '../../types/recipe';
import {
  assertNoUndefinedFirestoreValues,
  sanitizeFirestorePayload,
} from './firestorePayload';

type UploadedRecipeImage = {
  downloadURL: string;
  fileName: string;
  id: string;
  mimeType: string;
  role: 'preview' | 'recipe';
  size: number;
  storagePath: string;
};

export type UploadRecipeResult = {
  imageCount: number;
  recipeId: string;
  uploadedAt: string;
};

function getReadableError(error: unknown) {
  return error instanceof Error ? error.message : 'Recipe upload failed.';
}

function getReferencedImageIds(recipe: Recipe) {
  return [...new Set([recipe.previewImageId, ...recipe.imageIds].filter(Boolean) as string[])];
}

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
}

async function getReferencedLocalImages(recipe: Recipe) {
  const imageIds = getReferencedImageIds(recipe);
  const imageEntries = await Promise.all(
    imageIds.map(async (imageId) => {
      const image = await getRecipeImage(imageId);

      return image ? [imageId, image] as const : undefined;
    }),
  );

  return imageEntries.filter((entry): entry is readonly [string, RecipeImage] => Boolean(entry));
}

async function uploadRecipeImage(
  userId: string,
  recipe: Recipe,
  image: RecipeImage,
): Promise<UploadedRecipeImage> {
  if (!firebaseStorage) {
    throw new Error('Firebase Storage is not configured.');
  }

  const role = image.id === recipe.previewImageId ? 'preview' : 'recipe';
  const storagePath = `users/${userId}/recipes/${recipe.id}/images/${image.id}-${safeFileName(image.fileName)}`;
  const storageReference = ref(firebaseStorage, storagePath);
  const uploadResult = await uploadBytes(storageReference, image.blob, {
    contentType: image.mimeType,
    customMetadata: {
      imageId: image.id,
      recipeId: recipe.id,
      role,
    },
  });
  const downloadURL = await getDownloadURL(uploadResult.ref);

  return {
    downloadURL,
    fileName: image.fileName,
    id: image.id,
    mimeType: image.mimeType,
    role,
    size: image.size,
    storagePath,
  };
}

function createFirestoreRecipeDocument(
  recipe: Recipe,
  uploadedImages: UploadedRecipeImage[],
  uploadedAt: string,
  userId: string,
) {
  return {
    id: recipe.id,
    userId,
    title: recipe.title,
    keywords: recipe.keywords,
    previewImageId: recipe.previewImageId ?? null,
    previewImagePosition: recipe.previewImagePosition ?? null,
    imageIds: recipe.imageIds,
    archivedAt: recipe.archivedAt ?? null,
    deletedAt: recipe.deletedAt ?? null,
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt,
    lastUsedAt: recipe.lastUsedAt,
    lastSyncedAt: recipe.lastSyncedAt ?? null,
    localUpdatedAt: recipe.localUpdatedAt,
    syncError: recipe.syncError ?? null,
    syncStatus: recipe.syncStatus,
    uploadedAt,
    imageUploads: uploadedImages,
    previewImageUpload:
      uploadedImages.find((image) => image.id === recipe.previewImageId) ?? null,
  };
}

export async function uploadSingleRecipeToFirebase(recipeId: string): Promise<UploadRecipeResult> {
  if (!firestore || !firebaseStorage || !firebaseAuth) {
    throw new Error('Firebase is not configured. Add your Vite Firebase env vars first.');
  }

  const currentUser = firebaseAuth.currentUser;

  if (!currentUser) {
    throw new Error('Sign in with Google before uploading this recipe.');
  }

  const recipe = await getRecipe(recipeId);

  if (!recipe) {
    throw new Error('Recipe could not be found locally.');
  }

  const imageEntries = await getReferencedLocalImages(recipe);
  const localImageIds = imageEntries.map(([imageId]) => imageId);

  try {
    const uploadedAt = new Date().toISOString();
    const uploadedImages = await Promise.all(
      imageEntries.map(([, image]) => uploadRecipeImage(currentUser.uid, recipe, image)),
    );
    const recipeDocument = sanitizeFirestorePayload(
      createFirestoreRecipeDocument(recipe, uploadedImages, uploadedAt, currentUser.uid),
    );

    assertNoUndefinedFirestoreValues(recipeDocument);

    await setDoc(doc(firestore, 'users', currentUser.uid, 'recipes', recipe.id), recipeDocument);

    logger.debug('Firebase recipe upload complete; updating local sync metadata', {
      recipeId: recipe.id,
      uploadedAt,
      imageIds: localImageIds,
    });

    await Promise.all([
      markRecipeSynced(recipe.id, uploadedAt),
      markRecipeImagesSynced(localImageIds, uploadedAt),
    ]);

    logger.debug('Local sync metadata successfully updated after upload', {
      recipeId: recipe.id,
      uploadedAt,
      imageIds: localImageIds,
    });

    return {
      imageCount: uploadedImages.length,
      recipeId: recipe.id,
      uploadedAt,
    };
  } catch (error) {
    const errorMessage = getReadableError(error);

    logger.error('Recipe upload failed', error, {
      recipeId: recipe.id,
      imageIds: localImageIds,
      errorMessage,
    });

    await Promise.all([
      markRecipeSyncError(recipe.id, errorMessage),
      markRecipeImagesSyncError(localImageIds, errorMessage),
    ]);

    throw new Error(errorMessage, { cause: error });
  }
}
