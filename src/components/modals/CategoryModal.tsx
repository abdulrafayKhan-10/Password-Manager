import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Category } from '@/types';

const ICON_OPTIONS = [
  'key', 'lock', 'shield', 'mail', 'credit_card', 'people', 'work',
  'shopping_bag', 'sports_esports', 'folder', 'home', 'star', 'favorite',
  'cloud', 'code', 'laptop', 'phone_iphone', 'school', 'local_hospital',
  'account_balance', 'flight', 'restaurant', 'music_note', 'movie',
  'fitness_center', 'directions_car', 'pets', 'travel_explore',
  'security', 'vpn_key', 'verified_user', 'admin_panel_settings', 'person',
  'group', 'business', 'store', 'inventory_2', 'savings', 'receipt_long',
  'newspaper', 'book', 'camera', 'public', 'wifi', 'smart_toy',
  'medical_services', 'attach_money', 'sports', 'nature',
];

interface CategoryModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, icon: string) => void;
  initial?: Category;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({ open, onClose, onSave, initial }) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('folder');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setIcon(initial?.icon ?? 'folder');
      setError('');
    }
  }, [open, initial]);

  const handleSave = () => {
    if (!name.trim()) {
      setError('Category name is required.');
      return;
    }
    onSave(name.trim(), icon);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Edit Category' : 'New Category'}
      subtitle={initial ? 'Update the name and icon' : 'Create a custom category'}
      icon="category"
      maxWidth="max-w-[480px]"
    >
      <div className="p-6 space-y-5 overflow-y-auto">
        {/* Live Preview */}
        <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
          <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center text-primary shrink-0">
            <span className="material-symbols-outlined text-2xl">{icon}</span>
          </div>
          <div>
            <p className="font-semibold text-sm">{name || 'Category Name'}</p>
            <p className="text-xs text-slate-500">Live preview</p>
          </div>
        </div>

        {/* Name */}
        <Input
          label="Category Name"
          icon="label"
          placeholder="e.g. Finance, Health, Travel..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        {/* Icon picker */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
            Choose Icon
          </label>
          <div className="grid grid-cols-8 gap-1.5 max-h-[160px] overflow-y-auto p-2 rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700">
            {ICON_OPTIONS.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setIcon(ic)}
                title={ic.replace(/_/g, ' ')}
                className={`p-2 rounded-lg flex items-center justify-center transition-colors ${
                  icon === ic
                    ? 'bg-primary text-white shadow-md'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-primary/10 hover:text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-xl">{ic}</span>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      <footer className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-100 dark:bg-primary/5 border-t border-slate-200 dark:border-primary/10 shrink-0">
        <Button variant="ghost" onClick={onClose} type="button">
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} icon="check" type="button">
          {initial ? 'Save Changes' : 'Create Category'}
        </Button>
      </footer>
    </Modal>
  );
};
