import { ArrowDown, ArrowUp } from 'lucide-react';

import type { RecipeSortMode, RecipeSortState } from '../../types/sort';

type RecipeSortControlProps = {
  onChange: (sortState: RecipeSortState) => void;
  value: RecipeSortState;
};

const sortOptions = [
  { label: 'A-Z', value: 'alphabetical' },
  { label: 'Erstellt', value: 'recentlyCreated' },
  { label: 'Zuletzt gekocht', value: 'recentlyUsed' },
] satisfies Array<{ label: string; value: RecipeSortMode }>;

export function RecipeSortControl({ onChange, value }: RecipeSortControlProps) {
  function handleSortClick(sortMode: RecipeSortMode) {
    if (value.mode === sortMode) {
      onChange({
        mode: sortMode,
        direction: value.direction === 'asc' ? 'desc' : 'asc',
      });
      return;
    }

    onChange({
      mode: sortMode,
      direction: sortMode === 'alphabetical' ? 'asc' : 'desc',
    });
  }

  return (
    <div className="grid grid-cols-3 gap-2 rounded-lg bg-white p-1 shadow-soft">
      {sortOptions.map((option) => {
        const isActive = value.mode === option.value;
        const DirectionIcon = value.direction === 'asc' ? ArrowUp : ArrowDown;

        return (
          <button
            key={option.value}
            type="button"
            className={
              isActive
              ? 'min-h-11 rounded-md bg-petal-100 px-3 text-sm font-bold text-petal-700 transition'
                : 'min-h-11 rounded-md px-3 text-sm font-semibold text-cocoa-700 transition hover:bg-petal-50'
            }
            aria-pressed={isActive}
            onClick={() => handleSortClick(option.value)}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <span>{option.label}</span>
              {isActive ? <DirectionIcon aria-hidden="true" size={14} strokeWidth={2.6} /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
