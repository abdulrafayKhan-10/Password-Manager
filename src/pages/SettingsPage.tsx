import React, { useState, useEffect } from 'react';
import { useVaultStore } from '@/store/vault.store';
import { invoke } from '@tauri-apps/api/core';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { CategoryModal } from '@/components/modals/CategoryModal';
import type { Category } from '@/types';

const AUTO_LOCK_OPTIONS: { label: string; value: 0 | 1 | 5 | 15 | 30 }[] = [
  { label: 'After 1 minute', value: 1 },
  { label: 'After 5 minutes', value: 5 },
  { label: 'After 15 minutes', value: 15 },
  { label: 'After 30 minutes', value: 30 },
  { label: 'Never (Not Recommended)', value: 0 },
];

export const SettingsPage: React.FC = () => {
  const settings = useVaultStore((s) => s.settings);
  const updateSettings = useVaultStore((s) => s.updateSettings);
  const exportVault = useVaultStore((s) => s.exportVault);
  const importCredentials = useVaultStore((s) => s.importCredentials);
  const purgeVault = useVaultStore((s) => s.purgeVault);
  const pushNotification = useVaultStore((s) => s.pushNotification);

  const categories = useVaultStore((s) => s.categories);
  const addCategory = useVaultStore((s) => s.addCategory);
  const updateCategory = useVaultStore((s) => s.updateCategory);
  const deleteCategory = useVaultStore((s) => s.deleteCategory);

  const [catModal, setCatModal] = useState<{ open: boolean; editing: Category | null }>({
    open: false,
    editing: null,
  });

  const handleCatSave = async (name: string, icon: string) => {
    if (catModal.editing) {
      await updateCategory(catModal.editing.id, name, icon);
      pushNotification('Category updated.', 'success');
    } else {
      addCategory(name, icon);
      pushNotification('Category created.', 'success');
    }
    setCatModal({ open: false, editing: null });
  };

  const handleDeleteCategory = (id: string) => {
    if (categories.length <= 1) {
      pushNotification('You must keep at least one category.', 'error');
      return;
    }
    deleteCategory(id);
    pushNotification('Category deleted.', 'info');
  };

  // ── Extension / native host registration ─────────────────────────────────────
  const [extensionId, setExtensionId] = useState('');
  const [registeringHost, setRegisteringHost] = useState(false);
  const [registerResult, setRegisterResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [vaultPath, setVaultPath] = useState('');

  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window)) return;
    import('@tauri-apps/api/core').then(({ invoke }) => {
      invoke<string>('get_vault_path').then(setVaultPath).catch(() => {});
    });
  }, []);

  const handleRegisterNativeHost = async () => {
    if (!('__TAURI_INTERNALS__' in window)) {
      pushNotification('This feature requires the desktop app.', 'error');
      return;
    }
    setRegisteringHost(true);
    setRegisterResult(null);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke<string>('register_native_host', { extensionId });
      setRegisterResult({ ok: true, message: 'Registered! Now reload the extension on chrome://extensions, then unlock your vault.' });
      pushNotification('Native host registered successfully!', 'success');
    } catch (e) {
      setRegisterResult({ ok: false, message: String(e) });
      pushNotification('Registration failed. See details below.', 'error');
    } finally {
      setRegisteringHost(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    const content = await exportVault(format);
    const mime = format === 'json' ? 'application/json' : 'text/csv';
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vault-export-${new Date().toISOString().slice(0, 10)}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    pushNotification(`Vault exported as ${format.toUpperCase()}.`, 'success');
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      await importCredentials(text);
    };
    input.click();
  };

  const handlePurge = async () => {
    const confirmed = window.confirm(
      'Are you sure? This will permanently delete your vault and ALL stored credentials. This cannot be undone.'
    );
    if (!confirmed) return;
    await purgeVault();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100">
      <Sidebar />

      {/* Main settings content */}
      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background-dark/50 p-6 lg:p-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-10">
            <h1 className="text-3xl font-bold mb-2">General Settings</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Configure your personal preferences and security timeouts for your vault.
            </p>
          </div>

          <div className="space-y-6">
            {/* Appearance */}
            <section className="bg-white dark:bg-background-dark border border-slate-200 dark:border-primary/10 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Appearance</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    Toggle between light and dark visual modes
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {settings.theme === 'dark' ? 'Dark' : 'Light'}
                  </span>
                  <label className="relative flex h-8 w-14 cursor-pointer items-center rounded-full bg-slate-200 dark:bg-primary/20 p-1 has-[:checked]:bg-primary transition-colors">
                    <input
                      className="sr-only peer"
                      type="checkbox"
                      checked={settings.theme === 'dark'}
                      onChange={(e) => updateSettings({ theme: e.target.checked ? 'dark' : 'light' })}
                    />
                    <div className="h-6 w-6 rounded-full bg-white shadow-md transition-transform peer-checked:translate-x-6" />
                  </label>
                </div>
              </div>
            </section>

            {/* Auto-lock */}
            <section className="bg-white dark:bg-background-dark border border-slate-200 dark:border-primary/10 rounded-2xl p-6 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div>
                  <h3 className="text-lg font-semibold">Auto-lock Vault</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    Automatically lock after inactivity.
                  </p>
                </div>
                <select
                  value={settings.autoLockTimeout}
                  onChange={(e) =>
                    updateSettings({ autoLockTimeout: Number(e.target.value) as 0 | 1 | 5 | 15 | 30 })
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-primary/20 bg-slate-50 dark:bg-background-dark text-slate-900 dark:text-slate-100 px-4 py-3 text-sm focus:border-primary focus:ring-primary outline-none appearance-none cursor-pointer"
                >
                  {AUTO_LOCK_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            {/* Categories */}
            <div className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">Categories</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    Organize passwords into groups. Edit icons, rename, or delete any category.
                  </p>
                </div>
                <Button variant="primary" size="sm" icon="add" onClick={() => setCatModal({ open: true, editing: null })}>
                  Add
                </Button>
              </div>
              <div className="bg-white dark:bg-background-dark border border-slate-200 dark:border-primary/10 rounded-2xl overflow-hidden shadow-sm">
                {categories.map((cat, i) => (
                  <div
                    key={cat.id}
                    className={`flex items-center gap-4 px-5 py-3.5 ${
                      i < categories.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <span className="material-symbols-outlined text-lg">{cat.icon}</span>
                    </div>
                    <span className="flex-1 font-medium text-sm">{cat.name}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setCatModal({ open: true, editing: cat })}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-400 transition-colors"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Browser Extension */}
            <div className="pt-4">
              <div className="mb-4">
                <h2 className="text-xl font-bold">Browser Extension</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                  Connect the Chrome / Edge / Brave extension for one-click autofill.
                </p>
              </div>
              <div className="bg-white dark:bg-background-dark border border-slate-200 dark:border-primary/10 rounded-2xl p-6 shadow-sm space-y-5">
                {/* Step list */}
                <ol className="space-y-2.5">
                  {[
                    <>Build the extension: open a terminal in <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">extension/</code> and run <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">npm run build</code></>,
                    <>In Chrome go to <span className="text-primary font-medium">chrome://extensions</span> → Enable Developer mode → Load unpacked → select <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">extension/dist</code></>,
                    'Copy the Extension ID shown on that page and paste it below',
                    'Click Register, then reload the extension in the browser',
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3 items-start text-sm text-slate-600 dark:text-slate-300">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>

                {/* Extension ID input + register */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1.5">Extension ID</label>
                    <input
                      value={extensionId}
                      onChange={(e) => { setExtensionId(e.target.value.trim()); setRegisterResult(null); }}
                      placeholder="e.g. abcdefghijklmnopqrstuvwxyz123456"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-primary/20 bg-slate-50 dark:bg-background-dark text-slate-900 dark:text-slate-100 text-sm outline-none focus:border-primary transition-colors font-mono"
                    />
                  </div>
                  <Button
                    variant="primary"
                    icon="link"
                    loading={registeringHost}
                    disabled={extensionId.length < 20}
                    onClick={handleRegisterNativeHost}
                  >
                    Register
                  </Button>
                </div>

                {registerResult && (
                  <p className={`text-xs px-3 py-2 rounded-lg leading-relaxed ${
                    registerResult.ok
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                  }`}>
                    {registerResult.ok ? '✓ ' : '✗ '}{registerResult.message}
                  </p>
                )}
              </div>
            </div>

            {/* Auto Backup */}
            <div className="pt-4">
              <div className="mb-4">
                <h2 className="text-xl font-bold">Auto Backup</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                  Automatically copy <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">vault-backup.json</code> to a folder of your choice after every save.
                </p>
              </div>
              <div className="bg-white dark:bg-background-dark border border-slate-200 dark:border-primary/10 rounded-2xl p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Enable auto-backup</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Runs silently in the background after each credential change.
                    </p>
                  </div>
                  <Toggle
                    checked={settings.autoBackupEnabled}
                    onChange={(v) => updateSettings({ autoBackupEnabled: v })}
                  />
                </div>

                {settings.autoBackupEnabled && (
                  <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1.5">
                        Backup folder path
                      </label>
                      <input
                        value={settings.autoBackupPath}
                        onChange={(e) => updateSettings({ autoBackupPath: e.target.value })}
                        placeholder="e.g. C:\Users\you\OneDrive\Backups"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-primary/20 bg-slate-50 dark:bg-background-dark text-slate-900 dark:text-slate-100 text-sm outline-none focus:border-primary transition-colors font-mono"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        The folder must be accessible on this device (local disk, cloud-synced folder, etc.).
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      icon="cloud_upload"
                      disabled={!settings.autoBackupPath.trim()}
                      onClick={async () => {
                        try {
                          await invoke('backup_vault', { backupPath: settings.autoBackupPath });
                          pushNotification('Vault backed up successfully!', 'success');
                        } catch (e) {
                          pushNotification('Backup failed: ' + String(e), 'error');
                        }
                      }}
                    >
                      Backup Now
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Data & Portability */}
            <div className="pt-4">
              <h2 className="text-xl font-bold mb-4">Data &amp; Portability</h2>

              {/* Backup warning */}
              <div className="mb-5 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 flex gap-3">
                <span
                  className="material-symbols-outlined text-amber-500 shrink-0 mt-0.5"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >warning</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Back up your vault regularly</p>
                  <p className="text-xs text-amber-600/70 dark:text-amber-400/60 mt-0.5 leading-relaxed">
                    Your vault exists only on this device. If this machine is lost or damaged, your passwords
                    cannot be recovered without a backup. Export a copy and store it somewhere safe (cloud storage, USB, etc.).
                  </p>
                  {vaultPath && (
                    <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">Vault file:</span>
                      <code className="text-[11px] bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded font-mono max-w-sm truncate">
                        {vaultPath}
                      </code>
                      <button
                        onClick={() => { navigator.clipboard.writeText(vaultPath); pushNotification('Path copied!', 'info'); }}
                        className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors"
                        title="Copy path"
                      >
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Export */}
                <div className="bg-white dark:bg-background-dark border border-slate-200 dark:border-primary/10 rounded-2xl p-6 shadow-sm">
                  <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                    <span className="material-symbols-outlined">ios_share</span>
                  </div>
                  <h3 className="font-semibold mb-1">Export Vault</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">
                    Download your passwords as a secure file for backup.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button variant="ghost" onClick={() => handleExport('json')} className="w-full border border-primary text-primary hover:bg-primary hover:text-white">
                      Export as JSON
                    </Button>
                    <Button variant="secondary" onClick={() => handleExport('csv')} className="w-full">
                      Export as CSV
                    </Button>
                  </div>
                </div>

                {/* Import */}
                <div className="bg-white dark:bg-background-dark border border-slate-200 dark:border-primary/10 rounded-2xl p-6 shadow-sm">
                  <div className="size-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4">
                    <span className="material-symbols-outlined">publish</span>
                  </div>
                  <h3 className="font-semibold mb-1">Import Passwords</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">
                    Import a JSON vault export from this app or a compatible password manager.
                  </p>
                  <Button
                    onClick={handleImport}
                    className="w-full bg-emerald-500 text-white hover:bg-emerald-600"
                  >
                    Import File
                  </Button>
                </div>
              </div>
            </div>

            {/* Danger zone */}
            <div className="pt-4">
              <div className="bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/20 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-red-600 dark:text-red-400 font-bold">Purge All Data</h3>
                    <p className="text-red-500/70 dark:text-red-400/60 text-sm">
                      Permanently delete all stored credentials and account data.
                    </p>
                  </div>
                  <Button variant="danger" onClick={handlePurge}>
                    Delete Vault
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <CategoryModal
        open={catModal.open}
        onClose={() => setCatModal({ open: false, editing: null })}
        onSave={handleCatSave}
        initial={catModal.editing ?? undefined}
      />
    </div>
  );
};
