/**
 * vault-crypto.ts
 *
 * Zero-knowledge cryptography module.
 *
 * Security design:
 *  - Master password is NEVER stored anywhere.
 *  - Key derivation: PBKDF2 with SHA-256, 600 000 iterations (OWASP 2023).
 *  - Encryption: AES-256-GCM — provides both confidentiality AND authentication.
 *    A wrong master password will cause GCM tag verification to fail, so we get
 *    password-correctness checking for free with no stored password hash.
 *  - All randomness comes from crypto.getRandomValues (CSPRNG).
 *  - CryptoKey objects are marked non-extractable — raw key bytes never reach JS.
 */

import type { PasswordOptions, PasswordStrength } from '@/types';

// ─── Key Derivation ───────────────────────────────────────────────────────────

/**
 * Derive a non-extractable AES-256-GCM key from the master password.
 *
 * @param password  The master password entered by the user.
 * @param salt      32 random bytes stored alongside the encrypted vault.
 *                  Public value — prevents pre-computation attacks.
 */
export async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const passwordBytes = new TextEncoder().encode(password);

  // Import password bytes as PBKDF2 key material (non-extractable)
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBytes,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive the actual AES-256 key via PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as Uint8Array<ArrayBuffer>,
      iterations: 600_000, // OWASP 2023 recommendation for PBKDF2-HMAC-SHA256
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false, // Non-extractable: raw key bytes cannot be read from JS
    ['encrypt', 'decrypt']
  );
}

// ─── Encryption ───────────────────────────────────────────────────────────────

/**
 * Encrypt a plaintext string with AES-256-GCM.
 *
 * Output format: base64( IV[12] || ciphertext || GCM-tag[16] )
 *
 * The 12-byte IV is randomly generated per call (standard for AES-GCM).
 * The GCM tag is appended automatically by the SubtleCrypto implementation.
 */
export async function encryptData(
  key: CryptoKey,
  plaintext: string
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
  const data = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  // Pack: IV || ciphertext_with_tag
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);

  return uint8ToBase64(combined);
}

// ─── Decryption ───────────────────────────────────────────────────────────────

/**
 * Decrypt an AES-256-GCM ciphertext produced by encryptData.
 *
 * Throws a DOMException (OperationError) if the key or ciphertext is invalid
 * — this is how we detect a wrong master password (GCM tag mismatch).
 */
export async function decryptData(
  key: CryptoKey,
  encryptedBase64: string
): Promise<string> {
  const combined = base64ToUint8(encryptedBase64);

  if (combined.byteLength < 13) {
    throw new Error('Invalid encrypted payload: too short.');
  }

  const iv = combined.slice(0, 12);       // First 12 bytes: IV
  const ciphertext = combined.slice(12);  // Remaining: ciphertext + tag

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(plaintext);
}

// ─── Salt ─────────────────────────────────────────────────────────────────────

/** Generate a cryptographically random 32-byte salt. */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

// ─── Password Generator ───────────────────────────────────────────────────────

const CHARSET_UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const CHARSET_LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const CHARSET_NUMBERS   = '0123456789';
// Symbols chosen to be widely supported and avoid shell-quoting issues
const CHARSET_SYMBOLS   = '!@#$%^&*()_+-=[]{}|;:,.<>?';

/**
 * Generate a cryptographically secure random password.
 *
 * Uses crypto.getRandomValues for unbiased selection.
 * Ensures at least one character from each enabled charset
 * so the password always satisfies its own requirements.
 */
export function generatePassword(options: PasswordOptions): string {
  let charset = '';
  const required: string[] = [];

  if (options.uppercase) { charset += CHARSET_UPPERCASE; required.push(randomChar(CHARSET_UPPERCASE)); }
  if (options.lowercase) { charset += CHARSET_LOWERCASE; required.push(randomChar(CHARSET_LOWERCASE)); }
  if (options.numbers)   { charset += CHARSET_NUMBERS;   required.push(randomChar(CHARSET_NUMBERS));   }
  if (options.symbols)   { charset += CHARSET_SYMBOLS;   required.push(randomChar(CHARSET_SYMBOLS));   }

  // Fallback to alphanumeric if nothing is selected
  if (!charset) { charset = CHARSET_LOWERCASE + CHARSET_NUMBERS; }

  const remaining = options.length - required.length;
  const extra: string[] = [];
  for (let i = 0; i < Math.max(0, remaining); i++) {
    extra.push(randomChar(charset));
  }

  // Shuffle required + extra to avoid predictable prefix pattern
  return shuffleArray([...required, ...extra]).join('').slice(0, options.length);
}

function randomChar(charset: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(1));
  // Use rejection sampling to avoid modulo bias
  const max = 256 - (256 % charset.length);
  let idx = bytes[0];
  // If the byte is in the biased region, re-sample (rare)
  while (idx >= max) {
    idx = crypto.getRandomValues(new Uint8Array(1))[0];
  }
  return charset[idx % charset.length];
}

function shuffleArray<T>(arr: T[]): T[] {
  // Fisher-Yates shuffle using crypto.getRandomValues
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const bytes = crypto.getRandomValues(new Uint8Array(2));
    const j = ((bytes[0] << 8) | bytes[1]) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Password Strength ───────────────────────────────────────────────────────

export interface StrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: PasswordStrength;
  pct: number;   // 0-100 for the progress bar
  color: string;
}

export function calculateStrength(password: string): StrengthResult {
  if (!password) return { score: 0, label: 'very-weak', pct: 0, color: '#ef4444' };

  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 14) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  // Cap at 4
  const s = Math.min(4, score) as 0 | 1 | 2 | 3 | 4;

  const labels: PasswordStrength[] = ['very-weak', 'weak', 'fair', 'strong', 'very-strong'];
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];

  return { score: s, label: labels[s], pct: (s / 4) * 100, color: colors[s] };
}

// ─── Encoding Helpers ─────────────────────────────────────────────────────────

export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
