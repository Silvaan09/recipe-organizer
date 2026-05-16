import type { ReactNode } from 'react';

import { BottomTabs } from './BottomTabs';
import { Header } from './Header';
import { InstallPrompt } from '../pwa/InstallPrompt';
import { OfflineIndicator } from '../pwa/OfflineIndicator';
import type { AppTab } from '../../types/navigation';

type AppShellProps = {
  activeTab: AppTab;
  children: ReactNode;
  onSettingsClick: () => void;
  onTabChange: (tab: AppTab) => void;
  showBottomTabs?: boolean;
};

export function AppShell({
  activeTab,
  children,
  onSettingsClick,
  onTabChange,
  showBottomTabs = true,
}: AppShellProps) {
  return (
    <div className="min-h-dvh bg-petal-50 text-cocoa-900">
      <Header onSettingsClick={onSettingsClick} />
      <OfflineIndicator />
      <main
        className={
          showBottomTabs
            ? 'mx-auto flex w-full max-w-screen-sm flex-col gap-5 px-4 pb-32 pt-4 sm:px-6'
            : 'mx-auto flex w-full max-w-screen-sm flex-col gap-5 px-4 pb-8 pt-4 sm:px-6'
        }
      >
        {children}
      </main>
      {showBottomTabs ? <BottomTabs activeTab={activeTab} onTabChange={onTabChange} /> : null}
      <InstallPrompt />
    </div>
  );
}
