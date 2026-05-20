import { Search, X } from 'lucide-react';

type RecipeSearchBarProps = {
  onChange: (value: string) => void;
  value: string;
};

export function RecipeSearchBar({ onChange, value }: RecipeSearchBarProps) {
  return (
    <label className="sticky top-[88px] z-10 flex min-h-14 items-center gap-3 rounded-lg border border-petal-100 bg-white/95 px-4 text-cocoa-700 shadow-soft backdrop-blur transition focus-within:border-petal-300 focus-within:ring-2 focus-within:ring-petal-100">
      <Search aria-hidden="true" size={19} className="text-petal-600" />
      <span className="sr-only">Rezepte suchen</span>
      <input
        type="search"
        value={value}
        placeholder="Nach Titel oder Stichwort suchen"
        className="w-full bg-transparent text-sm outline-none placeholder:text-cocoa-700/55"
        onChange={(event) => onChange(event.target.value)}
      />
      {value ? (
        <button
          type="button"
          className="grid size-8 place-items-center rounded-lg text-petal-600 transition hover:bg-petal-50"
          aria-label="Suche löschen"
          onClick={() => onChange('')}
        >
          <X aria-hidden="true" size={17} />
        </button>
      ) : null}
    </label>
  );
}
