import { BookOpen, Home } from 'lucide-react';

import { cn } from '../../utils/cn';
import type { AppTab } from '../../types/navigation';

type BottomTabsProps = {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
};

const tabs = [
  { id: 'home', label: 'Start', icon: Home },
  { id: 'recipes', label: 'Rezepte', icon: BookOpen },
] satisfies Array<{
  id: AppTab;
  label: string;
  icon: typeof Home;
}>;

export function BottomTabs({ activeTab, onTabChange }: BottomTabsProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-petal-100 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-soft backdrop-blur">
      <div className="mx-auto grid max-w-screen-sm grid-cols-2 gap-3">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;

          return (
            <button
              key={id}
              type="button"
              className={cn(
                'flex min-h-14 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition active:scale-[0.99]',
                isActive
                  ? 'border-petal-200 bg-petal-100 text-petal-700 shadow-soft'
                  : 'border-transparent text-cocoa-700 hover:bg-petal-50',
              )}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onTabChange(id)}
            >
              <Icon aria-hidden="true" size={20} strokeWidth={2.4} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
