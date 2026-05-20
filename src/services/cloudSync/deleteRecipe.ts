import { deleteDoc, doc, getDoc } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';

import { firebaseAuth, firebaseStorage, firestore } from '../../firebase';
import { logger } from '../../utils/logger';
import { isRecord } from '../../validation/dataValidation';

export type DeleteCloudRecipeResult = {
  deletedImages: number;
  recipeDocumentExisted: boolean;
  recipeId: string;
};

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function getStoragePath(value: unknown) {
  if (!isRecord(value)) {
    return undefined;
  }

  return asString(value.storagePath);
}

function getCloudRecipeStoragePaths(value: unknown) {
  if (!isRecord(value)) {
    return [];
  }

  const imageUploadPaths = Array.isArray(value.imageUploads)
    ? value.imageUploads.flatMap((imageUpload) => {
        const storagePath = getStoragePath(imageUpload);

        return storagePath ? [storagePath] : [];
      })
    : [];
  const previewImagePath = getStoragePath(value.previewImageUpload);

  return [...new Set([...imageUploadPaths, previewImagePath].filter(Boolean) as string[])];
}

function isStorageObjectNotFound(error: unknown) {
  return error instanceof Error && error.message.includes('storage/object-not-found');
}

export async function deleteRecipeFromFirebase(
  recipeId: string,
): Promise<DeleteCloudRecipeResult> {
  if (!firestore || !firebaseStorage || !firebaseAuth) {
    throw new Error('Firebase ist nicht konfiguriert. Füge zuerst deine Vite-Firebase-Umgebungsvariablen hinzu.');
  }

  const currentUser = firebaseAuth.currentUser;

  if (!currentUser) {
    throw new Error('Melde dich mit Google an, bevor du dieses Rezept aus Firebase löschst.');
  }

  const recipeReference = doc(firestore, 'users', currentUser.uid, 'recipes', recipeId);
  const recipeSnapshot = await getDoc(recipeReference);

  if (!recipeSnapshot.exists()) {
    return {
      deletedImages: 0,
      recipeDocumentExisted: false,
      recipeId,
    };
  }

  const storagePaths = getCloudRecipeStoragePaths(recipeSnapshot.data());
  let deletedImages = 0;

  for (const storagePath of storagePaths) {
    try {
      await deleteObject(ref(firebaseStorage, storagePath));
      deletedImages += 1;
    } catch (error) {
      if (!isStorageObjectNotFound(error)) {
        throw error;
      }

      logger.warn('Cloud recipe image was already missing during delete.', {
        recipeId,
        storagePath,
      });
    }
  }

  await deleteDoc(recipeReference);

  return {
    deletedImages,
    recipeDocumentExisted: true,
    recipeId,
  };
}
