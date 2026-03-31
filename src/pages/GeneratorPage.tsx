import React, { useState, useCallback } from 'react';
import { generatePassword, calculateStrength } from '@/crypto/vault-crypto';
import { useVaultStore } from '@/store/vault.store';
import { Sidebar } from '@/components/Sidebar';
import { Toggle } from '@/components/ui/Toggle';
import type { PasswordOptions } from '@/types';

const DEFAULT_OPTIONS: PasswordOptions = {
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
};

const LABEL_MAP: Record<string, string> = {
  'very-weak': 'Very Weak',
  'weak': 'Weak',
  'fair': 'Fair',
  'strong': 'Strong',
  'very-strong': 'Strong Entropy',
};

export const GeneratorPage: React.FC = () => {
  const pushNotification = useVaultStore((s) => s.pushNotification);

  const [options, setOptions] = useState<PasswordOptions>(DEFAULT_OPTIONS);
  const [password, setPassword] = useState<string>(() => generatePassword(DEFAULT_OPTIONS));

  const regenerate = useCallback(() => {
    setPassword(generatePassword(options));
  }, [options]);

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password);
      pushNotification('Password copied to clipboard. Clears in 30s.', 'success');
      setTimeout(async () => {
        try {
          const v = await navigator.clipboard.readText();
          if (v === password) await navigator.clipboard.writeText('');
        } catch { /* ignore */ }
      }, 30_000);
    } catch {
      pushNotification('Failed to copy.', 'error');
    }
  };

  const updateOption = <K extends keyof PasswordOptions>(key: K, value: PasswordOptions[K]) => {
    setOptions((prev) => {
      const next = { ...prev, [key]: value };
      setPassword(generatePassword(next));
      return next;
    });
  };

  const strength = calculateStrength(password);

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col items-center p-8 overflow-y-auto">
        {/* Page header */}
        <div className="w-full max-w-[560px] mb-6" />

        <div className="max-w-[560px] w-full space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold">Password Generator</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
              Create strong, unique passwords to keep your accounts secure.
            </p>
          </div>

          {/* Password Display */}
          <div className="bg-primary rounded-2xl p-6 shadow-xl shadow-primary/20 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <span className="material-symbols-outlined text-[12rem] absolute -right-8 -bottom-8 text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
                lock
              </span>
            </div>
            <p className="font-mono font-bold text-2xl text-white break-all leading-tight mb-3">
              {password}
            </p>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${strength.pct}%`, backgroundColor: 'white' }}
                />
              </div>
              <span className="text-xs font-bold text-white/80 uppercase tracking-wider whitespace-nowrap">
                {LABEL_MAP[strength.label]}
              </span>
            </div>
            <button
              onClick={copyPassword}
              className="mt-4 flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-base">content_copy</span>
              Copy
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={regenerate}
              className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-slate-200 dark:bg-primary/20 text-slate-900 dark:text-white font-bold hover:bg-slate-300 dark:hover:bg-primary/30 transition-all"
            >
              <span className="material-symbols-outlined text-xl">refresh</span>
              Regenerate
            </button>
            <button
              onClick={copyPassword}
              className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined text-xl">content_copy</span>
              Copy Password
            </button>
          </div>

          {/* Parameters */}
          <div className="bg-white dark:bg-primary/5 rounded-2xl p-6 border border-slate-200 dark:border-primary/10 space-y-6">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Parameters</h3>
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold">
                  Length: {options.length}
                </span>
              </div>
              <div className="space-y-3">
                <input
                  type="range"
                  min={8}
                  max={64}
                  value={options.length}
                  onChange={(e) => updateOption('length', Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-400 font-medium">
                  <span>8</span>
                  <span>32</span>
                  <span>64</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Toggle
                label="Uppercase"
                icon="uppercase"
                checked={options.uppercase}
                onChange={(v) => updateOption('uppercase', v)}
              />
              <Toggle
                label="Lowercase"
                icon="lowercase"
                checked={options.lowercase}
                onChange={(v) => updateOption('lowercase', v)}
              />
              <Toggle
                label="Numbers"
                icon="123"
                checked={options.numbers}
                onChange={(v) => updateOption('numbers', v)}
              />
              <Toggle
                label="Symbols"
                icon="alternate_email"
                checked={options.symbols}
                onChange={(v) => updateOption('symbols', v)}
              />
            </div>
          </div>

          {/* Pro Tip */}
          <div className="bg-primary/10 rounded-xl p-4 flex gap-4 items-start border border-primary/20">
            <span className="material-symbols-outlined text-primary">info</span>
            <div>
              <p className="text-sm font-semibold text-primary">Pro Tip</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Unique passwords for every account significantly increase your digital security.
                Avoid common words or birthdays.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
