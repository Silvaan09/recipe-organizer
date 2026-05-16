import type { SyncMetadata, SyncStatus } from '../../types/sync';

export const SYNC_STATUSES = [
  'local-only',
  'pending-sync',
  'synced',
  'sync-error',
] as const satisfies readonly SyncStatus[];

export function isSyncStatus(value: unknown): value is SyncStatus {
  return typeof value === 'string' && SYNC_STATUSES.includes(value as SyncStatus);
}

export function createLocalSyncMetadata(timestamp = new Date().toISOString()): SyncMetadata {
  return {
    localUpdatedAt: timestamp,
    syncStatus: 'local-only',
  };
}

export function normalizeSyncMetadata(
  value: Partial<SyncMetadata>,
  fallbackTimestamp: string,
): SyncMetadata {
  return {
    deletedAt: value.deletedAt,
    lastSyncedAt: value.lastSyncedAt,
    localUpdatedAt: value.localUpdatedAt ?? fallbackTimestamp,
    syncStatus: isSyncStatus(value.syncStatus) ? value.syncStatus : 'local-only',
  };
}

export function markLocalChange(
  current: Pick<SyncMetadata, 'syncStatus'>,
  timestamp = new Date().toISOString(),
): Pick<SyncMetadata, 'localUpdatedAt' | 'syncStatus'> {
  return {
    localUpdatedAt: timestamp,
    syncStatus: current.syncStatus === 'local-only' ? 'local-only' : 'pending-sync',
  };
}

export function markSynced(timestamp = new Date().toISOString()): Pick<
  SyncMetadata,
  'lastSyncedAt' | 'syncStatus'
> {
  return {
    lastSyncedAt: timestamp,
    syncStatus: 'synced',
  };
}

export function markSyncError(): Pick<SyncMetadata, 'syncStatus'> {
  return {
    syncStatus: 'sync-error',
  };
}
