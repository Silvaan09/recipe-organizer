import { useState } from 'react';

import type { AppTab } from '../types/navigation';

export function useActiveTab(initialTab: AppTab) {
  const [activeTab, setActiveTab] = useState<AppTab>(initialTab);

  return { activeTab, setActiveTab };
}
