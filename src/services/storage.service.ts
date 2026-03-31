/**
 * storage.service.ts
 *
 * Abstraction layer for persisting the encrypted vault file.
 *
 * In Tauri (production): reads/writes vault.json in the OS app-data directory
 *   – Windows: %APPDATA%\password-manager\vault.json
 *   – macOS:   ~/Library/Application Support/password-manager/vault.json
 *   – Linux:   ~/.config/password-manager/vault.json
 *
 * In browser (development / testing): falls back to localStorage.
 * NOTE: All data written is already AES-256-GCM encrypted by the vault service,
 *       so localStorage is safe as a dev fallback.
 */

/** Returns true when running inside a Tauri window. */
const isTauri = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

// ─── Public API ───────────────────────────────────────────────────────────────

export const storageService = {
  /**
   * Check whether a vault file already exists.
   */
  async exists(): Promise<boolean> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<boolean>('vault_exists');
    }
    return localStorage.getItem('vault') !== null;
  },

  /**
   * Read the raw vault JSON string from disk.
   * Returns null when no vault file exists.
   */
  async read(): Promise<string | null> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<string>('read_vault').catch(() => null);
    }
    return localStorage.getItem('vault');
  },

  /**
   * Write the raw vault JSON string to disk.
   * Creates the file (and parent directories) if they don't exist.
   */
  async write(data: string): Promise<void> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke<void>('write_vault', { data });
      return;
    }
    localStorage.setItem('vault', data);
  },

  /**
   * Permanently delete the vault file.
   * Used during "Purge All Data" / Reset Vault flows.
   */
  async delete(): Promise<void> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke<void>('delete_vault');
      return;
    }
    localStorage.removeItem('vault');
  },
};
