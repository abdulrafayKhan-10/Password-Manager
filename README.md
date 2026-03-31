# Password Manager

Local-first, zero-knowledge password manager built with Tauri, React, TypeScript, and a Chrome/Edge/Brave extension.

## Highlights

- AES-256-GCM encrypted vault file with PBKDF2-derived key
- Master password is never stored or sent anywhere
- Desktop app for full vault management
- Browser extension for autofill and save-from-browser flow
- Categories, favorites, trash/restore, import/export, and password generator
- Optional auto-backup to a custom folder

## Tech Stack

- Frontend: React 18, TypeScript, Vite, TailwindCSS, Zustand
- Desktop: Tauri v2 (Rust backend)
- Extension: Manifest V3 + native messaging bridge

## Project Structure

```text
src/                  React app (pages, components, store, crypto)
src-tauri/            Rust commands and Tauri runtime
extension/            Browser extension source and build config
```

## Security Notes

- Encryption: AES-256-GCM (authenticated encryption)
- KDF: PBKDF2-HMAC-SHA256 (high iteration count)
- Clipboard safety: secrets auto-clear after timeout
- Memory hygiene: plaintext credentials are dropped on lock
- No sensitive logging

## Prerequisites

- Node.js 20+
- Rust toolchain (cargo)
- Tauri prerequisites for your OS

## Run Locally

### 1. Install dependencies

```bash
npm install
cd extension && npm install && cd ..
```

### 2. Run desktop app (dev)

```bash
npm run tauri dev
```

### 3. Build extension

```bash
cd extension
npm run build
```

Load `extension/dist` as unpacked in `chrome://extensions` (or Edge/Brave equivalent).

## Extension Setup (Native Messaging)

1. Open desktop app settings and copy your extension ID from browser extensions page.
2. Register the native host from the app (or run `extension/setup-native-host.ps1`).
3. Reload the extension.
4. Unlock desktop vault, then extension autofill/save will work.

## Backup Strategy

- In app settings, enable auto-backup and set a folder path (for example OneDrive/Dropbox/local backup directory).
- On each credential save/update, the app writes `vault-backup.json` to that folder.
- You can also trigger manual backup from settings.

## Vault Location

- App data folder: `com.passwordmanager.app`
- Main vault file: `vault.json`
- Session bridge file: `session.json`
- Pending extension save file: `pending.json`

On Windows this resolves under `%APPDATA%\com.passwordmanager.app`.

## Scripts

Root:

- `npm run dev` - frontend only
- `npm run tauri dev` - full desktop app dev
- `npm run tauri build` - desktop production build

Extension:

- `npm run dev` - extension dev build/watch
- `npm run build` - extension production build

## License

Private project. Add a license file if you plan to make this public.
