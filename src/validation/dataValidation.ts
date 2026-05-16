import type { Recipe, RecipeImage, RecipeImageThumbnail } from '../types/recipe';
import { isSyncStatus, normalizeSyncMetadata } from '../services/sync';

export type ValidationResult<T> =
  | { data: T; ok: true }
  | { errors: string[]; ok: false };

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function normalizeStringList(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeKeywordList(values: string[]) {
  return normalizeStringList(values).map((value) => value.toLocaleLowerCase());
}

function validateDateString(value: unknown, fieldName: string, errors: string[]) {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    errors.push(`${fieldName} must be a valid date string.`);
  }
}

function validateOptionalDateString(value: unknown, fieldName: string, errors: string[]) {
  if (value !== undefined) {
    validateDateString(value, fieldName, errors);
  }
}

function validatePercent(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}

export function validateRecipe(value: unknown): ValidationResult<Recipe> {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { errors: ['Recipe must be an object.'], ok: false };
  }

  if (typeof value.id !== 'string' || !value.id.trim()) {
    errors.push('Recipe id is required.');
  }

  if (typeof value.title !== 'string' || !value.title.trim()) {
    errors.push('Recipe title is required.');
  }

  if (!isStringArray(value.keywords)) {
    errors.push('Recipe keywords must be an array of strings.');
  }

  if (!isStringArray(value.imageIds)) {
    errors.push('Recipe imageIds must be an array of strings.');
  } else if (new Set(value.imageIds).size !== value.imageIds.length) {
    errors.push('Recipe imageIds must be unique.');
  }

  if (
    value.previewImageId !== undefined &&
    (typeof value.previewImageId !== 'string' || !value.previewImageId.trim())
  ) {
    errors.push('Recipe previewImageId must be a non-empty string when present.');
  }

  if (value.previewImagePosition !== undefined) {
    if (
      !isRecord(value.previewImagePosition) ||
      !validatePercent(value.previewImagePosition.x) ||
      !validatePercent(value.previewImagePosition.y)
    ) {
      errors.push('Recipe previewImagePosition must contain x and y values between 0 and 100.');
    }
  }

  if (value.archivedAt !== undefined) {
    validateDateString(value.archivedAt, 'archivedAt', errors);
  }

  if (value.syncStatus !== undefined && !isSyncStatus(value.syncStatus)) {
    errors.push('Recipe syncStatus is not supported.');
  }

  validateOptionalDateString(value.deletedAt, 'deletedAt', errors);
  validateOptionalDateString(value.lastSyncedAt, 'lastSyncedAt', errors);
  validateOptionalDateString(value.localUpdatedAt, 'localUpdatedAt', errors);
  validateDateString(value.createdAt, 'createdAt', errors);
  validateDateString(value.updatedAt, 'updatedAt', errors);
  validateDateString(value.lastUsedAt, 'lastUsedAt', errors);

  if (errors.length > 0) {
    return { errors, ok: false };
  }

  return {
    data: {
      id: String(value.id).trim(),
      title: String(value.title).trim(),
      keywords: normalizeKeywordList(value.keywords as string[]),
      previewImageId:
        typeof value.previewImageId === 'string' ? value.previewImageId.trim() : undefined,
      previewImagePosition: isRecord(value.previewImagePosition)
        ? {
            x: Number(value.previewImagePosition.x),
            y: Number(value.previewImagePosition.y),
          }
        : undefined,
      imageIds: normalizeStringList(value.imageIds as string[]),
      archivedAt: typeof value.archivedAt === 'string' ? String(value.archivedAt) : undefined,
      createdAt: String(value.createdAt),
      updatedAt: String(value.updatedAt),
      lastUsedAt: String(value.lastUsedAt),
      ...normalizeSyncMetadata(
        {
          deletedAt: typeof value.deletedAt === 'string' ? value.deletedAt : undefined,
          lastSyncedAt: typeof value.lastSyncedAt === 'string' ? value.lastSyncedAt : undefined,
          localUpdatedAt:
            typeof value.localUpdatedAt === 'string' ? value.localUpdatedAt : undefined,
          syncStatus: isSyncStatus(value.syncStatus) ? value.syncStatus : undefined,
        },
        String(value.updatedAt),
      ),
    },
    ok: true,
  };
}

export function validateRecipeImage(value: unknown): ValidationResult<RecipeImage> {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { errors: ['Recipe image must be an object.'], ok: false };
  }

  if (typeof value.id !== 'string' || !value.id.trim()) {
    errors.push('Image id is required.');
  }

  if (typeof value.recipeId !== 'string' || !value.recipeId.trim()) {
    errors.push('Image recipeId is required.');
  }

  if (!(value.blob instanceof Blob)) {
    errors.push('Image blob is required.');
  }

  if (typeof value.fileName !== 'string' || !value.fileName.trim()) {
    errors.push('Image fileName is required.');
  }

  if (typeof value.mimeType !== 'string' || !value.mimeType.trim()) {
    errors.push('Image mimeType is required.');
  }

  if (typeof value.size !== 'number' || value.size < 0) {
    errors.push('Image size must be a positive number.');
  }

  if (value.syncStatus !== undefined && !isSyncStatus(value.syncStatus)) {
    errors.push('Image syncStatus is not supported.');
  }

  validateOptionalDateString(value.deletedAt, 'image deletedAt', errors);
  validateOptionalDateString(value.lastSyncedAt, 'image lastSyncedAt', errors);
  validateOptionalDateString(value.localUpdatedAt, 'image localUpdatedAt', errors);
  validateDateString(value.createdAt, 'image createdAt', errors);

  if (errors.length > 0) {
    return { errors, ok: false };
  }

  return {
    data: {
      id: String(value.id).trim(),
      recipeId: String(value.recipeId).trim(),
      blob: value.blob as Blob,
      fileName: String(value.fileName).trim(),
      mimeType: String(value.mimeType).trim(),
      size: Number(value.size),
      createdAt: String(value.createdAt),
      ...normalizeSyncMetadata(
        {
          deletedAt: typeof value.deletedAt === 'string' ? value.deletedAt : undefined,
          lastSyncedAt: typeof value.lastSyncedAt === 'string' ? value.lastSyncedAt : undefined,
          localUpdatedAt:
            typeof value.localUpdatedAt === 'string' ? value.localUpdatedAt : undefined,
          syncStatus: isSyncStatus(value.syncStatus) ? value.syncStatus : undefined,
        },
        String(value.createdAt),
      ),
    },
    ok: true,
  };
}

export function validateRecipeImageThumbnail(value: unknown): ValidationResult<RecipeImageThumbnail> {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { errors: ['Recipe image thumbnail must be an object.'], ok: false };
  }

  if (typeof value.id !== 'string' || !value.id.trim()) {
    errors.push('Thumbnail id is required.');
  }

  if (typeof value.recipeId !== 'string' || !value.recipeId.trim()) {
    errors.push('Thumbnail recipeId is required.');
  }

  if (!(value.blob instanceof Blob)) {
    errors.push('Thumbnail blob is required.');
  }

  if (typeof value.mimeType !== 'string' || !value.mimeType.trim()) {
    errors.push('Thumbnail mimeType is required.');
  }

  if (typeof value.size !== 'number' || value.size < 0) {
    errors.push('Thumbnail size must be a positive number.');
  }

  validateDateString(value.createdAt, 'thumbnail createdAt', errors);

  if (errors.length > 0) {
    return { errors, ok: false };
  }

  return {
    data: {
      id: String(value.id).trim(),
      recipeId: String(value.recipeId).trim(),
      blob: value.blob as Blob,
      createdAt: String(value.createdAt),
      mimeType: String(value.mimeType).trim(),
      size: Number(value.size),
    },
    ok: true,
  };
}

export function assertUniqueIds(ids: string[], label: string) {
  if (new Set(ids).size !== ids.length) {
    throw new Error(`Duplicate ${label} are not allowed.`);
  }
}
