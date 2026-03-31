import React, { useState, useEffect } from 'react';
import { useVaultStore } from '@/store/vault.store';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { StrengthMeter } from '@/components/StrengthMeter';
import { generatePassword } from '@/crypto/vault-crypto';
import type { Credential, NewCredential } from '@/types';

interface AddEditCredentialModalProps {
  open: boolean;
  onClose: () => void;
  /** When provided, modal is in edit mode */
  credential?: Credential;
}

const DEFAULT_OPTIONS = {
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
};

export const AddEditCredentialModal: React.FC<AddEditCredentialModalProps> = ({
  open,
  onClose,
  credential,
}) => {
  const addCredential = useVaultStore((s) => s.addCredential);
  const updateCredential = useVaultStore((s) => s.updateCredential);
  const loading = useVaultStore((s) => s.loading);
  const categories = useVaultStore((s) => s.categories);

  const isEdit = Boolean(credential);

  const [form, setForm] = useState({
    title: '',
    website: '',
    username: '',
    password: '',
    notes: '',
    tags: '',
    category: 'Login',
  });
  const [error, setError] = useState('');

  // Populate form when editing
  useEffect(() => {
    if (credential) {
      setForm({
        title: credential.title,
        website: credential.website,
        username: credential.username,
        password: credential.password,
        notes: credential.notes,
        tags: credential.tags.join(', '),
        category: credential.category ?? 'Login',
      });
    } else {
      setForm({ title: '', website: '', username: '', password: '', notes: '', tags: '', category: 'Login' });
    }
    setError('');
  }, [credential, open]);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleGeneratePassword = () => {
    setForm((prev) => ({ ...prev, password: generatePassword(DEFAULT_OPTIONS) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.website && !form.title) {
      setError('Please provide a website or title.');
      return;
    }
    if (!form.username) {
      setError('Username / Email is required.');
      return;
    }
    if (!form.password) {
      setError('Password is required.');
      return;
    }

    const tags = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const data: NewCredential = {
      title: form.title || new URL(form.website.startsWith('http') ? form.website : `https://${form.website}`).hostname,
      website: form.website,
      username: form.username,
      password: form.password,
      notes: form.notes,
      tags,
      category: form.category,
    };

    try {
      if (isEdit && credential) {
        await updateCredential(credential.id, data);
      } else {
        await addCredential(data);
      }
      onClose();
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Entry' : 'Add New Password'}
      subtitle={isEdit ? 'Update your credentials' : 'Securely store your credentials'}
      icon="shield_lock"
    >
      <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Category</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl pointer-events-none z-10">category</span>
              <select
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#251d3d] border border-slate-200 dark:border-primary/20 rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all text-slate-900 dark:text-slate-100 text-sm appearance-none cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-lg">expand_more</span>
            </div>
          </div>

          {/* Title */}
          <Input
            label="Title (optional)"
            icon="label"
            placeholder="e.g. GitHub"
            value={form.title}
            onChange={set('title')}
          />

          {/* Website */}
          <Input
            label="Website URL"
            icon="public"
            placeholder="https://example.com"
            value={form.website}
            onChange={set('website')}
          />

          {/* Username */}
          <Input
            label="Username / Email"
            icon="person"
            placeholder="johndoe@email.com"
            value={form.username}
            onChange={set('username')}
          />

          {/* Password */}
          <Input
            label="Password"
            icon="key"
            type="password"
            passwordToggle
            placeholder="••••••••••••"
            value={form.password}
            onChange={set('password')}
            actionIcon="magic_button"
            onActionClick={handleGeneratePassword}
            actionTitle="Generate secure password"
          />
          {form.password && <StrengthMeter password={form.password} />}

          {/* Tags */}
          <Input
            label="Tags"
            icon="label"
            placeholder="Work, Social, Personal..."
            value={form.tags}
            onChange={set('tags')}
          />

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
              Notes (Optional)
            </label>
            <textarea
              className="w-full px-4 py-3 bg-white dark:bg-[#251d3d] border border-slate-200 dark:border-primary/20 rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none text-sm"
              placeholder="Security questions, recovery codes, or hints..."
              rows={3}
              value={form.notes}
              onChange={set('notes')}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        {/* Footer — always visible at bottom */}
        <footer className="flex items-center justify-end gap-3 px-6 py-5 bg-slate-100 dark:bg-primary/5 border-t border-slate-200 dark:border-primary/10 shrink-0">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading} icon="save">
            {isEdit ? 'Save Changes' : 'Save Password'}
          </Button>
        </footer>
      </form>
    </Modal>
  );
};
