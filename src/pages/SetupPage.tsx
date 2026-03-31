/**
 * SetupPage.tsx
 *
 * First-run screen: lets the user create a master password for their new vault.
 * The master password is NEVER stored — only the salt (random bytes) is persisted.
 */

import React, { useState } from 'react';
import { useVaultStore } from '@/store/vault.store';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { StrengthMeter } from '@/components/StrengthMeter';

export const SetupPage: React.FC = () => {
  const setupVault = useVaultStore((s) => s.setupVault);
  const loading = useVaultStore((s) => s.loading);
  const error = useVaultStore((s) => s.error);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (password.length < 8) {
      setValidationError('Master password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setValidationError('Passwords do not match.');
      return;
    }

    await setupVault(password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark p-6">
      {/* Ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <main className="relative z-10 w-full max-w-[440px]">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-primary/30">
            <span className="material-symbols-outlined text-white text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              shield_lock
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Create Your Vault</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm text-center">
            Your master password encrypts all your data. It is never stored — if you lose it, your data cannot be recovered.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-[#1c162e] rounded-2xl border border-slate-200 dark:border-primary/20 p-6 space-y-5 shadow-2xl"
        >
          <Input
            label="Master Password"
            icon="lock"
            type="password"
            passwordToggle
            placeholder="Choose a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {password && <StrengthMeter password={password} />}

          <Input
            label="Confirm Password"
            icon="lock"
            type="password"
            passwordToggle
            placeholder="Repeat your password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          {(validationError || error) && (
            <p className="text-sm text-red-500">{validationError || error}</p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full"
            icon="rocket_launch"
          >
            Create Vault
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
          All data is encrypted locally. Nothing is sent to any server.
        </p>
      </main>
    </div>
  );
};
