import { Download, X } from 'lucide-react';
import { useState } from 'react';

import { useInstallPrompt } from '../../hooks/useInstallPrompt';

export function InstallPrompt() {
  const { canInstall, promptInstall } = useInstallPrompt();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!canInstall || isDismissed) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-24 z-40 px-4">
      <div className="mx-auto flex max-w-screen-sm items-center gap-3 rounded-lg border border-petal-100 bg-white p-3 shadow-lg shadow-petal-200/70">
        <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-petal-100 text-petal-700">
          <Download aria-hidden="true" size={19} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-cocoa-900">Install recipe book</p>
          <p className="text-xs font-medium text-cocoa-700">Open faster and keep it handy offline.</p>
        </div>
        <button
          type="button"
          className="min-h-10 rounded-lg bg-petal-500 px-3 text-xs font-bold text-white"
          onClick={() => void promptInstall()}
        >
          Install
        </button>
        <button
          type="button"
          className="grid size-10 place-items-center rounded-lg text-petal-700 transition hover:bg-petal-50"
          aria-label="Dismiss install prompt"
          onClick={() => setIsDismissed(true)}
        >
          <X aria-hidden="true" size={18} />
        </button>
      </div>
    </div>
  );
}
