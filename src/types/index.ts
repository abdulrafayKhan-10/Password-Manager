// ─── Vault On-Disk Format ─────────────────────────────────────────────────────

/**
 * The encrypted vault stored in vault.json.
 * The master password is NEVER stored — only the salt (public) and
 * the AES-256-GCM ciphertext (requires derived key to decrypt).
 */
export interface EncryptedVault {
  /** Schema version for future migrations */
  version: number;
  /** UUID v4 unique vault identifier */
  id: string;
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** ISO 8601 last-modified timestamp */
  updatedAt: string;
  /**
   * PBKDF2 salt: base64-encoded 32 random bytes.
   * Not secret — used to derive the encryption key from the master password.
   */
  salt: string;
  /**
   * AES-256-GCM encrypted payload: base64-encoded (IV[12] || ciphertext || tag[16]).
   * Contains a JSON-serialised Credential[].
   */
  encryptedData: string;
}

// ─── Credential Model ─────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface Credential {
  /** UUID v4 */
  id: string;
  /** Human-readable site title, e.g. "GitHub" */
  title: string;
  /** Full URL, e.g. "https://github.com" */
  website: string;
  /** Username or email address */
  username: string;
  /** Plaintext password (only in memory, never stored plain) */
  password: string;
  /** Free-form notes */
  notes: string;
  /** Comma-separated tag strings */
  tags: string[];
  /** Category name for grouping */
  category: string;
  /** Whether this credential is marked as a favourite */
  favorite: boolean;
  /** Whether this credential is soft-deleted */
  deleted: boolean;
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601 */
  updatedAt: string;
}

/** Shape used when adding a new credential (IDs and timestamps generated automatically) */
export type NewCredential = Omit<
  Credential,
  'id' | 'createdAt' | 'updatedAt' | 'favorite' | 'deleted'
>;

/** Shape used when editing an existing credential */
export type CredentialUpdate = Partial<
  Omit<Credential, 'id' | 'createdAt' | 'updatedAt'>
>;

// ─── Password Generator ───────────────────────────────────────────────────────

export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

export type PasswordStrength = 'very-weak' | 'weak' | 'fair' | 'strong' | 'very-strong';

// ─── App Settings ─────────────────────────────────────────────────────────────

export interface AppSettings {
  /** UI colour scheme */
  theme: 'dark' | 'light';
  /**
   * Minutes of inactivity before the vault auto-locks.
   * 0 means never (not recommended).
   */
  autoLockTimeout: 0 | 1 | 5 | 15 | 30;
  /** Auto-backup enabled */
  autoBackupEnabled: boolean;
  /** Absolute folder path where vault-backup.json is written after every save */
  autoBackupPath: string;
}

/** Credential submitted from the browser extension — pending user confirmation */
export interface PendingCredential {
  title: string;
  username: string;
  password: string;
  origin: string;
}

// ─── Vault Status ─────────────────────────────────────────────────────────────

/** Overall lifecycle state of the vault */
export type VaultStatus =
  | 'initializing' // Checking for vault.json
  | 'no-vault'     // No vault file found; first-run setup needed
  | 'locked'       // Vault file exists but is encrypted
  | 'unlocked';    // Vault is decrypted and credentials are in memory

// ─── Notification ─────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

// ─── UI Views ─────────────────────────────────────────────────────────────────

export type AppView = 'setup' | 'unlock' | 'vault' | 'generator' | 'settings';

export type SidebarFilter = 'all' | 'favorites' | 'trash';
