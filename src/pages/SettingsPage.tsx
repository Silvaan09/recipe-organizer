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
  downloadRecipesFromFirebase,
  type DownloadSyncProgress,
  type DownloadSyncSummary,
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

function formatDownloadMessageStatus(status: DownloadSyncSummary['messages'][number]['status']) {
  switch (status) {
    case 'added':
      return 'Hinzugefuegt';
    case 'conflict':
      return 'Konflikt';
    case 'error':
      return 'Fehler';
    case 'skipped':
      return 'Uebersprungen';
    case 'updated':
      return 'Aktualisiert';
    default:
      return status;
  }
}

function formatSyncStatus(status: FirebaseSyncPlan['recipePlan'][number]['syncStatus']) {
  switch (status) {
    case 'local-only':
      return 'nur lokal';
    case 'pending-sync':
      return 'ausstehend';
    case 'synced':
      return 'synchronisiert';
    case 'sync-conflict':
      return 'Konflikt';
    case 'sync-error':
      return 'Sync-Fehler';
    default:
      return status;
  }
}

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
  const [downloadProgress, setDownloadProgress] = useState<DownloadSyncProgress>();
  const [downloadSummary, setDownloadSummary] = useState<DownloadSyncSummary>();
  const [isDownloadingFromCloud, setIsDownloadingFromCloud] = useState(false);

  async function handleDryRunSync() {
    setIsPlanningSync(true);
    setStatus(undefined);

    try {
      const nextSyncPlan = await createFirebaseSyncPlan();
      setSyncPlan(nextSyncPlan);
      setStatus({
        tone: 'success',
        message: `Testlauf abgeschlossen. Geplant: ${nextSyncPlan.recipesPendingSync} Rezepte und ${nextSyncPlan.imagesPendingSync} Bilder.`,
      });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: logAndReturnMessage(error, 'Sync-Testlauf fehlgeschlagen.'),
      });
    } finally {
      setIsPlanningSync(false);
    }
  }

  async function handleUploadPendingChanges() {
    if (!isFirebaseConfigured) {
      setStatus({
        tone: 'error',
        message: 'Firebase ist nicht konfiguriert. Füge zuerst deine Vite-Firebase-Umgebungsvariablen hinzu.',
      });
      return;
    }

    if (!currentUser) {
      setStatus({
        tone: 'error',
        message: 'Melde dich mit Google an, bevor du ausstehende Änderungen hochlädst.',
      });
      return;
    }

    const shouldUpload = window.confirm(
      'Ausstehende lokale Rezeptänderungen zu Firebase hochladen?\n\nDabei werden Rezeptdokumente in Firestore geschrieben und lokale Bilder in Firebase Storage hochgeladen. Es wird nichts von Firebase heruntergeladen.',
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
            ? 'Keine ausstehenden Rezeptänderungen zum Hochladen.'
            : `Upload abgeschlossen. ${summary.successfulUploads} erfolgreich, ${summary.failedUploads} fehlgeschlagen.`,
      });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: logAndReturnMessage(error, 'Ausstehende Änderungen konnten nicht hochgeladen werden.'),
      });
    } finally {
      setIsUploadingPendingChanges(false);
    }
  }

  async function handleDownloadFromCloud() {
    if (!isFirebaseConfigured) {
      setStatus({
        tone: 'error',
        message: 'Firebase ist nicht konfiguriert. Füge zuerst deine Vite-Firebase-Umgebungsvariablen hinzu.',
      });
      return;
    }

    if (!currentUser) {
      setStatus({
        tone: 'error',
        message: 'Melde dich mit Google an, bevor du aus der Cloud herunterlädst.',
      });
      return;
    }

    const shouldDownload = window.confirm(
      'Rezepte von Firebase auf dieses Gerät herunterladen?\n\nSynchronisierte lokale Rezepte können aktualisiert werden, wenn die Cloud-Version neuer ist. Rezepte mit nicht synchronisierten lokalen Änderungen werden nicht überschrieben und als Konflikt markiert.',
    );

    if (!shouldDownload) {
      return;
    }

    setIsDownloadingFromCloud(true);
    setDownloadProgress(undefined);
    setDownloadSummary(undefined);
    setStatus(undefined);

    try {
      const summary = await downloadRecipesFromFirebase(setDownloadProgress);
      const nextSyncPlan = await createFirebaseSyncPlan();
      setDownloadSummary(summary);
      setSyncPlan(nextSyncPlan);
      setStatus({
        tone: summary.errors > 0 || summary.conflicts > 0 ? 'error' : 'success',
        message: `Download abgeschlossen. ${summary.recipesAdded} hinzugefügt, ${summary.recipesUpdated} aktualisiert, ${summary.conflicts} Konflikte.`,
      });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: logAndReturnMessage(error, 'Cloud-Download fehlgeschlagen.'),
      });
    } finally {
      setIsDownloadingFromCloud(false);
    }
  }

  async function handleSignInWithGoogle() {
    setIsAuthBusy(true);
    setStatus(undefined);

    try {
      await signInWithGoogle();
      setStatus({ tone: 'success', message: 'Mit Google angemeldet.' });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: logAndReturnMessage(error, 'Google-Anmeldung fehlgeschlagen.'),
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
      setStatus({ tone: 'success', message: 'Abgemeldet. Lokale Rezepte bleiben verfügbar.' });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: logAndReturnMessage(error, 'Abmelden fehlgeschlagen.'),
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
        message: `${result.recipeCount} Rezepte und ${result.imageCount} Bilder exportiert.`,
      });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: logAndReturnMessage(error, 'Backup-Export fehlgeschlagen.'),
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
        `Backup vom ${new Date(validatedBackup.exportedAt).toLocaleString()} wiederherstellen?\n\nDadurch werden deine lokalen Rezepte durch ${validatedBackup.recipeCount} Rezepte und ${validatedBackup.imageCount} Bilder ersetzt.`,
      );

      if (!shouldRestore) {
        setStatus({ tone: 'success', message: 'Import abgebrochen. Deine lokalen Daten wurden nicht geändert.' });
        return;
      }

      await restoreBackup(validatedBackup);
      setStatus({
        tone: 'success',
        message: `${validatedBackup.recipeCount} Rezepte und ${validatedBackup.imageCount} Bilder wiederhergestellt.`,
      });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: logAndReturnMessage(error, 'Backup-Import fehlgeschlagen.'),
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
      'Alle lokalen Rezepte und Bilder von diesem Gerät löschen? Das kann nur mit einer Backup-Datei rückgängig gemacht werden.',
    );

    if (!shouldClear) {
      return;
    }

    setIsBusy(true);
    setStatus(undefined);

    try {
      await clearLocalDatabase();
      setStatus({ tone: 'success', message: 'Lokale Rezeptdatenbank gelöscht.' });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: logAndReturnMessage(error, 'Datenbank konnte nicht gelöscht werden.'),
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
        Zurück
      </button>

      <section className="rounded-lg bg-gradient-to-br from-petal-400 via-petal-300 to-herb-100 p-5 text-white shadow-soft">
        <p className="text-sm font-semibold text-white/85">Offline-Daten</p>
        <h2 className="mt-2 font-serif text-3xl font-bold leading-tight">Einstellungen</h2>
        <p className="mt-3 max-w-sm text-sm leading-6 text-white/85">
          Exportiere, stelle wieder her oder lösche die auf diesem Gerät gespeicherten Rezepte.
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
            <h3 className="text-base font-bold">Konto</h3>
            <p className="mt-1 text-sm leading-6 text-cocoa-700">
              {currentUser
                ? `Angemeldet als ${currentUser.displayName ?? currentUser.email ?? 'Google-Nutzer'}.`
                : isFirebaseConfigured
                  ? 'Nicht angemeldet. Lokale Rezepte funktionieren auf diesem Gerät weiterhin offline.'
                  : 'Firebase ist noch nicht konfiguriert. Lokale Rezepte funktionieren weiterhin offline.'}
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-petal-50 px-3 py-2 text-sm font-bold text-petal-700">
          {isAuthLoading
            ? 'Konto prüfen'
            : currentUser
              ? 'Angemeldet'
              : isFirebaseConfigured
                ? 'Abgemeldet'
                : 'Nur-lokal-Modus'}
        </div>

        {currentUser ? (
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-petal-100 bg-white px-4 text-sm font-bold text-petal-700 shadow-soft transition hover:bg-petal-50 disabled:opacity-60"
            disabled={isAuthBusy || isAuthLoading}
            onClick={() => void handleSignOut()}
          >
            <LogOut aria-hidden="true" size={18} />
            Abmelden
          </button>
        ) : (
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-petal-500 px-4 text-sm font-bold text-white shadow-lg shadow-petal-300/40 transition hover:bg-petal-600 disabled:opacity-60"
            disabled={!isFirebaseConfigured || isAuthBusy || isAuthLoading}
            onClick={() => void handleSignInWithGoogle()}
          >
            <LogIn aria-hidden="true" size={18} />
            Mit Google anmelden
          </button>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-petal-100 text-petal-700">
            <RefreshCw aria-hidden="true" size={21} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold">Sync-Testlauf</h3>
            <p className="mt-1 text-sm leading-6 text-cocoa-700">
              Vorschau, was mit Firebase synchronisiert würde. Es werden nur lokale IndexedDB-Daten gelesen.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-petal-100 bg-petal-50 p-3 text-sm font-semibold text-petal-700">
          Firebase-Status:{' '}
          {isAuthLoading
            ? 'prüfen'
            : currentUser
              ? `angemeldet als ${currentUser.email ?? currentUser.displayName ?? 'Google-Nutzer'}`
              : isFirebaseConfigured
                ? 'konfiguriert, abgemeldet'
                : 'nicht konfiguriert'}
        </div>

        <button
          type="button"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-petal-500 px-4 text-sm font-bold text-white shadow-lg shadow-petal-300/40 transition hover:bg-petal-600 disabled:opacity-60"
          disabled={isPlanningSync}
          onClick={() => void handleDryRunSync()}
        >
          <RefreshCw aria-hidden="true" size={18} className={isPlanningSync ? 'animate-spin' : ''} />
          Sync-Testlauf
        </button>

        <div className="rounded-lg border border-petal-100 bg-white p-3">
          <h4 className="text-sm font-bold text-cocoa-900">Manueller Upload</h4>
          <p className="mt-1 text-sm leading-6 text-cocoa-700">
            Lädt nur lokale Rezepte hoch, die geändert wurden, zuvor fehlgeschlagen sind oder als gelöscht markiert wurden. Nutzt einmalige Firebase-Schreibvorgänge und lädt keine Cloud-Daten herunter.
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
            {isUploadingPendingChanges ? 'Ausstehende Änderungen hochladen' : 'Ausstehende Änderungen hochladen'}
          </button>
        </div>

        {bulkUploadProgress ? (
          <div className="rounded-lg border border-petal-100 bg-petal-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-bold text-cocoa-900">Upload-Fortschritt</h4>
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
                ? `${bulkUploadProgress.currentRecipeTitle} wird hochgeladen`
                : bulkUploadProgress.totalPendingRecipes === 0
                  ? 'Keine ausstehenden Rezeptänderungen gefunden.'
                  : 'Ausstehende Rezept-Uploads werden vorbereitet.'}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <SyncSummaryTile label="Erfolgreich" value={bulkUploadProgress.successfulUploads} />
              <SyncSummaryTile label="Fehlgeschlagen" value={bulkUploadProgress.failedUploads} />
            </div>
          </div>
        ) : null}

        {bulkUploadSummary ? (
          <div className="rounded-lg border border-petal-100 bg-white p-3">
            <h4 className="text-sm font-bold text-cocoa-900">Upload-Zusammenfassung</h4>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <SyncSummaryTile label="Ausstehend" value={bulkUploadSummary.totalPendingRecipes} />
              <SyncSummaryTile label="Hochgeladen" value={bulkUploadSummary.successfulUploads} />
              <SyncSummaryTile label="Fehlgeschlagen" value={bulkUploadSummary.failedUploads} />
            </div>
            {bulkUploadSummary.results.length > 0 ? (
              <div className="mt-3 flex max-h-52 flex-col gap-2 overflow-y-auto pr-1">
                {bulkUploadSummary.results.slice(0, 20).map((result) => (
                  <div key={result.recipeId} className="rounded-lg bg-petal-50 px-3 py-2">
                    <p className="truncate text-sm font-bold text-cocoa-900">{result.title}</p>
                    <p className="mt-1 text-xs font-semibold text-petal-700">
                      {result.status === 'success'
                        ? `${result.imageCount ?? 0} Bilder hochgeladen`
                        : result.errorMessage}
                    </p>
                  </div>
                ))}
                {bulkUploadSummary.results.length > 20 ? (
                  <p className="text-xs font-bold text-cocoa-700">
                    {bulkUploadSummary.results.length - 20} weitere Ergebnisse abgeschlossen.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-lg border border-petal-100 bg-white p-3">
          <h4 className="text-sm font-bold text-cocoa-900">Manueller Download</h4>
          <p className="mt-1 text-sm leading-6 text-cocoa-700">
            Liest deine Firebase-Rezeptdokumente einmalig und lädt nur fehlende lokale Bilder herunter. Nicht synchronisierte lokale Änderungen werden geschützt und als Konflikte markiert.
          </p>
          <button
            type="button"
            className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-petal-100 bg-white px-4 text-sm font-bold text-petal-700 shadow-soft transition hover:bg-petal-50 disabled:opacity-60"
            disabled={
              !isFirebaseConfigured ||
              !currentUser ||
              isAuthLoading ||
              isDownloadingFromCloud
            }
            onClick={() => void handleDownloadFromCloud()}
          >
            <Download
              aria-hidden="true"
              size={18}
              className={isDownloadingFromCloud ? 'animate-pulse' : ''}
            />
            {isDownloadingFromCloud ? 'Aus der Cloud herunterladen' : 'Aus der Cloud herunterladen'}
          </button>
        </div>

        {downloadProgress ? (
          <div className="rounded-lg border border-petal-100 bg-petal-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-bold text-cocoa-900">Download-Fortschritt</h4>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-petal-700">
                {downloadProgress.recipesProcessed} / {downloadProgress.cloudRecipesFound}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-petal-500 transition-all"
                style={{
                  width:
                    downloadProgress.cloudRecipesFound === 0
                      ? '100%'
                      : `${Math.round(
                          (downloadProgress.recipesProcessed /
                            downloadProgress.cloudRecipesFound) *
                            100,
                        )}%`,
                }}
              />
            </div>
            <p className="mt-3 text-sm font-semibold text-cocoa-700">
              {downloadProgress.currentRecipeTitle
                ? `${downloadProgress.currentRecipeTitle} wird geprüft`
                : downloadProgress.cloudRecipesFound === 0
                  ? 'Keine Cloud-Rezepte gefunden.'
                  : 'Cloud-Rezepte werden vorbereitet.'}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <SyncSummaryTile label="Verarbeitet" value={downloadProgress.recipesProcessed} />
              <SyncSummaryTile label="Hinzugefügt" value={downloadProgress.recipesAdded} />
              <SyncSummaryTile label="Aktualisiert" value={downloadProgress.recipesUpdated} />
              <SyncSummaryTile label="Übersprungen" value={downloadProgress.recipesSkipped} />
              <SyncSummaryTile label="Konflikte" value={downloadProgress.conflicts} />
              <SyncSummaryTile label="Bilder" value={downloadProgress.imagesDownloaded} />
              <SyncSummaryTile label="Fehler" value={downloadProgress.errors} />
            </div>
          </div>
        ) : null}

        {downloadSummary ? (
          <div className="rounded-lg border border-petal-100 bg-white p-3">
            <h4 className="text-sm font-bold text-cocoa-900">Download-Zusammenfassung</h4>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <SyncSummaryTile label="Cloud-Rezepte" value={downloadSummary.cloudRecipesFound} />
              <SyncSummaryTile label="Verarbeitet" value={downloadSummary.recipesProcessed} />
              <SyncSummaryTile label="Hinzugefügt" value={downloadSummary.recipesAdded} />
              <SyncSummaryTile label="Aktualisiert" value={downloadSummary.recipesUpdated} />
              <SyncSummaryTile label="Übersprungen" value={downloadSummary.recipesSkipped} />
              <SyncSummaryTile label="Konflikte" value={downloadSummary.conflicts} />
              <SyncSummaryTile label="Bilder" value={downloadSummary.imagesDownloaded} />
              <SyncSummaryTile label="Fehler" value={downloadSummary.errors} />
            </div>
            {downloadSummary.imageErrors.length > 0 ? (
              <div className="mt-3 rounded-lg border border-petal-100 bg-petal-50 p-3">
                <h5 className="text-sm font-bold text-cocoa-900">Bild-Download-Fehler</h5>
                <p className="mt-1 text-xs font-semibold leading-5 text-cocoa-700">
                  Wenn hier Abruf- oder CORS-Fehler stehen, konfiguriere CORS für den Firebase-Storage-Bucket.
                </p>
                <div className="mt-2 flex max-h-40 flex-col gap-2 overflow-y-auto pr-1">
                  {downloadSummary.imageErrors.slice(0, 12).map((error) => (
                    <div key={`${error.recipeId}-${error.imageId}`} className="rounded-lg bg-white px-3 py-2">
                      <p className="truncate text-xs font-bold text-cocoa-900">{error.recipeTitle}</p>
                      <p className="mt-1 break-words text-xs font-semibold text-petal-700">
                        {error.imageId}: {error.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {downloadSummary.messages.length > 0 ? (
              <div className="mt-3 flex max-h-52 flex-col gap-2 overflow-y-auto pr-1">
                {downloadSummary.messages.slice(0, 20).map((item) => (
                  <div key={`${item.status}-${item.id}`} className="rounded-lg bg-petal-50 px-3 py-2">
                    <p className="truncate text-sm font-bold text-cocoa-900">{item.title}</p>
                    <p className="mt-1 text-xs font-semibold text-petal-700">
                      {formatDownloadMessageStatus(item.status)}: {item.message}
                    </p>
                  </div>
                ))}
                {downloadSummary.messages.length > 20 ? (
                  <p className="text-xs font-bold text-cocoa-700">
                    {downloadSummary.messages.length - 20} weitere Ergebnisse abgeschlossen.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {syncPlan ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2">
              <SyncSummaryTile label="Rezepte gesamt" value={syncPlan.totalRecipes} />
              <SyncSummaryTile label="Bilder gesamt" value={syncPlan.totalImages} />
              <SyncSummaryTile label="Rezepte ausstehend" value={syncPlan.recipesPendingSync} />
              <SyncSummaryTile label="Bilder ausstehend" value={syncPlan.imagesPendingSync} />
              <SyncSummaryTile label="Rezepte gelöscht" value={syncPlan.recipesMarkedDeleted} />
              <SyncSummaryTile label="Konflikte" value={syncPlan.recipesInConflict} />
              <SyncSummaryTile label="Upload-Größe" value={formatBytes(syncPlan.estimatedUploadSize)} />
            </div>

            <div className="rounded-lg border border-petal-100 bg-white p-3">
              <h4 className="text-sm font-bold text-cocoa-900">Warnungen</h4>
              <div className="mt-2 flex flex-col gap-2">
                {syncPlan.warnings.map((warning) => (
                  <p key={warning} className="rounded-lg bg-petal-50 px-3 py-2 text-xs font-bold text-petal-700">
                    {warning}
                  </p>
                ))}
              </div>
            </div>

            <SyncPlanList
              emptyLabel="Keine Rezepte müssen synchronisiert werden."
              items={syncPlan.recipePlan}
              title="Rezeptplan"
            />
            <SyncPlanList
              emptyLabel="Keine Bilder müssen synchronisiert werden."
              items={syncPlan.imagePlan}
              title="Bildplan"
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
            <h3 className="text-base font-bold">Lokales Backup</h3>
            <p className="mt-1 text-sm leading-6 text-cocoa-700">
              Backups sind JSON-Dateien mit Rezeptdaten und Bilddaten.
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
          Backup exportieren
        </button>

        <button
          type="button"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-petal-100 bg-white px-4 text-sm font-bold text-petal-700 shadow-soft transition hover:bg-petal-50 disabled:opacity-60"
          disabled={isBusy}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload aria-hidden="true" size={18} />
          Backup importieren
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
            <h3 className="text-base font-bold">Archiv</h3>
            <p className="mt-1 text-sm leading-6 text-cocoa-700">
              Stelle gelöschte Rezepte wieder her oder entferne sie dauerhaft von diesem Gerät.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-petal-100 bg-white px-4 text-sm font-bold text-petal-700 shadow-soft transition hover:bg-petal-50"
          onClick={onOpenArchive}
        >
          <Archive aria-hidden="true" size={18} />
          Archiv öffnen
        </button>
      </Card>

      <Card className="border-petal-200 bg-petal-50">
        <h3 className="text-base font-bold">Lokale Datenbank löschen</h3>
        <p className="mt-1 text-sm leading-6 text-cocoa-700">
          Entfernt alle Rezepte und gespeicherten Bilder aus IndexedDB auf diesem Gerät.
        </p>
        <button
          type="button"
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-bold text-petal-700 shadow-soft transition hover:bg-petal-100 disabled:opacity-60"
          disabled={isBusy}
          onClick={() => void handleClearDatabase()}
        >
          <Trash2 aria-hidden="true" size={18} />
          Lokale Datenbank löschen
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
                {item.reason} - {formatSyncStatus(item.syncStatus)}
              </p>
            </div>
          ))}
          {items.length > 20 ? (
            <p className="text-xs font-bold text-cocoa-700">
              {items.length - 20} weitere Einträge sind im Plan enthalten.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
