import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';

import { getArchivedRecipes } from '../db';
import { RecipeList } from '../components/recipes/RecipeList';
import { Skeleton } from '../components/ui/Skeleton';
import type { Recipe } from '../types/recipe';
import { logAndReturnMessage } from '../utils/errors';

type ArchivePageProps = {
  onClose: () => void;
  onOpenRecipe: (recipeId: string) => void;
};

export function ArchivePage({ onClose, onOpenRecipe }: ArchivePageProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadArchive() {
      try {
        setIsLoading(true);
        const archivedRecipes = await getArchivedRecipes();

        if (isMounted) {
          setRecipes(archivedRecipes);
          setError(null);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(logAndReturnMessage(loadError, 'Archive could not be loaded.'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadArchive();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <button
        type="button"
        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg bg-white px-3 text-sm font-bold text-petal-700 shadow-soft transition hover:bg-petal-50"
        onClick={onClose}
      >
        <ArrowLeft aria-hidden="true" size={18} />
        Settings
      </button>

      <section className="rounded-lg bg-gradient-to-br from-petal-400 via-petal-300 to-herb-100 p-5 text-white shadow-soft">
        <p className="text-sm font-semibold text-white/85">Stored locally</p>
        <h2 className="mt-2 font-serif text-3xl font-bold leading-tight">Archive</h2>
        <p className="mt-3 max-w-sm text-sm leading-6 text-white/85">
          Restore recipes back to your library or permanently remove them from this device.
        </p>
      </section>

      {error ? (
        <div className="rounded-lg border border-petal-200 bg-white p-4 text-sm font-semibold text-petal-700 shadow-soft">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <RecipeList
          emptyLabel="Deleted recipes will appear here before they are permanently removed."
          emptyTitle="Archive is empty"
          isLoading={false}
          recipes={recipes}
          onRecipeClick={(recipe) => onOpenRecipe(recipe.id)}
        />
      )}
    </>
  );
}
