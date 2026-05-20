import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CloudOff,
  Pencil,
  RefreshCw,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { archiveRecipe, deleteRecipe, getRecipe, restoreRecipe, updateLastUsed } from '../db';
import { useAuth } from '../firebase';
import { deleteRecipeFromFirebase } from '../services/cloudSync';
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
  const { currentUser, isFirebaseConfigured } = useAuth();
  const [recipe, setRecipe] = useState<Recipe>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ imageIds: string[]; initialIndex: number }>();

  useEffect(() => {
    let isMounted = true;

    async function loadRecipe() {
      try {
        setIsLoading(true);
        const nextRecipe = await getRecipe(recipeId);

        if (!nextRecipe) {
          throw new Error('Rezept konnte lokal nicht gefunden werden.');
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
          setError(logAndReturnMessage(loadError, 'Rezept konnte nicht geladen werden.', { recipeId }));
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
      `"${recipe.title}" ins Archiv verschieben? Du kannst es in den Einstellungen wiederherstellen.`,
    );

    if (!shouldDelete) {
      return;
    }

    try {
      await archiveRecipe(recipe.id);
      onDeleted();
    } catch (deleteError) {
      setError(logAndReturnMessage(deleteError, 'Rezept konnte nicht archiviert werden.', { recipeId: recipe.id }));
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
      setError(logAndReturnMessage(restoreError, 'Rezept konnte nicht wiederhergestellt werden.', { recipeId: recipe.id }));
    }
  }

  async function handlePermanentDeleteRecipe() {
    if (!recipe) {
      return;
    }

    const shouldDelete = window.confirm(
      `"${recipe.title}" und gespeicherte Bilder dauerhaft löschen? Das kann nicht rückgängig gemacht werden.`,
    );

    if (!shouldDelete) {
      return;
    }

    try {
      if (isFirebaseConfigured && currentUser) {
        const shouldDeleteFromCloud = window.confirm(
          `"${recipe.title}" auch aus Firebase Firestore und Firebase Storage löschen? Dadurch werden das Cloud-Rezept und die hochgeladenen Bilder entfernt.`,
        );

        if (shouldDeleteFromCloud) {
          await deleteRecipeFromFirebase(recipe.id);
        }
      }

      await deleteRecipe(recipe.id);
      onDeleted();
    } catch (deleteError) {
      setError(logAndReturnMessage(deleteError, 'Rezept konnte nicht dauerhaft gelöscht werden.', {
        recipeId: recipe.id,
      }));
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
          Zurück
        </button>
        <Card>
          <p className="text-sm font-semibold text-petal-700">{error}</p>
        </Card>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg bg-white px-3 text-sm font-bold text-petal-700 shadow-soft transition hover:bg-petal-50"
          onClick={onBack}
        >
          <ArrowLeft aria-hidden="true" size={18} />
          Zurück
        </button>
        <RecipeSyncIndicator recipe={recipe} />
      </div>

      <section className="flex flex-col gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-petal-600">
            Anzeigebild
          </p>
          <h2 className="mt-1 text-lg font-bold text-cocoa-900">Rezeptcover</h2>
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
        <p className="text-xs font-semibold uppercase tracking-wide text-petal-600">Rezeptkarte</p>
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
              keine Stichwörter
            </span>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-petal-600">
            Rezeptbilder
          </p>
          <h2 className="mt-1 text-lg font-bold text-cocoa-900">Galerie</h2>
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
            Wiederherstellen
          </button>
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-petal-200 bg-white px-4 text-sm font-bold text-petal-700 shadow-soft transition hover:bg-petal-50"
            onClick={() => void handlePermanentDeleteRecipe()}
          >
            <Trash2 aria-hidden="true" size={18} />
            Löschen
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
            Bearbeiten
          </button>
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-petal-200 bg-white px-4 text-sm font-bold text-petal-700 shadow-soft transition hover:bg-petal-50"
            onClick={() => void handleDeleteRecipe()}
          >
            <Trash2 aria-hidden="true" size={18} />
            Löschen
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

type RecipeSyncIndicatorProps = {
  recipe: Recipe;
};

function RecipeSyncIndicator({ recipe }: RecipeSyncIndicatorProps) {
  if (recipe.syncStatus === 'synced') {
    return (
      <span
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-herb-100 bg-white px-3 text-sm font-bold text-herb-700 shadow-soft"
        title="Mit der Cloud synchronisiert"
      >
        <CheckCircle2 aria-hidden="true" size={18} />
        Synchronisiert
      </span>
    );
  }

  if (recipe.syncStatus === 'sync-error' || recipe.syncStatus === 'sync-conflict') {
    const label =
      recipe.syncStatus === 'sync-conflict' ? 'Sync-Konflikt' : 'Sync fehlgeschlagen';

    return (
      <span
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-petal-200 bg-white px-3 text-sm font-bold text-petal-700 shadow-soft"
        title={recipe.syncError ?? label}
      >
        <AlertTriangle aria-hidden="true" size={18} />
        {label}
      </span>
    );
  }

  if (recipe.syncStatus === 'pending-sync') {
    return (
      <span
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-petal-100 bg-white px-3 text-sm font-bold text-petal-700 shadow-soft"
        title="Wartet auf Synchronisierung"
      >
        <RefreshCw aria-hidden="true" size={17} />
        Ausstehend
      </span>
    );
  }

  return (
    <span
      className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-petal-100 bg-white px-3 text-sm font-bold text-cocoa-700 shadow-soft"
      title="Nur lokal gespeichert"
    >
      <CloudOff aria-hidden="true" size={18} />
      Lokal
    </span>
  );
}
