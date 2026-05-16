import type { ReactNode } from 'react';
import { BookHeart } from 'lucide-react';

type EmptyStateProps = {
  action?: ReactNode;
  label: string;
  title?: string;
};

export function EmptyState({ action, label, title = 'Nothing here yet' }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-petal-200 bg-white/80 p-6 text-center shadow-soft transition duration-200">
      <div className="mx-auto grid size-14 place-items-center rounded-lg bg-petal-100 text-petal-700">
        <BookHeart aria-hidden="true" size={26} />
      </div>
      <h3 className="mt-4 text-base font-bold text-cocoa-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-xs text-sm font-medium leading-6 text-cocoa-700">{label}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
