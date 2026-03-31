import React from 'react';
import { useVaultStore } from '@/store/vault.store';
import { formatDistanceToNow as _formatDistanceToNow } from '@/lib/time';
import { cn } from '@/lib/cn';
import type { Credential } from '@/types';

interface CredentialRowProps {
  credential: Credential;
  selected: boolean;
  onSelect: () => void;
}

export const CredentialRow: React.FC<CredentialRowProps> = ({
  credential,
  selected,
  onSelect,
}) => {
  // Derive favicon URL from website
  const favicon = credential.website
    ? `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(credential.website)}`
    : null;

  const initials = (credential.title || credential.website)
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      onClick={onSelect}
      className={cn(
        'flex items-center gap-4 px-6 py-4 cursor-pointer transition-colors border-l-2',
        selected
          ? 'border-primary bg-primary/5 dark:bg-primary/5'
          : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/30'
      )}
    >
      {/* Icon */}
      <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0 overflow-hidden">
        {favicon ? (
          <img
            src={favicon}
            alt=""
            className="w-6 h-6"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <span className="text-xs font-bold text-slate-500">{initials}</span>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold truncate">{credential.title || credential.website}</p>
          <p className="text-xs text-slate-500 shrink-0 ml-2">
            {formatDistanceToNow(credential.updatedAt)}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-slate-500 truncate">{credential.username}</p>
          {credential.category && (
            <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              {credential.category}
            </span>
          )}
        </div>
      </div>

      {credential.favorite && (
        <span className="material-symbols-outlined text-base text-yellow-500 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
          star
        </span>
      )}
    </div>
  );
};

// ── Credential Detail Panel ────────────────────────────────────────────────────

interface CredentialDetailProps {
  credential: Credential;
}

export const CredentialDetail: React.FC<CredentialDetailProps> = ({ credential }) => {
  const toggleFavorite = useVaultStore((s) => s.toggleFavorite);
  const deleteCredential = useVaultStore((s) => s.deleteCredential);
  const hardDeleteCredential = useVaultStore((s) => s.hardDeleteCredential);
  const restoreCredential = useVaultStore((s) => s.restoreCredential);
  const pushNotification = useVaultStore((s) => s.pushNotification);

  const [showPassword, setShowPassword] = React.useState(false);
  const [openEdit, setOpenEdit] = React.useState(false);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      pushNotification(`${label} copied. Will clear in 30s.`, 'success');
      // Clear clipboard after 30 s
      setTimeout(async () => {
        try {
          const current = await navigator.clipboard.readText();
          if (current === text) await navigator.clipboard.writeText('');
        } catch { /* ignore */ }
      }, 30_000);
    } catch {
      pushNotification('Failed to copy.', 'error');
    }
  };

  const favicon = credential.website
    ? `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(credential.website)}`
    : null;

  // Lazy-load modal to avoid circular imports
  const [AddEditModal, setAddEditModal] = React.useState<React.ComponentType<{
    open: boolean;
    onClose: () => void;
    credential?: Credential;
  }> | null>(null);

  React.useEffect(() => {
    if (openEdit && !AddEditModal) {
      import('@/components/modals/AddEditCredentialModal').then((m) => {
        setAddEditModal(() => m.AddEditCredentialModal);
      });
    }
  }, [openEdit, AddEditModal]);

  return (
    <section className="w-[400px] shrink-0 bg-white dark:bg-[#1a1330] flex flex-col overflow-y-auto scrollbar-hide border-l border-slate-200 dark:border-slate-800">
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 overflow-hidden">
              {favicon ? (
                <img src={favicon} alt="" className="w-8 h-8" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <span className="material-symbols-outlined text-slate-400">public</span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">{credential.title || credential.website}</h2>
              {credential.website && (
                <p className="text-sm text-slate-500">
                  {credential.website.replace(/^https?:\/\//, '')}
                </p>
              )}
              {credential.category && (
                <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-sm">category</span>
                  {credential.category}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-1">
            <button
              onClick={() => toggleFavorite(credential.id)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                credential.favorite
                  ? 'text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-500/10'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
              title={credential.favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: credential.favorite ? "'FILL' 1" : "'FILL' 0" }}>
                star
              </span>
            </button>
            {!credential.deleted && (
              <button
                onClick={() => setOpenEdit(true)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                title="Edit"
              >
                <span className="material-symbols-outlined">edit</span>
              </button>
            )}
            {credential.deleted ? (
              <>
                <button
                  onClick={() => restoreCredential(credential.id)}
                  className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500 transition-colors"
                  title="Restore"
                >
                  <span className="material-symbols-outlined">restore_from_trash</span>
                </button>
                <button
                  onClick={() => hardDeleteCredential(credential.id)}
                  className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                  title="Delete permanently"
                >
                  <span className="material-symbols-outlined">delete_forever</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => deleteCredential(credential.id)}
                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                title="Move to trash"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-6">
          {/* Username */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase">Username / Email</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 truncate">
                {credential.username || '—'}
              </div>
              <button
                onClick={() => copyToClipboard(credential.username, 'Username')}
                className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
                title="Copy username"
              >
                <span className="material-symbols-outlined text-lg">content_copy</span>
              </button>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase">Password</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 font-mono truncate">
                {showPassword ? credential.password : '••••••••••••'}
              </div>
              <button
                onClick={() => setShowPassword((v) => !v)}
                className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined text-lg">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
              <button
                onClick={() => copyToClipboard(credential.password, 'Password')}
                className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
                title="Copy password"
              >
                <span className="material-symbols-outlined text-lg">content_copy</span>
              </button>
            </div>
          </div>

          {/* Website URL */}
          {credential.website && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">Website URL</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 text-primary truncate">
                  {credential.website}
                </div>
                <a
                  href={credential.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
                  title="Open website"
                >
                  <span className="material-symbols-outlined text-lg">open_in_new</span>
                </a>
              </div>
            </div>
          )}

          {/* Notes */}
          {credential.notes && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">Notes</label>
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-sm border border-slate-200 dark:border-slate-700 whitespace-pre-wrap">
                {credential.notes}
              </div>
            </div>
          )}

          {/* Tags */}
          {credential.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {credential.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1">Created</p>
              <p className="text-sm font-medium">{new Date(credential.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1">Modified</p>
              <p className="text-sm font-medium">{formatDistanceToNow(credential.updatedAt)}</p>
            </div>
          </div>

          {/* Open website button */}
          {credential.website && (
            <a
              href={credential.website}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-semibold transition-colors"
            >
              <span className="material-symbols-outlined text-lg">open_in_new</span>
              Open website
            </a>
          )}
        </div>
      </div>

      {/* Edit modal (lazy-loaded) */}
      {openEdit && AddEditModal && (
        <AddEditModal
          open={openEdit}
          onClose={() => setOpenEdit(false)}
          credential={credential}
        />
      )}
    </section>
  );
};

// Re-export helper alias used internally
const formatDistanceToNow = _formatDistanceToNow;
