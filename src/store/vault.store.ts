/**
 * vault.store.ts
 *
 * Central Zustand store for the vault's runtime state.
 *
 * Security notes:
 *  - masterPassword lives ONLY in this store's closure while the vault is unlocked.
 *  - On lock(), the password reference is replaced with null — GC-eligible.
 *  - credentials[] is cleared on lock() so no plaintext stays in memory.
 *  - We never log any field that might contain sensitive data.
 */

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  Credential,
  EncryptedVault,
  NewCredential,
  CredentialUpdate,
  VaultStatus,
  SidebarFilter,
  AppView,
  Notification,
  AppSettings,
  Category,
  PendingCredential,
} from '@/types';
import { vaultService } from '@/services/vault.service';
import { storageService } from '@/services/storage.service';

// ─── State Shape ─────────────────────────────────────────────────────────────

interface VaultState {
  // ── Lifecycle
  status: VaultStatus;
  /** Active app view (used instead of a router for simplicity in a single-window app) */
  view: AppView;

  // ── Vault metadata
  vault: EncryptedVault | null;

  // ── Unlock key material (not the password — just holds the decrypted list)
  /** Plaintext master password kept in memory for re-encryption during mutations.
   *  Cleared on lock(). */
  _masterPassword: string | null;

  // ── Credentials (plaintext, only in memory when unlocked)
  credentials: Credential[];

  // ── UI selection
  selectedId: string | null;
  sidebarFilter: SidebarFilter;
  selectedCategory: string | null;
  searchQuery: string;

  // ── Notifications (toast messages)
  notifications: Notification[];

  // ── App settings (stored separately from the vault)
  settings: AppSettings;

  // ── Custom categories (persisted in localStorage)
  categories: Category[];

  // ── Pending save (credential sent from browser extension)
  pendingCredential: PendingCredential | null;

  // ── Loading / error
  loading: boolean;
  error: string | null;
}

// ─── Actions Shape ────────────────────────────────────────────────────────────

interface VaultActions {
  // Lifecycle
  initialize: () => Promise<void>;
  setupVault: (password: string) => Promise<void>;
  unlockVault: (password: string) => Promise<void>;
  lockVault: () => void;

  // Credentials
  addCredential: (input: NewCredential) => Promise<void>;
  updateCredential: (id: string, update: CredentialUpdate) => Promise<void>;
  deleteCredential: (id: string) => Promise<void>;
  restoreCredential: (id: string) => Promise<void>;
  hardDeleteCredential: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;

  // UI
  selectCredential: (id: string | null) => void;
  setSidebarFilter: (filter: SidebarFilter) => void;
  setSelectedCategory: (category: string | null) => void;
  setSearchQuery: (query: string) => void;
  setView: (view: AppView) => void;

  // Settings
  updateSettings: (patch: Partial<AppSettings>) => void;

  // Categories
  addCategory: (name: string, icon: string) => void;
  updateCategory: (id: string, name: string, icon: string) => Promise<void>;
  deleteCategory: (id: string) => void;

  // Vault data management
  exportVault: (format: 'json' | 'csv') => Promise<string>;
  importCredentials: (json: string) => Promise<void>;
  purgeVault: () => Promise<void>;

  // Notifications
  pushNotification: (message: string, type: Notification['type']) => void;
  dismissNotification: (id: string) => void;

  // Pending save from extension
  setPendingCredential: (cred: PendingCredential) => void;
  clearPendingCredential: () => void;

  // Internal
  _setError: (err: string | null) => void;
}

type VaultStore = VaultState & VaultActions;

// ─── Store ────────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  autoLockTimeout: 5,
  autoBackupEnabled: false,
  autoBackupPath: '',
};

// Key to cancel a pending-save polling timer
let _pollTimer: ReturnType<typeof setInterval> | undefined;

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem('settings');
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as AppSettings;
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-login',    name: 'Login',    icon: 'key' },
  { id: 'cat-email',    name: 'Email',    icon: 'mail' },
  { id: 'cat-banking',  name: 'Banking',  icon: 'credit_card' },
  { id: 'cat-social',   name: 'Social',   icon: 'people' },
  { id: 'cat-work',     name: 'Work',     icon: 'work' },
  { id: 'cat-shopping', name: 'Shopping', icon: 'shopping_bag' },
  { id: 'cat-gaming',   name: 'Gaming',   icon: 'sports_esports' },
  { id: 'cat-other',    name: 'Other',    icon: 'folder' },
];

function loadCategories(): Category[] {
  try {
    const raw = localStorage.getItem('categories');
    if (raw) return JSON.parse(raw) as Category[];
  } catch { /* ignore */ }
  return DEFAULT_CATEGORIES;
}

export const useVaultStore = create<VaultStore>()((set, get) => ({
  // ── Initial state
  status: 'initializing',
  view: 'unlock',
  vault: null,
  _masterPassword: null,
  credentials: [],
  selectedId: null,
  sidebarFilter: 'all',
  selectedCategory: null,
  searchQuery: '',
  notifications: [],
  settings: loadSettings(),
  categories: loadCategories(),
  pendingCredential: null,
  loading: false,
  error: null,

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  initialize: async () => {
    set({ loading: true, error: null });
    try {
      const exists = await storageService.exists();
      if (exists) {
        set({ status: 'locked', view: 'unlock', loading: false });
      } else {
        set({ status: 'no-vault', view: 'setup', loading: false });
      }
    } catch (e) {
      set({ status: 'no-vault', view: 'setup', loading: false, error: String(e) });
    }
  },

  setupVault: async (password: string) => {
    set({ loading: true, error: null });
    try {
      const vault = await vaultService.create(password);
      set({
        status: 'unlocked',
        view: 'vault',
        vault,
        _masterPassword: password,
        credentials: [],
        loading: false,
      });
      get().pushNotification('Vault created successfully!', 'success');
    } catch (e) {
      set({ loading: false, error: 'Failed to create vault: ' + String(e) });
    }
  },

  unlockVault: async (password: string) => {
    set({ loading: true, error: null });
    try {
      const { credentials, vault } = await vaultService.unlock(password);
      set({
        status: 'unlocked',
        view: 'vault',
        vault,
        _masterPassword: password,
        credentials,
        loading: false,
        error: null,
      });
      // Write session file so the native messaging bridge can serve credentials
      if ('__TAURI_INTERNALS__' in window) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('write_session', {
          data: JSON.stringify({ locked: false, credentials }),
        }).catch(() => {/* non-critical */});

        // Poll for credentials the extension wants to save
        clearInterval(_pollTimer);
        _pollTimer = setInterval(async () => {
          try {
            const raw: string | null = await invoke('check_pending_save');
            if (raw && !get().pendingCredential) {
              const cred = JSON.parse(raw) as PendingCredential;
              get().setPendingCredential(cred);
            }
          } catch { /* non-critical */ }
        }, 2500);
      }
    } catch {
      // Do NOT reveal the specific error (timing side-channel)
      set({ loading: false, error: 'Invalid master password. Please try again.' });
    }
  },

  lockVault: () => {
    // Stop pending-save polling
    clearInterval(_pollTimer);
    _pollTimer = undefined;
    // Wipe all plaintext credential data from memory
    set({
      status: 'locked',
      view: 'unlock',
      credentials: [],
      selectedId: null,
      searchQuery: '',
      selectedCategory: null,
      _masterPassword: null, // Release master password reference
      pendingCredential: null,
      error: null,
    });
    // Remove session file so the extension knows the vault is locked
    if ('__TAURI_INTERNALS__' in window) {
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke('delete_session').catch(() => {/* non-critical */});
      });
    }
  },

  // ── Credential Mutations ─────────────────────────────────────────────────────

  // Helper: keep the native-messaging session file in sync after mutations
  // (fire-and-forget, non-critical)

  addCredential: async (input) => {
    const { credentials, vault, _masterPassword } = get();
    if (!vault || !_masterPassword) return;

    const updated = vaultService.addCredential(credentials, input);
    const newVault = await vaultService.persist(vault, updated, _masterPassword);
    set({ credentials: updated, vault: newVault });
    get().pushNotification('Password saved.', 'success');
    if ('__TAURI_INTERNALS__' in window) {
      const { invoke } = await import('@tauri-apps/api/core');
      invoke('write_session', { data: JSON.stringify({ locked: false, credentials: updated }) }).catch(() => {});
      const { autoBackupEnabled, autoBackupPath } = get().settings;
      if (autoBackupEnabled && autoBackupPath) {
        invoke('backup_vault', { backupPath: autoBackupPath }).catch(() => {});
      }
    }
  },

  updateCredential: async (id, update) => {
    const { credentials, vault, _masterPassword } = get();
    if (!vault || !_masterPassword) return;

    const updated = vaultService.updateCredential(credentials, id, update);
    const newVault = await vaultService.persist(vault, updated, _masterPassword);
    set({ credentials: updated, vault: newVault });
    get().pushNotification('Entry updated.', 'success');
    if ('__TAURI_INTERNALS__' in window) {
      const { invoke } = await import('@tauri-apps/api/core');
      const { autoBackupEnabled, autoBackupPath } = get().settings;
      if (autoBackupEnabled && autoBackupPath) {
        invoke('backup_vault', { backupPath: autoBackupPath }).catch(() => {});
      }
    }
  },

  deleteCredential: async (id) => {
    const { credentials, vault, _masterPassword } = get();
    if (!vault || !_masterPassword) return;

    const updated = vaultService.softDeleteCredential(credentials, id);
    const newVault = await vaultService.persist(vault, updated, _masterPassword);
    // Deselect if the deleted item is currently selected
    const selectedId = get().selectedId === id ? null : get().selectedId;
    set({ credentials: updated, vault: newVault, selectedId });
    get().pushNotification('Moved to trash.', 'info');
  },

  restoreCredential: async (id) => {
    const { credentials, vault, _masterPassword } = get();
    if (!vault || !_masterPassword) return;

    const updated = vaultService.restoreCredential(credentials, id);
    const newVault = await vaultService.persist(vault, updated, _masterPassword);
    set({ credentials: updated, vault: newVault });
    get().pushNotification('Restored from trash.', 'success');
  },

  hardDeleteCredential: async (id) => {
    const { credentials, vault, _masterPassword } = get();
    if (!vault || !_masterPassword) return;

    const updated = vaultService.hardDeleteCredential(credentials, id);
    const newVault = await vaultService.persist(vault, updated, _masterPassword);
    const selectedId = get().selectedId === id ? null : get().selectedId;
    set({ credentials: updated, vault: newVault, selectedId });
    get().pushNotification('Permanently deleted.', 'info');
  },

  toggleFavorite: async (id) => {
    const { credentials, vault, _masterPassword } = get();
    if (!vault || !_masterPassword) return;

    const updated = vaultService.toggleFavorite(credentials, id);
    const newVault = await vaultService.persist(vault, updated, _masterPassword);
    set({ credentials: updated, vault: newVault });
  },

  // ── UI ───────────────────────────────────────────────────────────────────────

  selectCredential: (id) => set({ selectedId: id }),
  setSidebarFilter: (filter) => set({ sidebarFilter: filter, selectedCategory: null, selectedId: null }),
  setSelectedCategory: (category) => set({ selectedCategory: category, sidebarFilter: 'all', selectedId: null }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setView: (view) => set({ view }),

  // ── Settings ─────────────────────────────────────────────────────────────────

  updateSettings: (patch) => {
    const updated = { ...get().settings, ...patch };
    localStorage.setItem('settings', JSON.stringify(updated));
    // Apply dark/light theme class to root
    if (patch.theme) {
      document.documentElement.classList.toggle('dark', patch.theme === 'dark');
    }
    set({ settings: updated });
  },

  // ── Categories ───────────────────────────────────────────────────────────────

  addCategory: (name, icon) => {
    const newCat: Category = { id: uuidv4(), name, icon };
    const updated = [...get().categories, newCat];
    localStorage.setItem('categories', JSON.stringify(updated));
    set({ categories: updated });
  },

  updateCategory: async (id, name, icon) => {
    const { categories, credentials, vault, _masterPassword } = get();
    const oldCat = categories.find((c) => c.id === id);
    const updated = categories.map((c) => c.id === id ? { ...c, name, icon } : c);
    localStorage.setItem('categories', JSON.stringify(updated));
    set({ categories: updated });
    // Cascade rename to all credentials in vault
    if (oldCat && oldCat.name !== name && vault && _masterPassword) {
      const now = new Date().toISOString();
      const updatedCreds = credentials.map((c) =>
        c.category === oldCat.name ? { ...c, category: name, updatedAt: now } : c
      );
      const newVault = await vaultService.persist(vault, updatedCreds, _masterPassword);
      set({ credentials: updatedCreds, vault: newVault });
    }
  },

  deleteCategory: (id) => {
    const { categories } = get();
    if (categories.length <= 1) return;
    const updated = categories.filter((c) => c.id !== id);
    localStorage.setItem('categories', JSON.stringify(updated));
    set({ categories: updated });
  },

  // ── Import / Export ──────────────────────────────────────────────────────────

  exportVault: async (format) => {
    const { credentials } = get();
    const visible = credentials.filter((c) => !c.deleted);

    if (format === 'csv') {
      const header = 'title,website,username,password,notes,tags\n';
      const rows = visible.map((c) =>
        [c.title, c.website, c.username, c.password, c.notes, c.tags.join(';')]
          .map((f) => `"${String(f).replace(/"/g, '""')}"`)
          .join(',')
      );
      return header + rows.join('\n');
    }

    // JSON export — returns only the plaintext credentials (no crypto metadata)
    return JSON.stringify(visible, null, 2);
  },

  importCredentials: async (json) => {
    const { credentials, vault, _masterPassword } = get();
    if (!vault || !_masterPassword) return;

    let parsed: Partial<Credential>[];
    try {
      parsed = JSON.parse(json);
    } catch {
      get().pushNotification('Import failed: invalid JSON format.', 'error');
      return;
    }

    const now = new Date().toISOString();
    const imported: Credential[] = parsed.map((c) => ({
      id: uuidv4(),
      title: c.title ?? 'Imported',
      website: c.website ?? '',
      username: c.username ?? '',
      password: c.password ?? '',
      notes: c.notes ?? '',
      tags: Array.isArray(c.tags) ? c.tags : [],
      category: (c as Credential).category ?? 'Other',
      favorite: false,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    }));

    const updated = [...credentials, ...imported];
    const newVault = await vaultService.persist(vault, updated, _masterPassword);
    set({ credentials: updated, vault: newVault });
    get().pushNotification(`Imported ${imported.length} entries.`, 'success');
  },

  purgeVault: async () => {
    await storageService.delete();
    set({
      status: 'no-vault',
      view: 'setup',
      vault: null,
      _masterPassword: null,
      credentials: [],
      selectedId: null,
      error: null,
    });
  },

  // ── Notifications ────────────────────────────────────────────────────────────

  pushNotification: (message, type) => {
    const id = uuidv4();
    set((s) => ({ notifications: [...s.notifications, { id, message, type }] }));
    // Auto-dismiss after 4 s
    setTimeout(() => get().dismissNotification(id), 4000);
  },

  dismissNotification: (id) => {
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
  },

  // ── Pending save from extension ──────────────────────────────────────────────

  setPendingCredential: (cred) => set({ pendingCredential: cred }),

  clearPendingCredential: () => {
    set({ pendingCredential: null });
    if ('__TAURI_INTERNALS__' in window) {
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke('clear_pending_save').catch(() => {});
      });
    }
  },

  // ── Internal ─────────────────────────────────────────────────────────────────

  _setError: (err) => set({ error: err }),
}));

// ─── Derived selectors (call outside store to avoid recreation) ───────────────

export const selectFilteredCredentials = (
  credentials: Credential[],
  filter: SidebarFilter,
  query: string,
  category?: string | null
): Credential[] => {
  let base = credentials;

  switch (filter) {
    case 'favorites':
      base = credentials.filter((c) => !c.deleted && c.favorite);
      break;
    case 'trash':
      base = credentials.filter((c) => c.deleted);
      break;
    default:
      base = credentials.filter((c) => !c.deleted);
  }

  if (category) {
    base = base.filter((c) => c.category === category);
  }

  if (!query.trim()) return base;
  return vaultService.search(base, query);
};
