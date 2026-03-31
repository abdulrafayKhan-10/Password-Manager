/**
 * background.ts  (Manifest V3 Service Worker)
 *
 * Manages communication between:
 *  - Content script (login form detection / autofill)
 *  - Popup (user-facing UI)
 *  - Native host (desktop vault app) via chrome.runtime.connectNative
 *
 * Security notes:
 *  - All vault access goes through the native port — the extension
 *    never stores the master password or plaintext credentials.
 *  - Messages are strongly typed to prevent injection.
 *  - The native host app validates requests and returns only the
 *    credentials needed for the specific origin.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

interface CredentialMatch {
  id: string;
  title: string;
  username: string;
  password: string;
  website: string;
  category?: string;
}

type MessageType =
  | { type: 'GET_CREDENTIALS'; origin: string }
  | { type: 'FILL_CREDENTIAL'; credential: CredentialMatch }
  | { type: 'SAVE_CREDENTIAL'; title: string; username: string; password: string; origin: string }
  | { type: 'VAULT_STATUS_REQUEST' }
  | { type: 'CREDENTIALS_RESPONSE'; credentials: CredentialMatch[] }
  | { type: 'VAULT_STATUS'; locked: boolean; hostAvailable: boolean };

// ─── Native Messaging ─────────────────────────────────────────────────────────

// The native host name must match what is registered in the OS native messaging manifest.
// Run setup-native-host.ps1 to register the host on Windows.
const NATIVE_HOST = 'com.passwordmanager.native';

let nativePort: chrome.runtime.Port | null = null;
const pendingCallbacks = new Map<string, (response: MessageType) => void>();

// Backoff state — stop retrying for 30 s after a failed connection attempt
let nativeHostUnavailable = false;
let nativeHostUnavailableTimer: ReturnType<typeof setTimeout> | null = null;

function markUnavailable() {
  nativeHostUnavailable = true;
  if (nativeHostUnavailableTimer) clearTimeout(nativeHostUnavailableTimer);
  nativeHostUnavailableTimer = setTimeout(() => {
    nativeHostUnavailable = false;
    nativeHostUnavailableTimer = null;
  }, 30_000);
}

function getNativePort(): chrome.runtime.Port {
  if (nativeHostUnavailable) {
    throw new Error('Native host unavailable (backing off)');
  }

  if (!nativePort) {
    nativePort = chrome.runtime.connectNative(NATIVE_HOST);

    nativePort.onMessage.addListener((msg: MessageType & { requestId?: string }) => {
      if (msg.requestId) {
        const cb = pendingCallbacks.get(msg.requestId);
        if (cb) {
          cb(msg);
          pendingCallbacks.delete(msg.requestId);
        }
      }

      // Broadcast vault status changes to all tabs
      if (msg.type === 'VAULT_STATUS') {
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach((tab) => {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, msg).catch(() => {/* tab may not have content script */});
            }
          });
        });
      }
    });

    nativePort.onDisconnect.addListener(() => {
      // MUST read chrome.runtime.lastError here to suppress "Unchecked runtime.lastError" warnings.
      const err = chrome.runtime.lastError;
      if (err) {
        console.warn('[BG] Native host error:', err.message);
        markUnavailable();
        // Fail all pending callbacks gracefully
        pendingCallbacks.forEach((cb) => cb({ type: 'VAULT_STATUS', locked: true, hostAvailable: false }));
        pendingCallbacks.clear();
      }
      nativePort = null;
      console.info('[BG] Native port disconnected');
    });
  }
  return nativePort;
}

// ─── Message Handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (message: MessageType, sender, sendResponse) => {
    // Only accept messages from same extension
    if (sender.id !== chrome.runtime.id) return;

    if (message.type === 'GET_CREDENTIALS') {
      const requestId = crypto.randomUUID();
      try {
        const port = getNativePort();
        pendingCallbacks.set(requestId, (response) => sendResponse(response));
        port.postMessage({ ...message, requestId });
      } catch {
        sendResponse({ type: 'CREDENTIALS_RESPONSE', credentials: [] });
      }
      return true; // Keep message channel open for async response
    }

    if (message.type === 'SAVE_CREDENTIAL') {
      const requestId = crypto.randomUUID();
      try {
        const port = getNativePort();
        pendingCallbacks.set(requestId, (response) => sendResponse(response));
        port.postMessage({ ...message, requestId });
      } catch {
        sendResponse({ type: 'VAULT_STATUS', locked: true, hostAvailable: false });
      }
      return true;
    }

    if (message.type === 'VAULT_STATUS_REQUEST') {
      const requestId = crypto.randomUUID();
      try {
        const port = getNativePort();
        pendingCallbacks.set(requestId, (response) => sendResponse(response));
        port.postMessage({ ...message, requestId });
      } catch {
        // Native host not registered or desktop app not running
        sendResponse({ type: 'VAULT_STATUS', locked: true, hostAvailable: false });
      }
      return true;
    }
  }
);

// ─── Extension installed / updated ───────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  console.info('[BG] Password Manager extension installed/updated.');
});
