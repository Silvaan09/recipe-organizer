import { Plus } from 'lucide-react';

type FloatingAddRecipeButtonProps = {
  onClick: () => void;
};

export function FloatingAddRecipeButton({ onClick }: FloatingAddRecipeButtonProps) {
  return (
    <button
      type="button"
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+6.75rem)] right-4 z-40 grid size-14 place-items-center rounded-full bg-petal-500 text-white shadow-lg shadow-petal-300/60 transition duration-200 hover:-translate-y-0.5 hover:bg-petal-600 focus:outline-none focus:ring-4 focus:ring-petal-200 sm:right-[calc(50%-18rem)]"
      aria-label="Rezept hinzufügen"
      title="Rezept hinzufügen"
      onClick={onClick}
    >
      <Plus aria-hidden="true" size={26} strokeWidth={2.6} />
    </button>
  );
}
