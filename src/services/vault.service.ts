/**
 * vault.service.ts
 *
 * High-level vault operations:  create · unlock · lock · persist
 *
 * Security design:
 *  - The derived CryptoKey never leaves this module.
 *  - Credentials are stored only in memory while the vault is unlocked.
 *  - Locking zeroes out the in-memory credentials array reference.
 *  - The encoded salt lives in the vault file (public, non-secret).
 */

import { v4 as uuidv4 } from 'uuid';
import type { Credential, EncryptedVault, NewCredential, CredentialUpdate } from '@/types';
import {
  deriveKey,
  encryptData,
  decryptData,
  generateSalt,
  uint8ToBase64,
  base64ToUint8,
} from '@/crypto/vault-crypto';
import { storageService } from './storage.service';

// ─── Vault Service ────────────────────────────────────────────────────────────

export const vaultService = {
  // ─── Vault Lifecycle ────────────────────────────────────────────────────────

  /**
   * Create a brand-new vault encrypted with the given master password.
   * Persists vault.json and returns it.
   */
  async create(masterPassword: string): Promise<EncryptedVault> {
    const salt = generateSalt();
    const key = await deriveKey(masterPassword, salt);

    const now = new Date().toISOString();
    const credentials: Credential[] = [];

    const encryptedData = await encryptData(key, JSON.stringify(credentials));

    const vault: EncryptedVault = {
      version: 1,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      salt: uint8ToBase64(salt),
      encryptedData,
    };

    await storageService.write(JSON.stringify(vault, null, 2));
    return vault;
  },

  /**
   * Try to unlock the vault file with the provided master password.
   *
   * Returns the decrypted credentials array on success.
   * Throws if the file doesn't exist, is corrupted, or the password is wrong
   * (AES-GCM tag verification failure = wrong key = wrong password).
   */
  async unlock(masterPassword: string): Promise<{ credentials: Credential[]; vault: EncryptedVault }> {
    const raw = await storageService.read();
    if (!raw) throw new Error('Vault file not found.');

    let vault: EncryptedVault;
    try {
      vault = JSON.parse(raw) as EncryptedVault;
    } catch {
      throw new Error('Vault file is corrupted (invalid JSON).');
    }

    const salt = base64ToUint8(vault.salt);
    const key = await deriveKey(masterPassword, salt);

    // This will throw if the password is wrong (GCM tag mismatch)
    const plaintext = await decryptData(key, vault.encryptedData);

    const credentials: Credential[] = JSON.parse(plaintext);
    return { credentials, vault };
  },

  /**
   * Re-encrypt the credentials array with a (possibly new) key and save.
   * Call this after every mutation to keep the file in sync.
   */
  async persist(
    vault: EncryptedVault,
    credentials: Credential[],
    masterPassword: string
  ): Promise<EncryptedVault> {
    const salt = base64ToUint8(vault.salt);
    const key = await deriveKey(masterPassword, salt);

    const encryptedData = await encryptData(key, JSON.stringify(credentials));
    const updated: EncryptedVault = {
      ...vault,
      updatedAt: new Date().toISOString(),
      encryptedData,
    };

    await storageService.write(JSON.stringify(updated, null, 2));
    return updated;
  },

  /**
   * Change the master password:
   * decrypt with old key ➜ re-encrypt with new key + fresh salt.
   */
  async changeMasterPassword(
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    const { credentials, vault } = await vaultService.unlock(oldPassword);

    // Generate a fresh salt for the new password
    const newSalt = generateSalt();
    const newKey = await deriveKey(newPassword, newSalt);

    const encryptedData = await encryptData(newKey, JSON.stringify(credentials));
    const updated: EncryptedVault = {
      ...vault,
      updatedAt: new Date().toISOString(),
      salt: uint8ToBase64(newSalt),
      encryptedData,
    };

    await storageService.write(JSON.stringify(updated, null, 2));
  },

  // ─── Credential CRUD ────────────────────────────────────────────────────────

  addCredential(credentials: Credential[], input: NewCredential): Credential[] {
    const now = new Date().toISOString();
    const credential: Credential = {
      ...input,
      id: uuidv4(),
      favorite: false,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    };
    return [...credentials, credential];
  },

  updateCredential(credentials: Credential[], id: string, update: CredentialUpdate): Credential[] {
    return credentials.map((c) =>
      c.id === id
        ? { ...c, ...update, updatedAt: new Date().toISOString() }
        : c
    );
  },

  /** Soft-delete: moves to trash but does not permanently remove */
  softDeleteCredential(credentials: Credential[], id: string): Credential[] {
    return vaultService.updateCredential(credentials, id, { deleted: true });
  },

  /** Restore from trash */
  restoreCredential(credentials: Credential[], id: string): Credential[] {
    return vaultService.updateCredential(credentials, id, { deleted: false });
  },

  /** Permanent removal */
  hardDeleteCredential(credentials: Credential[], id: string): Credential[] {
    return credentials.filter((c) => c.id !== id);
  },

  toggleFavorite(credentials: Credential[], id: string): Credential[] {
    const current = credentials.find((c) => c.id === id);
    if (!current) return credentials;
    return vaultService.updateCredential(credentials, id, { favorite: !current.favorite });
  },

  // ─── Search ─────────────────────────────────────────────────────────────────

  search(credentials: Credential[], query: string): Credential[] {
    const q = query.toLowerCase().trim();
    if (!q) return credentials;
    return credentials.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.website.toLowerCase().includes(q) ||
        c.username.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
    );
  },
};
