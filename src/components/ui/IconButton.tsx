import type { ReactNode } from 'react';

type IconButtonProps = {
  children: ReactNode;
  label: string;
  onClick?: () => void;
};

export function IconButton({ children, label, onClick }: IconButtonProps) {
  return (
    <button
      type="button"
      className="grid size-10 place-items-center rounded-lg border border-petal-100 bg-white text-petal-700 shadow-soft transition hover:bg-petal-100 focus:outline-none focus:ring-2 focus:ring-petal-300"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
