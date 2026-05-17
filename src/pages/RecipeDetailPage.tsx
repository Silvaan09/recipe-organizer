import { ArrowLeft, Pencil, RotateCcw, Trash2, UploadCloud } from 'lucide-react';
import { useEffect, useState } from 'react';

import { archiveRecipe, deleteRecipe, getRecipe, restoreRecipe, updateLastUsed } from '../db';
import { useAuth } from '../firebase';
import { uploadSingleRecipeToFirebase } from '../services/cloudSync';
import { RecipeImageGallery } from '../components/recipes/RecipeImageGallery';
import { RecipeImageLightbox } from '../components/recipes/RecipeImageLightbox';
import { RecipeImageShelf } from '../components/recipes/RecipeImageShelf';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import type { Recipe } from '../types/recipe';
import { logAndReturnMessage } from '../utils/errors';

type RecipeDetailPageProps = {
  isArchived?: boolean;
  onBack: () => void;
  onDeleted: () => void;
  onEdit: (recipeId: string) => void;
  onRestored?: () => void;
  recipeId: string;
};

export function RecipeDetailPage({
  isArchived = false,
  onBack,
  onDeleted,
  onEdit,
  onRestored,
  recipeId,
}: RecipeDetailPageProps) {
  const { currentUser, isFirebaseConfigured, isLoading: isAuthLoading } = useAuth();
  const [recipe, setRecipe] = useState<Recipe>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ imageIds: string[]; initialIndex: number }>();
  const [uploadStatus, setUploadStatus] = useState<{ tone: 'success' | 'error'; message: string }>();
  const [isUploadingRecipe, setIsUploadingRecipe] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadRecipe() {
      try {
        setIsLoading(true);
        const nextRecipe = await getRecipe(recipeId);

        if (!nextRecipe) {
          throw new Error('Recipe could not be found locally.');
        }

        let lastUsedAt = nextRecipe.lastUsedAt;

        if (!isArchived) {
          lastUsedAt = new Date().toISOString();
          await updateLastUsed(recipeId);
        }

        if (isMounted) {
          setRecipe({
            ...nextRecipe,
            lastUsedAt,
          });
          setError(null);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(logAndReturnMessage(loadError, 'Recipe could not be loaded.', { recipeId }));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadRecipe();

    return () => {
      isMounted = false;
    };
  }, [isArchived, recipeId]);

  async function handleDeleteRecipe() {
    if (!recipe) {
      return;
    }

    const shouldDelete = window.confirm(
      `Move "${recipe.title}" to the archive? You can restore it from Settings.`,
    );

    if (!shouldDelete) {
      return;
    }

    try {
      await archiveRecipe(recipe.id);
      onDeleted();
    } catch (deleteError) {
      setError(logAndReturnMessage(deleteError, 'Recipe could not be archived.', { recipeId: recipe.id }));
    }
  }

  async function handleRestoreRecipe() {
    if (!recipe) {
      return;
    }

    try {
      await restoreRecipe(recipe.id);
      onRestored?.();
    } catch (restoreError) {
      setError(logAndReturnMessage(restoreError, 'Recipe could not be restored.', { recipeId: recipe.id }));
    }
  }

  async function handlePermanentDeleteRecipe() {
    if (!recipe) {
      return;
    }

    const shouldDelete = window.confirm(
      `Permanently delete "${recipe.title}" and its saved images? This cannot be undone.`,
    );

    if (!shouldDelete) {
      return;
    }

    try {
      await deleteRecipe(recipe.id);
      onDeleted();
    } catch (deleteError) {
      setError(logAndReturnMessage(deleteError, 'Recipe could not be permanently deleted.', {
        recipeId: recipe.id,
      }));
    }
  }

  async function handleUploadRecipe() {
    if (!recipe) {
      return;
    }

    setIsUploadingRecipe(true);
    setUploadStatus(undefined);

    try {
      const result = await uploadSingleRecipeToFirebase(recipe.id);
      const syncedRecipe = await getRecipe(recipe.id);

      if (syncedRecipe) {
        setRecipe(syncedRecipe);
      }

      setUploadStatus({
        tone: 'success',
        message: `Uploaded recipe metadata and ${result.imageCount} local images.`,
      });
    } catch (uploadError) {
      const syncedRecipe = await getRecipe(recipe.id);

      if (syncedRecipe) {
        setRecipe(syncedRecipe);
      }

      setUploadStatus({
        tone: 'error',
        message: logAndReturnMessage(uploadError, 'Recipe upload failed.'),
      });
    } finally {
      setIsUploadingRecipe(false);
    }
  }

  if (isLoading) {
    return (
      <>
        <Skeleton className="h-11 w-24" />
        <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
        <Skeleton className="h-8 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      </>
    );
  }

  if (error || !recipe) {
    return (
      <>
        <button
          type="button"
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg bg-white px-3 text-sm font-bold text-petal-700 shadow-soft transition hover:bg-petal-50"
          onClick={onBack}
        >
          <ArrowLeft aria-hidden="true" size={18} />
          Back
        </button>
        <Card>
          <p className="text-sm font-semibold text-petal-700">{error}</p>
        </Card>
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg bg-white px-3 text-sm font-bold text-petal-700 shadow-soft transition hover:bg-petal-50"
        onClick={onBack}
      >
        <ArrowLeft aria-hidden="true" size={18} />
        Back
      </button>

      <section className="flex flex-col gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-petal-600">
            Display image
          </p>
          <h2 className="mt-1 text-lg font-bold text-cocoa-900">Recipe cover</h2>
        </div>
        <RecipeImageGallery
          imageIds={recipe.previewImageId ? [recipe.previewImageId] : []}
          imagePosition={recipe.previewImagePosition}
          onImageOpen={(initialIndex) => {
            if (recipe.previewImageId) {
              setLightbox({ imageIds: [recipe.previewImageId], initialIndex });
            }
          }}
          showLabel={false}
          title={recipe.title}
        />
      </section>

      <section className="rounded-lg bg-white p-5 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-wide text-petal-600">Recipe card</p>
        <h2 className="mt-2 font-serif text-4xl font-bold leading-tight text-cocoa-900">
          {recipe.title}
        </h2>

        <div className="mt-4 flex flex-wrap gap-2">
          {recipe.keywords.length > 0 ? (
            recipe.keywords.map((keyword) => (
              <span
                key={keyword}
                className="rounded-full bg-petal-100 px-3 py-1.5 text-xs font-bold text-petal-700"
              >
                {keyword}
              </span>
            ))
          ) : (
            <span className="rounded-full bg-petal-50 px-3 py-1.5 text-xs font-bold text-cocoa-700">
              no keywords
            </span>
          )}
        </div>
      </section>

      {!isArchived ? (
        <section className="rounded-lg border border-petal-100 bg-white p-4 shadow-soft">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-petal-100 text-petal-700">
              <UploadCloud aria-hidden="true" size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-cocoa-900">Firebase upload</h3>
              <p className="mt-1 text-sm leading-6 text-cocoa-700">
                Upload only this recipe and its local images. No bulk sync or downloads are run.
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-petal-50 px-3 py-2 text-sm font-bold text-petal-700">
            {isAuthLoading
              ? 'Checking account'
              : currentUser
                ? `Signed in as ${currentUser.email ?? currentUser.displayName ?? 'Google user'}`
                : isFirebaseConfigured
                  ? 'Sign in from Settings before uploading'
                  : 'Firebase is not configured'}
          </div>

          {recipe.syncStatus === 'synced' && recipe.lastSyncedAt ? (
            <p className="mt-3 text-xs font-bold text-herb-700">
              Last uploaded {new Date(recipe.lastSyncedAt).toLocaleString()}.
            </p>
          ) : null}

          {recipe.syncStatus === 'sync-error' && recipe.syncError ? (
            <p className="mt-3 rounded-lg bg-petal-50 px-3 py-2 text-xs font-bold text-petal-700">
              {recipe.syncError}
            </p>
          ) : null}

          {uploadStatus ? (
            <p
              className={
                uploadStatus.tone === 'success'
                  ? 'mt-3 rounded-lg bg-herb-50 px-3 py-2 text-xs font-bold text-herb-700'
                  : 'mt-3 rounded-lg bg-petal-50 px-3 py-2 text-xs font-bold text-petal-700'
              }
            >
              {uploadStatus.message}
            </p>
          ) : null}

          <button
            type="button"
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-petal-500 px-4 text-sm font-bold text-white shadow-lg shadow-petal-300/40 transition hover:bg-petal-600 disabled:opacity-60"
            disabled={!isFirebaseConfigured || !currentUser || isAuthLoading || isUploadingRecipe}
            onClick={() => void handleUploadRecipe()}
          >
            <UploadCloud aria-hidden="true" size={18} />
            {isUploadingRecipe ? 'Uploading' : 'Upload this recipe'}
          </button>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-petal-600">
            Recipe images
          </p>
          <h2 className="mt-1 text-lg font-bold text-cocoa-900">Gallery</h2>
        </div>
        <RecipeImageShelf
          imageIds={recipe.imageIds}
          title={recipe.title}
          onImageOpen={(initialIndex) => setLightbox({ imageIds: recipe.imageIds, initialIndex })}
        />
      </section>

      {isArchived ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-petal-500 px-4 text-sm font-bold text-white shadow-lg shadow-petal-300/40 transition hover:bg-petal-600"
            onClick={() => void handleRestoreRecipe()}
          >
            <RotateCcw aria-hidden="true" size={18} />
            Restore
          </button>
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-petal-200 bg-white px-4 text-sm font-bold text-petal-700 shadow-soft transition hover:bg-petal-50"
            onClick={() => void handlePermanentDeleteRecipe()}
          >
            <Trash2 aria-hidden="true" size={18} />
            Delete
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-petal-500 px-4 text-sm font-bold text-white shadow-lg shadow-petal-300/40 transition hover:bg-petal-600"
            onClick={() => onEdit(recipe.id)}
          >
            <Pencil aria-hidden="true" size={18} />
            Edit
          </button>
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-petal-200 bg-white px-4 text-sm font-bold text-petal-700 shadow-soft transition hover:bg-petal-50"
            onClick={() => void handleDeleteRecipe()}
          >
            <Trash2 aria-hidden="true" size={18} />
            Delete
          </button>
        </div>
      )}

      {lightbox ? (
        <RecipeImageLightbox
          imageIds={lightbox.imageIds}
          initialIndex={lightbox.initialIndex}
          title={recipe.title}
          onClose={() => setLightbox(undefined)}
        />
      ) : null}
    </>
  );
}
