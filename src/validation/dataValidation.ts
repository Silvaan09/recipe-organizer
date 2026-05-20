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
    errors.push(`${fieldName} muss ein gültiges Datum sein.`);
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
    return { errors: ['Rezept muss ein Objekt sein.'], ok: false };
  }

  if (typeof value.id !== 'string' || !value.id.trim()) {
    errors.push('Rezept-ID ist erforderlich.');
  }

  if (typeof value.title !== 'string' || !value.title.trim()) {
    errors.push('Rezepttitel ist erforderlich.');
  }

  if (!isStringArray(value.keywords)) {
    errors.push('Rezept-Stichwörter müssen eine Textliste sein.');
  }

  if (!isStringArray(value.imageIds)) {
    errors.push('Rezept-Bild-IDs müssen eine Textliste sein.');
  } else if (new Set(value.imageIds).size !== value.imageIds.length) {
    errors.push('Rezept-Bild-IDs müssen eindeutig sein.');
  }

  if (
    value.previewImageId !== undefined &&
    (typeof value.previewImageId !== 'string' || !value.previewImageId.trim())
  ) {
    errors.push('Rezept-Vorschaubild-ID muss ein nicht leerer Text sein.');
  }

  if (value.previewImagePosition !== undefined) {
    if (
      !isRecord(value.previewImagePosition) ||
      !validatePercent(value.previewImagePosition.x) ||
      !validatePercent(value.previewImagePosition.y)
    ) {
      errors.push('Rezept-Vorschaubildposition muss x- und y-Werte zwischen 0 und 100 enthalten.');
    }
  }

  if (value.archivedAt !== undefined) {
    validateDateString(value.archivedAt, 'archivedAt', errors);
  }

  if (value.syncStatus !== undefined && !isSyncStatus(value.syncStatus)) {
    errors.push('Rezept-Sync-Status wird nicht unterstützt.');
  }

  if (value.syncError !== undefined && typeof value.syncError !== 'string') {
    errors.push('Rezept-Sync-Fehler muss Text sein.');
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
          syncError: typeof value.syncError === 'string' ? value.syncError : undefined,
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
    return { errors: ['Rezeptbild muss ein Objekt sein.'], ok: false };
  }

  if (typeof value.id !== 'string' || !value.id.trim()) {
    errors.push('Bild-ID ist erforderlich.');
  }

  if (typeof value.recipeId !== 'string' || !value.recipeId.trim()) {
    errors.push('Bild-Rezept-ID ist erforderlich.');
  }

  if (!(value.blob instanceof Blob)) {
    errors.push('Bilddatei ist erforderlich.');
  }

  if (typeof value.fileName !== 'string' || !value.fileName.trim()) {
    errors.push('Bilddateiname ist erforderlich.');
  }

  if (typeof value.mimeType !== 'string' || !value.mimeType.trim()) {
    errors.push('Bild-MIME-Typ ist erforderlich.');
  }

  if (typeof value.size !== 'number' || value.size < 0) {
    errors.push('Bildgröße muss eine positive Zahl sein.');
  }

  if (value.syncStatus !== undefined && !isSyncStatus(value.syncStatus)) {
    errors.push('Bild-Sync-Status wird nicht unterstützt.');
  }

  if (value.syncError !== undefined && typeof value.syncError !== 'string') {
    errors.push('Bild-Sync-Fehler muss Text sein.');
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
          syncError: typeof value.syncError === 'string' ? value.syncError : undefined,
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
    return { errors: ['Rezeptbild-Thumbnail muss ein Objekt sein.'], ok: false };
  }

  if (typeof value.id !== 'string' || !value.id.trim()) {
    errors.push('Thumbnail-ID ist erforderlich.');
  }

  if (typeof value.recipeId !== 'string' || !value.recipeId.trim()) {
    errors.push('Thumbnail-Rezept-ID ist erforderlich.');
  }

  if (!(value.blob instanceof Blob)) {
    errors.push('Thumbnail-Datei ist erforderlich.');
  }

  if (typeof value.mimeType !== 'string' || !value.mimeType.trim()) {
    errors.push('Thumbnail-MIME-Typ ist erforderlich.');
  }

  if (typeof value.size !== 'number' || value.size < 0) {
    errors.push('Thumbnail-Größe muss eine positive Zahl sein.');
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
    throw new Error(`Doppelte ${label} sind nicht erlaubt.`);
  }
}
