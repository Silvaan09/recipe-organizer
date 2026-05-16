import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { Recipe } from '../../types/recipe';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { RecipeCard } from './RecipeCard';

const VIRTUALIZATION_THRESHOLD = 120;
const VIRTUAL_ROW_HEIGHT = 124;
const VIRTUAL_OVERSCAN = 8;

type RecipeListProps = {
  emptyAction?: ReactNode;
  emptyLabel: string;
  emptyTitle?: string;
  isLoading: boolean;
  onRecipeClick: (recipe: Recipe) => void;
  recipes: Recipe[];
};

function useVirtualRecipeWindow(recipeCount: number) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [windowState, setWindowState] = useState({
    endIndex: Math.min(recipeCount, 30),
    offsetTop: 0,
    startIndex: 0,
  });

  useEffect(() => {
    if (recipeCount <= VIRTUALIZATION_THRESHOLD) {
      return;
    }

    let frameId = 0;

    function updateWindow() {
      const container = containerRef.current;

      if (!container) {
        return;
      }

      const containerTop = container.getBoundingClientRect().top + window.scrollY;
      const viewportTop = Math.max(0, window.scrollY - containerTop);
      const viewportHeight = window.innerHeight;
      const startIndex = Math.max(
        0,
        Math.floor(viewportTop / VIRTUAL_ROW_HEIGHT) - VIRTUAL_OVERSCAN,
      );
      const visibleCount = Math.ceil(viewportHeight / VIRTUAL_ROW_HEIGHT) + VIRTUAL_OVERSCAN * 2;
      const endIndex = Math.min(recipeCount, startIndex + visibleCount);

      setWindowState({
        endIndex,
        offsetTop: startIndex * VIRTUAL_ROW_HEIGHT,
        startIndex,
      });
    }

    function scheduleUpdate() {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateWindow);
    }

    scheduleUpdate();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [recipeCount]);

  return { containerRef, windowState };
}

export function RecipeList({
  emptyAction,
  emptyLabel,
  emptyTitle,
  isLoading,
  onRecipeClick,
  recipes,
}: RecipeListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="flex h-28 gap-3 rounded-lg border border-petal-100 bg-white/80 p-3 shadow-soft"
          >
            <Skeleton className="size-20 shrink-0" />
            <div className="flex flex-1 flex-col justify-center gap-3">
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (recipes.length === 0) {
    return <EmptyState action={emptyAction} label={emptyLabel} title={emptyTitle} />;
  }

  if (recipes.length > VIRTUALIZATION_THRESHOLD) {
    return (
      <VirtualRecipeList recipes={recipes} onRecipeClick={onRecipeClick} />
    );
  }

  return (
    <div className="flex flex-col gap-3 motion-safe:animate-[fade-in_220ms_ease-out]">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} onOpen={onRecipeClick} />
      ))}
    </div>
  );
}

type VirtualRecipeListProps = {
  onRecipeClick: (recipe: Recipe) => void;
  recipes: Recipe[];
};

function VirtualRecipeList({ onRecipeClick, recipes }: VirtualRecipeListProps) {
  const { containerRef, windowState } = useVirtualRecipeWindow(recipes.length);
  const visibleRecipes = useMemo(
    () => recipes.slice(windowState.startIndex, windowState.endIndex),
    [recipes, windowState.endIndex, windowState.startIndex],
  );

  return (
    <div
      ref={containerRef}
      className="relative motion-safe:animate-[fade-in_220ms_ease-out]"
      style={{ height: recipes.length * VIRTUAL_ROW_HEIGHT }}
    >
      <div
        className="absolute inset-x-0 top-0 flex flex-col gap-3"
        style={{ transform: `translateY(${windowState.offsetTop}px)` }}
      >
        {visibleRecipes.map((recipe) => (
          <div key={recipe.id} style={{ height: VIRTUAL_ROW_HEIGHT - 12 }}>
            <RecipeCard recipe={recipe} onOpen={onRecipeClick} />
          </div>
        ))}
      </div>
    </div>
  );
}
