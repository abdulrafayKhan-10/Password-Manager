import React, { useState, useEffect, useCallback } from 'react';
import { useVaultStore } from '@/store/vault.store';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export const UnlockPage: React.FC = () => {
  const unlockVault = useVaultStore((s) => s.unlockVault);
  const purgeVault = useVaultStore((s) => s.purgeVault);
  const pushNotification = useVaultStore((s) => s.pushNotification);
  const loading = useVaultStore((s) => s.loading);
  const error = useVaultStore((s) => s.error);

  const [password, setPassword] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<'forgot' | 'switch' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    await unlockVault(password);
    // Clear password field regardless of success (don't keep it in DOM)
    setPassword('');
  };

  // ESC clears the password field (or closes confirm dialog if open)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (confirmDialog) {
        setConfirmDialog(null);
      } else {
        setPassword('');
      }
    }
  }, [confirmDialog]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleConfirmReset = async () => {
    await purgeVault();
    if (confirmDialog === 'forgot') {
      pushNotification('Vault deleted. Please create a new vault.', 'info');
    } else {
      pushNotification('Account cleared. Set up a new vault to continue.', 'info');
    }
    setConfirmDialog(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <main className="relative z-10 w-full max-w-[440px] px-6">
        <div className="flex flex-col items-center mb-12">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-primary/30">
            <span
              className="material-symbols-outlined text-white text-4xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              shield_lock
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Vault Locked</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
            Enter your master password to continue
          </p>
        </div>

        <div className="bg-white/5 dark:bg-primary/5 backdrop-blur-sm p-1 rounded-2xl border border-primary/10 shadow-2xl">
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-[#1c162e] rounded-[14px] p-6 space-y-5"
          >
            <Input
              icon="key"
              type="password"
              passwordToggle
              placeholder="Master Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={error ?? undefined}
              autoFocus
              aria-label="Master password"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
              icon="arrow_forward"
            >
              Unlock Vault
            </Button>
          </form>
        </div>

        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="flex gap-6 mt-2">
            <button
              onClick={() => setConfirmDialog('forgot')}
              className="text-xs text-slate-400 dark:text-slate-500 hover:text-primary transition-colors"
            >
              Forgot Password?
            </button>
            <button
              onClick={() => setConfirmDialog('switch')}
              className="text-xs text-slate-400 dark:text-slate-500 hover:text-primary transition-colors"
            >
              Switch Account
            </button>
          </div>
        </div>
      </main>

      {/* ESC hint */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-primary/10 border border-slate-200 dark:border-primary/20">
          <span className="text-[10px] font-bold text-slate-400 dark:text-primary/60 bg-white dark:bg-background-dark px-1.5 py-0.5 rounded border border-slate-200 dark:border-primary/20">
            ESC
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">to clear field</span>
        </div>
      </div>

      {/* Confirm reset dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 bg-white dark:bg-[#1c162e] rounded-2xl shadow-2xl border border-slate-200 dark:border-primary/20 p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/15 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-red-500 text-xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}>
                  warning
                </span>
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                  {confirmDialog === 'forgot' ? 'Reset Vault?' : 'Switch Account?'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              {confirmDialog === 'forgot'
                ? 'Since the vault is zero-knowledge encrypted, forgotten passwords cannot be recovered. This will permanently delete your vault so you can create a new one.'
                : 'This will permanently delete the current vault. You can then create a new vault with different credentials.'}
            </p>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border border-slate-200 dark:border-primary/20 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-primary/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
              >
                Delete & Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
