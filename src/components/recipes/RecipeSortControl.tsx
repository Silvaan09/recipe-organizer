import type { RecipeSortMode } from '../../types/sort';

type RecipeSortControlProps = {
  onChange: (sortMode: RecipeSortMode) => void;
  value: RecipeSortMode;
};

const sortOptions = [
  { label: 'A-Z', value: 'alphabetical' },
  { label: 'Used', value: 'recentlyUsed' },
  { label: 'New', value: 'recentlyCreated' },
] satisfies Array<{ label: string; value: RecipeSortMode }>;

export function RecipeSortControl({ onChange, value }: RecipeSortControlProps) {
  return (
    <div className="grid grid-cols-3 gap-2 rounded-lg bg-white p-1 shadow-soft">
      {sortOptions.map((option) => {
        const isActive = value === option.value;

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
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
