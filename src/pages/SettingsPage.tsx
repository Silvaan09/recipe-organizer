import { ArrowLeft, Database, Download, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

import { clearLocalDatabase } from '../db';
import { downloadBackupFile, restoreBackup, validateBackupFile } from '../services/backup';
import { Card } from '../components/ui/Card';
import { logAndReturnMessage } from '../utils/errors';

type SettingsPageProps = {
  onClose: () => void;
};

type SettingsStatus = {
  tone: 'success' | 'error';
  message: string;
};

export function SettingsPage({ onClose }: SettingsPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<SettingsStatus>();
  const [isBusy, setIsBusy] = useState(false);

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
