export type SyncStatus = 'local-only' | 'pending-sync' | 'synced' | 'sync-error';

export type SyncMetadata = {
  deletedAt?: string;
  lastSyncedAt?: string;
  localUpdatedAt: string;
  syncError?: string;
  syncStatus: SyncStatus;
};
