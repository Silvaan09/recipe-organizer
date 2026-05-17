import {
  Archive,
  ArrowLeft,
  Cloud,
  Database,
  Download,
  LogIn,
  LogOut,
  RefreshCw,
  Trash2,
  Upload,
  UploadCloud,
} from 'lucide-react';
import { useRef, useState } from 'react';

import { clearLocalDatabase } from '../db';
import { useAuth } from '../firebase';
import { downloadBackupFile, restoreBackup, validateBackupFile } from '../services/backup';
import {
  uploadPendingRecipesToFirebase,
  type BulkUploadProgress,
  type BulkUploadSummary,
} from '../services/cloudSync';
import { createFirebaseSyncPlan, formatBytes, type FirebaseSyncPlan } from '../services/sync';
import { Card } from '../components/ui/Card';
import { logAndReturnMessage } from '../utils/errors';

type SettingsPageProps = {
  onClose: () => void;
  onOpenArchive: () => void;
};

type SettingsStatus = {
  tone: 'success' | 'error';
  message: string;
};

export function SettingsPage({ onClose, onOpenArchive }: SettingsPageProps) {
  const {
    currentUser,
    isFirebaseConfigured,
    isLoading: isAuthLoading,
    signInWithGoogle,
    signOut,
  } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<SettingsStatus>();
  const [isBusy, setIsBusy] = useState(false);
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [syncPlan, setSyncPlan] = useState<FirebaseSyncPlan>();
  const [isPlanningSync, setIsPlanningSync] = useState(false);
  const [bulkUploadProgress, setBulkUploadProgress] = useState<BulkUploadProgress>();
  const [bulkUploadSummary, setBulkUploadSummary] = useState<BulkUploadSummary>();
  const [isUploadingPendingChanges, setIsUploadingPendingChanges] = useState(false);

  async function handleDryRunSync() {
    setIsPlanningSync(true);
    setStatus(undefined);

    try {
      const nextSyncPlan = await createFirebaseSyncPlan();
      setSyncPlan(nextSyncPlan);
      setStatus({
        tone: 'success',
        message: `Dry run complete. Planned ${nextSyncPlan.recipesPendingSync} recipes and ${nextSyncPlan.imagesPendingSync} images.`,
      });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: logAndReturnMessage(error, 'Dry run sync failed.'),
      });
    } finally {
      setIsPlanningSync(false);
    }
  }

  async function handleUploadPendingChanges() {
    if (!isFirebaseConfigured) {
      setStatus({
        tone: 'error',
        message: 'Firebase is not configured. Add your Vite Firebase env vars first.',
      });
      return;
    }

    if (!currentUser) {
      setStatus({
        tone: 'error',
        message: 'Sign in with Google before uploading pending changes.',
      });
      return;
    }

    const shouldUpload = window.confirm(
      'Upload pending local recipe changes to Firebase?\n\nThis will write recipe documents to Firestore and upload local images to Firebase Storage. It will not download anything from Firebase.',
    );

    if (!shouldUpload) {
      return;
    }

    setIsUploadingPendingChanges(true);
    setBulkUploadProgress(undefined);
    setBulkUploadSummary(undefined);
    setStatus(undefined);

    try {
      const summary = await uploadPendingRecipesToFirebase(setBulkUploadProgress);
      const nextSyncPlan = await createFirebaseSyncPlan();
      setBulkUploadSummary(summary);
      setSyncPlan(nextSyncPlan);
      setStatus({
        tone: summary.failedUploads > 0 ? 'error' : 'success',
        message:
          summary.totalPendingRecipes === 0
            ? 'No pending recipe changes to upload.'
            : `Upload complete. ${summary.successfulUploads} succeeded and ${summary.failedUploads} failed.`,
      });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: logAndReturnMessage(error, 'Pending changes could not be uploaded.'),
      });
    } finally {
      setIsUploadingPendingChanges(false);
    }
  }

  async function handleSignInWithGoogle() {
    setIsAuthBusy(true);
    setStatus(undefined);

    try {
      await signInWithGoogle();
      setStatus({ tone: 'success', message: 'Signed in with Google.' });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: logAndReturnMessage(error, 'Google sign-in failed.'),
      });
    } finally {
      setIsAuthBusy(false);
    }
  }

  async function handleSignOut() {
    setIsAuthBusy(true);
    setStatus(undefined);

    try {
      await signOut();
      setStatus({ tone: 'success', message: 'Signed out. Local recipes remain available.' });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: logAndReturnMessage(error, 'Sign out failed.'),
      });
    } finally {
      setIsAuthBusy(false);
    }
  }

  async function handleExportBackup() {
    setIsBusy(true);
    setStatus(undefined);

    try {
      const result = await downloadBackupFile();
      setStatus({
        tone: 'success',
        message: `Exported ${result.recipeCount} recipes and ${result.imageCount} images.`,
      });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: logAndReturnMessage(error, 'Backup export failed.'),
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function handleImportBackup(file: File) {
    setIsBusy(true);
    setStatus(undefined);

    try {
      const validatedBackup = await validateBackupFile(file);
      const shouldRestore = window.confirm(
        `Restore backup from ${new Date(validatedBackup.exportedAt).toLocaleString()}?\n\nThis will replace your local recipes with ${validatedBackup.recipeCount} recipes and ${validatedBackup.imageCount} images.`,
      );

      if (!shouldRestore) {
        setStatus({ tone: 'success', message: 'Import cancelled. Your local data was not changed.' });
        return;
      }

      await restoreBackup(validatedBackup);
      setStatus({
        tone: 'success',
        message: `Restored ${validatedBackup.recipeCount} recipes and ${validatedBackup.imageCount} images.`,
      });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: logAndReturnMessage(error, 'Backup import failed.'),
      });
    } finally {
      setIsBusy(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleClearDatabase() {
    const shouldClear = window.confirm(
      'Clear all local recipes and images from this device? This cannot be undone unless you have a backup file.',
    );

    if (!shouldClear) {
      return;
    }

    setIsBusy(true);
    setStatus(undefined);

    try {
      await clearLocalDatabase();
      setStatus({ tone: 'success', message: 'Local recipe database cleared.' });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: logAndReturnMessage(error, 'Database could not be cleared.'),
      });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg bg-white px-3 text-sm font-bold text-petal-700 shadow-soft transition hover:bg-petal-50"
        onClick={onClose}
      >
        <ArrowLeft aria-hidden="true" size={18} />
        Back
      </button>

      <section className="rounded-lg bg-gradient-to-br from-petal-400 via-petal-300 to-herb-100 p-5 text-white shadow-soft">
        <p className="text-sm font-semibold text-white/85">Offline data</p>
        <h2 className="mt-2 font-serif text-3xl font-bold leading-tight">Settings</h2>
        <p className="mt-3 max-w-sm text-sm leading-6 text-white/85">
          Export, restore, or clear the recipes saved on this device.
        </p>
      </section>

      {status ? (
        <div
          className={
            status.tone === 'success'
              ? 'rounded-lg border border-herb-100 bg-white p-4 text-sm font-semibold text-herb-700 shadow-soft'
              : 'rounded-lg border border-petal-200 bg-white p-4 text-sm font-semibold text-petal-700 shadow-soft'
          }
        >
          {status.message}
        </div>
      ) : null}

      <Card className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-petal-100 text-petal-700">
            <Cloud aria-hidden="true" size={21} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold">Account</h3>
            <p className="mt-1 text-sm leading-6 text-cocoa-700">
              {currentUser
                ? `Signed in as ${currentUser.displayName ?? currentUser.email ?? 'Google user'}.`
                : isFirebaseConfigured
                  ? 'Not signed in. Local recipes still work offline on this device.'
                  : 'Firebase is not configured yet. Local recipes still work offline.'}
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-petal-50 px-3 py-2 text-sm font-bold text-petal-700">
          {isAuthLoading
            ? 'Checking account'
            : currentUser
              ? 'Signed in'
              : isFirebaseConfigured
                ? 'Signed out'
                : 'Local-only mode'}
        </div>

        {currentUser ? (
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-petal-100 bg-white px-4 text-sm font-bold text-petal-700 shadow-soft transition hover:bg-petal-50 disabled:opacity-60"
            disabled={isAuthBusy || isAuthLoading}
            onClick={() => void handleSignOut()}
          >
            <LogOut aria-hidden="true" size={18} />
            Sign Out
          </button>
        ) : (
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-petal-500 px-4 text-sm font-bold text-white shadow-lg shadow-petal-300/40 transition hover:bg-petal-600 disabled:opacity-60"
            disabled={!isFirebaseConfigured || isAuthBusy || isAuthLoading}
            onClick={() => void handleSignInWithGoogle()}
          >
            <LogIn aria-hidden="true" size={18} />
            Sign in with Google
          </button>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-petal-100 text-petal-700">
            <RefreshCw aria-hidden="true" size={21} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold">Sync dry run</h3>
            <p className="mt-1 text-sm leading-6 text-cocoa-700">
              Preview what would sync to Firebase. This only reads local IndexedDB data.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-petal-100 bg-petal-50 p-3 text-sm font-semibold text-petal-700">
          Firebase status:{' '}
          {isAuthLoading
            ? 'checking'
            : currentUser
              ? `signed in as ${currentUser.email ?? currentUser.displayName ?? 'Google user'}`
              : isFirebaseConfigured
                ? 'configured, signed out'
                : 'not configured'}
        </div>

        <button
          type="button"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-petal-500 px-4 text-sm font-bold text-white shadow-lg shadow-petal-300/40 transition hover:bg-petal-600 disabled:opacity-60"
          disabled={isPlanningSync}
          onClick={() => void handleDryRunSync()}
        >
          <RefreshCw aria-hidden="true" size={18} className={isPlanningSync ? 'animate-spin' : ''} />
          Dry Run Sync
        </button>

        <div className="rounded-lg border border-petal-100 bg-white p-3">
          <h4 className="text-sm font-bold text-cocoa-900">Manual upload</h4>
          <p className="mt-1 text-sm leading-6 text-cocoa-700">
            Uploads only local recipes that changed, failed before, or are marked deleted. This uses one-time
            Firebase writes and does not download cloud data.
          </p>
          <button
            type="button"
            className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-petal-500 px-4 text-sm font-bold text-white shadow-lg shadow-petal-300/40 transition hover:bg-petal-600 disabled:opacity-60"
            disabled={
              !isFirebaseConfigured ||
              !currentUser ||
              isAuthLoading ||
              isUploadingPendingChanges
            }
            onClick={() => void handleUploadPendingChanges()}
          >
            <UploadCloud
              aria-hidden="true"
              size={18}
              className={isUploadingPendingChanges ? 'animate-pulse' : ''}
            />
            {isUploadingPendingChanges ? 'Uploading pending changes' : 'Upload pending changes'}
          </button>
        </div>

        {bulkUploadProgress ? (
          <div className="rounded-lg border border-petal-100 bg-petal-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-bold text-cocoa-900">Upload progress</h4>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-petal-700">
                {bulkUploadProgress.completedUploads} / {bulkUploadProgress.totalPendingRecipes}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-petal-500 transition-all"
                style={{
                  width:
                    bulkUploadProgress.totalPendingRecipes === 0
                      ? '100%'
                      : `${Math.round(
                          (bulkUploadProgress.completedUploads /
                            bulkUploadProgress.totalPendingRecipes) *
                            100,
                        )}%`,
                }}
              />
            </div>
            <p className="mt-3 text-sm font-semibold text-cocoa-700">
              {bulkUploadProgress.currentRecipeTitle
                ? `Uploading ${bulkUploadProgress.currentRecipeTitle}`
                : bulkUploadProgress.totalPendingRecipes === 0
                  ? 'No pending recipe changes found.'
                  : 'Preparing pending recipe uploads.'}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <SyncSummaryTile label="Successful" value={bulkUploadProgress.successfulUploads} />
              <SyncSummaryTile label="Failed" value={bulkUploadProgress.failedUploads} />
            </div>
          </div>
        ) : null}

        {bulkUploadSummary ? (
          <div className="rounded-lg border border-petal-100 bg-white p-3">
            <h4 className="text-sm font-bold text-cocoa-900">Upload summary</h4>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <SyncSummaryTile label="Pending" value={bulkUploadSummary.totalPendingRecipes} />
              <SyncSummaryTile label="Uploaded" value={bulkUploadSummary.successfulUploads} />
              <SyncSummaryTile label="Failed" value={bulkUploadSummary.failedUploads} />
            </div>
            {bulkUploadSummary.results.length > 0 ? (
              <div className="mt-3 flex max-h-52 flex-col gap-2 overflow-y-auto pr-1">
                {bulkUploadSummary.results.slice(0, 20).map((result) => (
                  <div key={result.recipeId} className="rounded-lg bg-petal-50 px-3 py-2">
                    <p className="truncate text-sm font-bold text-cocoa-900">{result.title}</p>
                    <p className="mt-1 text-xs font-semibold text-petal-700">
                      {result.status === 'success'
                        ? `Uploaded ${result.imageCount ?? 0} images`
                        : result.errorMessage}
                    </p>
                  </div>
                ))}
                {bulkUploadSummary.results.length > 20 ? (
                  <p className="text-xs font-bold text-cocoa-700">
                    {bulkUploadSummary.results.length - 20} more results completed.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {syncPlan ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2">
              <SyncSummaryTile label="Total recipes" value={syncPlan.totalRecipes} />
              <SyncSummaryTile label="Total images" value={syncPlan.totalImages} />
              <SyncSummaryTile label="Recipes pending" value={syncPlan.recipesPendingSync} />
              <SyncSummaryTile label="Images pending" value={syncPlan.imagesPendingSync} />
              <SyncSummaryTile label="Recipes deleted" value={syncPlan.recipesMarkedDeleted} />
              <SyncSummaryTile label="Upload size" value={formatBytes(syncPlan.estimatedUploadSize)} />
            </div>

            <div className="rounded-lg border border-petal-100 bg-white p-3">
              <h4 className="text-sm font-bold text-cocoa-900">Warnings</h4>
              <div className="mt-2 flex flex-col gap-2">
                {syncPlan.warnings.map((warning) => (
                  <p key={warning} className="rounded-lg bg-petal-50 px-3 py-2 text-xs font-bold text-petal-700">
                    {warning}
                  </p>
                ))}
              </div>
            </div>

            <SyncPlanList
              emptyLabel="No recipes need sync."
              items={syncPlan.recipePlan}
              title="Recipe plan"
            />
            <SyncPlanList
              emptyLabel="No images need sync."
              items={syncPlan.imagePlan}
              title="Image plan"
            />
          </div>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-petal-100 text-petal-700">
            <Database aria-hidden="true" size={21} />
          </div>
          <div>
            <h3 className="text-base font-bold">Local backup</h3>
            <p className="mt-1 text-sm leading-6 text-cocoa-700">
              Backups are JSON files that include recipe metadata and image data.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-petal-500 px-4 text-sm font-bold text-white shadow-lg shadow-petal-300/40 transition hover:bg-petal-600 disabled:opacity-60"
          disabled={isBusy}
          onClick={() => void handleExportBackup()}
        >
          <Download aria-hidden="true" size={18} />
          Export Backup
        </button>

        <button
          type="button"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-petal-100 bg-white px-4 text-sm font-bold text-petal-700 shadow-soft transition hover:bg-petal-50 disabled:opacity-60"
          disabled={isBusy}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload aria-hidden="true" size={18} />
          Import Backup
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              void handleImportBackup(file);
            }
          }}
        />
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-petal-100 text-petal-700">
            <Archive aria-hidden="true" size={21} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold">Archive</h3>
            <p className="mt-1 text-sm leading-6 text-cocoa-700">
              Restore deleted recipes or permanently remove them from this device.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-petal-100 bg-white px-4 text-sm font-bold text-petal-700 shadow-soft transition hover:bg-petal-50"
          onClick={onOpenArchive}
        >
          <Archive aria-hidden="true" size={18} />
          Open Archive
        </button>
      </Card>

      <Card className="border-petal-200 bg-petal-50">
        <h3 className="text-base font-bold">Clear local database</h3>
        <p className="mt-1 text-sm leading-6 text-cocoa-700">
          Removes all recipes and stored images from IndexedDB on this device.
        </p>
        <button
          type="button"
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-bold text-petal-700 shadow-soft transition hover:bg-petal-100 disabled:opacity-60"
          disabled={isBusy}
          onClick={() => void handleClearDatabase()}
        >
          <Trash2 aria-hidden="true" size={18} />
          Clear Local Database
        </button>
      </Card>
    </>
  );
}

type SyncSummaryTileProps = {
  label: string;
  value: number | string;
};

function SyncSummaryTile({ label, value }: SyncSummaryTileProps) {
  return (
    <div className="rounded-lg bg-petal-50 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-petal-600">{label}</p>
      <p className="mt-1 text-lg font-black text-cocoa-900">{value}</p>
    </div>
  );
}

type SyncPlanListProps = {
  emptyLabel: string;
  items: FirebaseSyncPlan['recipePlan'];
  title: string;
};

function SyncPlanList({ emptyLabel, items, title }: SyncPlanListProps) {
  return (
    <div className="rounded-lg border border-petal-100 bg-white p-3">
      <h4 className="text-sm font-bold text-cocoa-900">{title}</h4>
      {items.length === 0 ? (
        <p className="mt-2 text-sm font-semibold text-cocoa-700">{emptyLabel}</p>
      ) : (
        <div className="mt-2 flex max-h-52 flex-col gap-2 overflow-y-auto pr-1">
          {items.slice(0, 20).map((item) => (
            <div key={item.id} className="rounded-lg bg-petal-50 px-3 py-2">
              <p className="truncate text-sm font-bold text-cocoa-900">{item.title}</p>
              <p className="mt-1 text-xs font-semibold text-petal-700">
                {item.reason} · {item.syncStatus}
              </p>
            </div>
          ))}
          {items.length > 20 ? (
            <p className="text-xs font-bold text-cocoa-700">
              {items.length - 20} more items included in the plan.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
