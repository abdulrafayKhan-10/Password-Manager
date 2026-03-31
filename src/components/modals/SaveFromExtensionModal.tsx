import React, { useState, useEffect } from 'react';
import { useVaultStore } from '@/store/vault.store';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { StrengthMeter } from '@/components/StrengthMeter';
import type { PendingCredential } from '@/types';

interface SaveFromExtensionModalProps {
  pending: PendingCredential;
  onClose: () => void;
}

export const SaveFromExtensionModal: React.FC<SaveFromExtensionModalProps> = ({
  pending,
  onClose,
}) => {
  const addCredential = useVaultStore((s) => s.addCredential);
  const clearPendingCredential = useVaultStore((s) => s.clearPendingCredential);
  const categories = useVaultStore((s) => s.categories);
  const loading = useVaultStore((s) => s.loading);

  const [form, setForm] = useState({
    title: '',
    website: '',
    username: '',
    password: '',
    category: 'Login',
  });
  const [error, setError] = useState('');

  // Pre-fill from the pending credential whenever it changes
  useEffect(() => {
    setForm({
      title: pending.title || new URL(pending.origin || 'https://unknown').hostname,
      website: pending.origin || '',
      username: pending.username || '',
      password: pending.password || '',
      category: categories[0]?.name ?? 'Login',
    });
    setError('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  const update = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleDismiss = () => {
    clearPendingCredential();
    onClose();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!form.password.trim()) {
      setError('Password is required.');
      return;
    }

    await addCredential({
      title: form.title.trim(),
      website: form.website.trim(),
      username: form.username.trim(),
      password: form.password.trim(),
      notes: '',
      tags: [],
      category: form.category,
    });

    clearPendingCredential();
    onClose();
  };

  return (
    <Modal
      open
      onClose={handleDismiss}
      title="Save credential from extension"
    >
      {/* Origin banner */}
      <div className="mb-4 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
        <span className="material-symbols-rounded text-base">public</span>
        <span className="truncate font-medium">{pending.origin || 'Unknown origin'}</span>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-3">
        <Input
          label="Title"
          value={form.title}
          onChange={update('title')}
          placeholder="e.g. GitHub"
          required
        />

        <Input
          label="Website"
          value={form.website}
          onChange={update('website') as React.ChangeEventHandler<HTMLInputElement>}
          placeholder="https://github.com"
        />

        <Input
          label="Username / Email"
          value={form.username}
          onChange={update('username')}
          placeholder="you@example.com"
          autoComplete="off"
        />

        <div className="flex flex-col gap-1">
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={update('password')}
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />
          <StrengthMeter password={form.password} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-text-secondary">Category</label>
          <select
            value={form.category}
            onChange={update('category')}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary
                       focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
        )}

        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleDismiss}>
            Dismiss
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving…' : 'Save to vault'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
