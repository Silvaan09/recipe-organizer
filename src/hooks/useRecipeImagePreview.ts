import { useEffect, useState } from 'react';

import { getOrCreateRecipeImageThumbnail } from '../db';
import { createBlobUrl, revokeBlobUrl } from '../utils/blobUrls';
import { logger } from '../utils/logger';
import { getLocalRecipeImage } from '../utils/recipeImages';

type RecipeImagePreview = {
  alt: string;
  isLoading: boolean;
  src?: string;
};

type StoredPreview = {
  alt: string;
  imageId: string;
  src: string;
};

export function useRecipeImagePreview(
  imageId: string | undefined,
  shouldLoad = true,
): RecipeImagePreview {
  const localImage = getLocalRecipeImage(imageId);
  const [storedPreview, setStoredPreview] = useState<StoredPreview>();
  const [failedImageId, setFailedImageId] = useState<string>();

  useEffect(() => {
    let objectUrl: string | undefined;
    let isMounted = true;

    async function loadImageBlob() {
      if (!shouldLoad || !imageId || getLocalRecipeImage(imageId)) {
        return;
      }

      let storedImage;

      try {
        storedImage = await getOrCreateRecipeImageThumbnail(imageId);
      } catch (error) {
        logger.warn('Thumbnail preview failed to load.', { error, imageId });
        if (isMounted) {
          setFailedImageId(imageId);
        }
        return;
      }

      if (!storedImage || !isMounted) {
        if (isMounted) {
          setFailedImageId(imageId);
        }
        return;
      }

      objectUrl = createBlobUrl(storedImage.blob);
      setStoredPreview({
        alt: 'Recipe image thumbnail',
        imageId,
        src: objectUrl,
      });
      setFailedImageId(undefined);
    }

    void loadImageBlob();

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

  if (shouldLoad && storedPreview?.imageId === imageId) {
    return { alt: storedPreview.alt, isLoading: false, src: storedPreview.src };
  }

  if (failedImageId === imageId) {
    return { alt: '', isLoading: false, src: undefined };
  }

  return { alt: '', isLoading: shouldLoad, src: undefined };
}
