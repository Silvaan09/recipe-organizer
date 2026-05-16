import { useEffect, useState } from 'react';

import { getRecipeImage } from '../db';
import { createBlobUrl, revokeBlobUrl } from '../utils/blobUrls';
import { logger } from '../utils/logger';
import { getLocalRecipeImage } from '../utils/recipeImages';

type RecipeFullImage = {
  alt: string;
  isLoading: boolean;
  src?: string;
};

type StoredFullImage = {
  alt: string;
  imageId: string;
  src: string;
};

export function useRecipeFullImage(
  imageId: string | undefined,
  shouldLoad = true,
): RecipeFullImage {
  const localImage = getLocalRecipeImage(imageId);
  const [storedImage, setStoredImage] = useState<StoredFullImage>();
  const [failedImageId, setFailedImageId] = useState<string>();

  useEffect(() => {
    let objectUrl: string | undefined;
    let isMounted = true;

    async function loadFullImage() {
      if (!shouldLoad || !imageId || getLocalRecipeImage(imageId)) {
        return;
      }

      let recipeImage;

      try {
        recipeImage = await getRecipeImage(imageId);
      } catch (error) {
        logger.warn('Full recipe image failed to load.', { error, imageId });
        if (isMounted) {
          setFailedImageId(imageId);
        }
        return;
      }

      if (!recipeImage || !isMounted) {
        if (isMounted) {
          setFailedImageId(imageId);
        }
        return;
      }

      objectUrl = createBlobUrl(recipeImage.blob);
      setStoredImage({
        alt: recipeImage.fileName,
        imageId,
        src: objectUrl,
      });
      setFailedImageId(undefined);
    }

    void loadFullImage();

    return () => {
      isMounted = false;
      revokeBlobUrl(objectUrl);
    };
  }, [imageId, shouldLoad]);

  if (!imageId) {
    return { alt: '', isLoading: false, src: undefined };
  }

  if (localImage) {
    return { alt: localImage.alt, isLoading: false, src: localImage.src };
  }

  if (shouldLoad && storedImage?.imageId === imageId) {
    return { alt: storedImage.alt, isLoading: false, src: storedImage.src };
  }

  if (failedImageId === imageId) {
    return { alt: '', isLoading: false, src: undefined };
  }

  return { alt: '', isLoading: shouldLoad, src: undefined };
}
