import { WifiOff } from 'lucide-react';

import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-screen-sm px-4 pt-3 sm:px-6">
      <div className="flex min-h-11 items-center gap-3 rounded-lg border border-petal-200 bg-white px-4 text-sm font-bold text-petal-700 shadow-soft">
        <WifiOff aria-hidden="true" size={18} />
        Offline mode. Saved recipes and images are still available.
      </div>
    </div>
  );
}
