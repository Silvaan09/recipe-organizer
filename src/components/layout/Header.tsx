import { Settings } from 'lucide-react';

import { IconButton } from '../ui/IconButton';

type HeaderProps = {
  onSettingsClick: () => void;
};

export function Header({ onSettingsClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-petal-100 bg-petal-50/95 backdrop-blur">
      <div className="mx-auto flex max-w-screen-sm items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-petal-600">Today</p>
          <h1 className="font-serif text-2xl font-bold text-cocoa-900">Recipe Organizer</h1>
        </div>
        <div className="flex items-center gap-2">
          <IconButton label="Settings" onClick={onSettingsClick}>
            <Settings aria-hidden="true" size={20} />
          </IconButton>
        </div>
      </div>
    </header>
  );
}
