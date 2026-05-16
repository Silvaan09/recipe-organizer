import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { addRecipe, addRecipeImages, deleteRecipeImages, getRecipeImage, updateRecipe } from '../db';
import { processRecipeImage, type ImageCropArea } from '../services/image';
import type { Recipe, RecipeImagePosition } from '../types/recipe';
import { logger } from '../utils/logger';
import { getFallbackRecipeImageId, getLocalRecipeImage } from '../utils/recipeImages';

export type ImageDraft = {
  alt: string;
  error?: string;
  file?: File;
  imageId?: string;
  isObjectUrl: boolean;
  optimizedSize?: number;
  originalSize?: number;
  previewUrl: string;
  previewImagePosition?: RecipeImagePosition;
  sourceFile?: File;
  status: 'ready' | 'processing' | 'error';
  thumbnailFile?: File;
  thumbnailSize?: number;
  tempId: string;
};

type RecipeFormErrors = {
  images?: string;
  previewImage?: string;
  title?: string;
};

type UseRecipeFormOptions = {
  initialRecipe?: Recipe;
  onSaved: (recipe: Recipe) => void;
};

function createTempId() {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeKeywordText(keywordText: string) {
  return [
    ...new Set(
      keywordText
        .split(',')
        .map((keyword) => keyword.trim().toLocaleLowerCase())
        .filter(Boolean),
    ),
  ];
}

function clampPercent(value: number) {
  return Math.min(Math.max(Math.round(value), 0), 100);
}

function revokeDraftUrl(draft: ImageDraft) {
  if (draft.isObjectUrl) {
    URL.revokeObjectURL(draft.previewUrl);
  }
}

function loadImageElement(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const imageElement = new Image();
    const objectUrl = URL.createObjectURL(file);

    imageElement.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(imageElement);
    };
    imageElement.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image could not be loaded.'));
    };
    imageElement.src = objectUrl;
  });
}

async function createPreviewImagePosition(
  file: Blob,
  cropArea: ImageCropArea,
): Promise<RecipeImagePosition> {
  const imageElement = await loadImageElement(file);

  return {
    x: clampPercent(((cropArea.x + cropArea.width / 2) / imageElement.naturalWidth) * 100),
    y: clampPercent(((cropArea.y + cropArea.height / 2) / imageElement.naturalHeight) * 100),
  };
}

async function loadImageDraft(
  imageId: string,
  previewImagePosition?: RecipeImagePosition,
): Promise<ImageDraft | undefined> {
  const localImage = getLocalRecipeImage(imageId);

  if (localImage) {
    return {
      alt: localImage.alt,
      imageId,
      isObjectUrl: false,
      previewImagePosition,
      previewUrl: localImage.src,
      status: 'ready',
      tempId: createTempId(),
    };
  }

  try {
    const storedImage = await getRecipeImage(imageId);

    if (!storedImage) {
      return undefined;
    }

    const sourceFile = new File([storedImage.blob], storedImage.fileName, {
      type: storedImage.mimeType || storedImage.blob.type || 'image/jpeg',
      lastModified: new Date(storedImage.createdAt).getTime(),
    });

    return {
      alt: storedImage.fileName,
      imageId,
      isObjectUrl: true,
      optimizedSize: storedImage.size,
      originalSize: storedImage.size,
      previewImagePosition,
      previewUrl: URL.createObjectURL(storedImage.blob),
      sourceFile,
      status: 'ready',
      tempId: createTempId(),
    };
  } catch (error) {
    logger.warn('Could not load image while preparing recipe form.', { error, imageId });
    return undefined;
  }
}

function toPersistedImageFiles(drafts: ImageDraft[]) {
  return drafts
    .filter((draft) => draft.file)
    .map((draft) => ({
      file: draft.file!,
      tempId: draft.tempId,
      thumbnailFile: draft.thumbnailFile,
    }));
}

function mapDraftsToImageIds(drafts: ImageDraft[], newImageIdsByTempId: Map<string, string>) {
  return drafts
    .map((draft) => draft.imageId ?? newImageIdsByTempId.get(draft.tempId))
    .filter((imageId): imageId is string => Boolean(imageId));
}

export function useRecipeForm({ initialRecipe, onSaved }: UseRecipeFormOptions) {
  const [title, setTitle] = useState(initialRecipe?.title ?? '');
  const [keywordText, setKeywordText] = useState(initialRecipe?.keywords.join(', ') ?? '');
  const [previewImageDrafts, setPreviewImageDrafts] = useState<ImageDraft[]>([]);
  const [imageDrafts, setImageDrafts] = useState<ImageDraft[]>([]);
  const [errors, setErrors] = useState<RecipeFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const previewImageDraftsRef = useRef<ImageDraft[]>([]);
  const imageDraftsRef = useRef<ImageDraft[]>([]);

  useEffect(() => {
    previewImageDraftsRef.current = previewImageDrafts;
  }, [previewImageDrafts]);

  useEffect(() => {
    imageDraftsRef.current = imageDrafts;
  }, [imageDrafts]);

  useEffect(() => {
    return () => {
      previewImageDraftsRef.current.forEach(revokeDraftUrl);
      imageDraftsRef.current.forEach(revokeDraftUrl);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const objectUrlDrafts: ImageDraft[] = [];

    async function loadInitialImages() {
      const [previewDraft, galleryDrafts] = await Promise.all([
        initialRecipe?.previewImageId
          ? loadImageDraft(initialRecipe.previewImageId, initialRecipe.previewImagePosition)
          : undefined,
        Promise.all((initialRecipe?.imageIds ?? []).map((imageId) => loadImageDraft(imageId))),
      ]);
      const nextPreviewDrafts = previewDraft ? [previewDraft] : [];
      const nextImageDrafts = galleryDrafts.filter((draft): draft is ImageDraft => Boolean(draft));

      objectUrlDrafts.push(
        ...nextPreviewDrafts.filter((draft) => draft.isObjectUrl),
        ...nextImageDrafts.filter((draft) => draft.isObjectUrl),
      );

      if (isMounted) {
        setPreviewImageDrafts(nextPreviewDrafts);
        setImageDrafts(nextImageDrafts);
      } else {
        objectUrlDrafts.forEach(revokeDraftUrl);
      }
    }

    void loadInitialImages();

    return () => {
      isMounted = false;
      objectUrlDrafts.forEach(revokeDraftUrl);
    };
  }, [initialRecipe]);

  const normalizedKeywords = useMemo(() => normalizeKeywordText(keywordText), [keywordText]);
  const isProcessingImages = [...previewImageDrafts, ...imageDrafts].some(
    (draft) => draft.status === 'processing',
  );

  const replaceDraftWithProcessedImage = useCallback(
    async (
      target: 'preview' | 'recipe',
      tempId: string,
      sourceFile: File,
      cropArea?: ImageCropArea,
    ) => {
      const setDrafts = target === 'preview' ? setPreviewImageDrafts : setImageDrafts;

      setDrafts((currentDrafts) =>
        currentDrafts.map((draft) =>
          draft.tempId === tempId
            ? { ...draft, error: undefined, status: 'processing' as const }
            : draft,
        ),
      );

      try {
        const processedImage = await processRecipeImage(sourceFile, cropArea);

        setDrafts((currentDrafts) => {
          const existingDraft = currentDrafts.find((draft) => draft.tempId === tempId);

          if (!existingDraft) {
            URL.revokeObjectURL(processedImage.previewUrl);
            return currentDrafts;
          }

          if (existingDraft.isObjectUrl) {
            URL.revokeObjectURL(existingDraft.previewUrl);
          }

          return currentDrafts.map((draft) =>
            draft.tempId === tempId
              ? {
                  ...draft,
                  alt: processedImage.file.name,
                  error: undefined,
                  file: processedImage.file,
                  imageId: undefined,
                  isObjectUrl: true,
                  optimizedSize: processedImage.size,
                  originalSize: processedImage.originalSize,
                  previewUrl: processedImage.previewUrl,
                  status: 'ready' as const,
                  thumbnailFile: processedImage.thumbnailFile,
                  thumbnailSize: processedImage.thumbnailSize,
                }
              : draft,
          );
        });
      } catch (processingError) {
        logger.warn('Image processing failed.', { error: processingError, tempId });
        setDrafts((currentDrafts) =>
          currentDrafts.map((draft) =>
            draft.tempId === tempId
              ? {
                  ...draft,
                  error:
                    processingError instanceof Error
                      ? processingError.message
                      : 'Image could not be optimized.',
                  status: 'error' as const,
                }
              : draft,
          ),
        );
      }
    },
    [],
  );

  const addImageFiles = useCallback(
    (target: 'preview' | 'recipe', files: FileList | File[]) => {
      const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
      const nextDrafts = imageFiles.map((file) => {
        const tempId = createTempId();

        return {
          alt: file.name,
          isObjectUrl: true,
          originalSize: file.size,
          previewUrl: URL.createObjectURL(file),
          sourceFile: file,
          status: 'processing',
          tempId,
        } satisfies ImageDraft;
      });

      const draftsToUse = target === 'preview' ? nextDrafts.slice(0, 1) : nextDrafts;
      const draftsToDiscard = target === 'preview' ? nextDrafts.slice(1) : [];

      draftsToDiscard.forEach(revokeDraftUrl);

      if (target === 'preview') {
        setPreviewImageDrafts((currentDrafts) => {
          currentDrafts.forEach(revokeDraftUrl);
          return draftsToUse;
        });
      } else {
        setImageDrafts((currentDrafts) => [...currentDrafts, ...draftsToUse]);
      }

      draftsToUse.forEach((draft) => {
        if (draft.sourceFile) {
          void replaceDraftWithProcessedImage(target, draft.tempId, draft.sourceFile);
        }
      });
    },
    [replaceDraftWithProcessedImage],
  );

  const cropImage = useCallback(
    async (target: 'preview' | 'recipe', tempId: string, cropArea: ImageCropArea) => {
      const drafts = target === 'preview' ? previewImageDraftsRef.current : imageDraftsRef.current;
      const draft = drafts.find((currentDraft) => currentDraft.tempId === tempId);

      const editableFile = draft?.file ?? draft?.sourceFile;

      if (!editableFile) {
        return;
      }

      if (target === 'preview') {
        const previewImagePosition = await createPreviewImagePosition(editableFile, cropArea);

        setPreviewImageDrafts((currentDrafts) =>
          currentDrafts.map((currentDraft) =>
            currentDraft.tempId === tempId
              ? {
                  ...currentDraft,
                  previewImagePosition,
                }
              : currentDraft,
          ),
        );
        return;
      }

      await replaceDraftWithProcessedImage(target, tempId, editableFile, cropArea);
    },
    [replaceDraftWithProcessedImage],
  );

  const removeImage = useCallback((target: 'preview' | 'recipe', tempId: string) => {
    const setDrafts = target === 'preview' ? setPreviewImageDrafts : setImageDrafts;

    setDrafts((currentDrafts) => {
      const removedDraft = currentDrafts.find((draft) => draft.tempId === tempId);

      if (removedDraft) {
        revokeDraftUrl(removedDraft);
      }

      return currentDrafts.filter((draft) => draft.tempId !== tempId);
    });
  }, []);

  const moveImage = useCallback((target: 'preview' | 'recipe', tempId: string, direction: 'left' | 'right') => {
    const setDrafts = target === 'preview' ? setPreviewImageDrafts : setImageDrafts;

    setDrafts((currentDrafts) => {
      const currentIndex = currentDrafts.findIndex((draft) => draft.tempId === tempId);
      const nextIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= currentDrafts.length) {
        return currentDrafts;
      }

      const nextDrafts = [...currentDrafts];
      const [draft] = nextDrafts.splice(currentIndex, 1);
      nextDrafts.splice(nextIndex, 0, draft);

      return nextDrafts;
    });
  }, []);

  const saveRecipe = useCallback(async () => {
    const normalizedTitle = title.trim();

    if (!normalizedTitle) {
      setErrors({ title: 'Title is required.' });
      return;
    }

    if (isProcessingImages) {
      setErrors({ images: 'Please wait for image optimization to finish.' });
      return;
    }

    setIsSaving(true);
    setErrors({});

    try {
      const previewFiles = toPersistedImageFiles(previewImageDrafts);
      const recipeImageFiles = toPersistedImageFiles(imageDrafts);

      if (initialRecipe) {
        const [newPreviewImageIds, newRecipeImageIds] = await Promise.all([
          addRecipeImages(initialRecipe.id, previewFiles),
          addRecipeImages(initialRecipe.id, recipeImageFiles),
        ]);
        const newPreviewImageIdByTempId = new Map(
          previewFiles.map((draft, index) => [draft.tempId, newPreviewImageIds[index]]),
        );
        const newRecipeImageIdByTempId = new Map(
          recipeImageFiles.map((draft, index) => [draft.tempId, newRecipeImageIds[index]]),
        );
        const previewImageId =
          mapDraftsToImageIds(previewImageDrafts, newPreviewImageIdByTempId)[0] ??
          getFallbackRecipeImageId(`${initialRecipe.id}-${normalizedTitle}`);
        const previewImagePosition = previewImageDrafts[0]?.previewImagePosition;
        const imageIds = mapDraftsToImageIds(imageDrafts, newRecipeImageIdByTempId);
        const savedRecipe = await updateRecipe(initialRecipe.id, {
          title: normalizedTitle,
          keywords: normalizedKeywords,
          previewImageId,
          previewImagePosition,
          imageIds,
        });
        const previousImageIds = [
          ...initialRecipe.imageIds,
          initialRecipe.previewImageId,
        ].filter((imageId): imageId is string => Boolean(imageId));
        const currentImageIds = [previewImageId, ...imageIds].filter(
          (imageId): imageId is string => Boolean(imageId),
        );
        const removedImageIds = previousImageIds.filter((imageId) => !currentImageIds.includes(imageId));

        await deleteRecipeImages(removedImageIds);
        onSaved(savedRecipe);
        return;
      }

      const savedRecipeWithoutImages = await addRecipe({
        title: normalizedTitle,
        keywords: normalizedKeywords,
        imageIds: [],
      });
      const [newPreviewImageIds, newRecipeImageIds] = await Promise.all([
        addRecipeImages(savedRecipeWithoutImages.id, previewFiles),
        addRecipeImages(savedRecipeWithoutImages.id, recipeImageFiles),
      ]);
      const newPreviewImageIdByTempId = new Map(
        previewFiles.map((draft, index) => [draft.tempId, newPreviewImageIds[index]]),
      );
      const newRecipeImageIdByTempId = new Map(
        recipeImageFiles.map((draft, index) => [draft.tempId, newRecipeImageIds[index]]),
      );
      const previewImageId =
        mapDraftsToImageIds(previewImageDrafts, newPreviewImageIdByTempId)[0] ??
        getFallbackRecipeImageId(`${savedRecipeWithoutImages.id}-${normalizedTitle}`);
      const previewImagePosition = previewImageDrafts[0]?.previewImagePosition;
      const imageIds = mapDraftsToImageIds(imageDrafts, newRecipeImageIdByTempId);
      const savedRecipe =
        previewImageId || imageIds.length > 0
          ? await updateRecipe(savedRecipeWithoutImages.id, {
              title: normalizedTitle,
              keywords: normalizedKeywords,
              previewImageId,
              previewImagePosition,
              imageIds,
            })
          : savedRecipeWithoutImages;

      onSaved(savedRecipe);
    } finally {
      setIsSaving(false);
    }
  }, [
    imageDrafts,
    initialRecipe,
    isProcessingImages,
    normalizedKeywords,
    onSaved,
    previewImageDrafts,
    title,
  ]);

  return {
    addImageFiles,
    cropImage,
    errors,
    imageDrafts,
    isProcessingImages,
    isSaving,
    keywordText,
    moveImage,
    normalizedKeywords,
    previewImageDrafts,
    removeImage,
    saveRecipe,
    setKeywordText,
    setTitle,
    title,
  };
}
