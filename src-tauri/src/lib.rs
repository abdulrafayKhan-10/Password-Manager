// Prevents additional console window on Windows in release, DO NOT REMOVE!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

// ─── Vault File Path ──────────────────────────────────────────────────────────

/// Returns the path to vault.json in the OS app-data directory.
/// The path is determined by Tauri's app_data_dir resolver.
fn vault_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Cannot resolve app data dir: {e}"))?;

    // Ensure the directory exists
    fs::create_dir_all(&dir).map_err(|e| format!("Cannot create app dir: {e}"))?;

    Ok(dir.join("vault.json"))
}

/// Returns the app-data directory (stable across Tauri versions).
fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("Cannot resolve app data dir: {e}"))
}

// ─── Tauri Commands ───────────────────────────────────────────────────────────

/// Check whether vault.json exists on disk.
#[tauri::command]
fn vault_exists(app: AppHandle) -> Result<bool, String> {
    let path = vault_path(&app)?;
    Ok(path.exists())
}

/// Read the raw vault.json content.
/// Returns the JSON string, or an error if the file doesn't exist / can't be read.
#[tauri::command]
fn read_vault(app: AppHandle) -> Result<String, String> {
    let path = vault_path(&app)?;
    fs::read_to_string(&path).map_err(|e| format!("Failed to read vault: {e}"))
}

/// Write the raw vault JSON string to disk.
/// This replaces the entire file content (atomic on most OS via temp-file + rename pattern).
///
/// Security note: data is already AES-256-GCM encrypted by the frontend before this call.
#[tauri::command]
fn write_vault(app: AppHandle, data: String) -> Result<(), String> {
    let path = vault_path(&app)?;

    // Write to a temporary file first, then rename for atomic write
    let tmp_path = path.with_extension("tmp");
    fs::write(&tmp_path, &data).map_err(|e| format!("Failed to write temp vault: {e}"))?;
    fs::rename(&tmp_path, &path).map_err(|e| format!("Failed to rename vault: {e}"))?;

    Ok(())
}

/// Permanently delete vault.json.
#[tauri::command]
fn delete_vault(app: AppHandle) -> Result<(), String> {
    let path = vault_path(&app)?;
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("Failed to delete vault: {e}"))?;
    }
    Ok(())
}

/// Write session.json with decrypted credentials so the native messaging bridge
/// can serve them to the browser extension without needing the master password.
///
/// Security note: session.json is plaintext.  It lives only in the OS app-data
/// directory (accessible only to the current user) and is deleted on lock.
#[tauri::command]
fn write_session(app: AppHandle, data: String) -> Result<(), String> {
    let dir = app_data_dir(&app)?;
    fs::create_dir_all(&dir).map_err(|e| format!("Cannot create app dir: {e}"))?;
    let path = dir.join("session.json");
    fs::write(&path, &data).map_err(|e| format!("Failed to write session: {e}"))
}

/// Delete session.json (called on vault lock / app exit).
#[tauri::command]
fn delete_session(app: AppHandle) -> Result<(), String> {
    let path = app_data_dir(&app)?.join("session.json");
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("Failed to delete session: {e}"))?;
    }
    Ok(())
}

/// Return the absolute path to vault.json so the UI can show it for backup reference.
#[tauri::command]
fn get_vault_path(app: AppHandle) -> Result<String, String> {
    let path = vault_path(&app)?;
    Ok(path.to_string_lossy().into_owned())
}

/// Read a pending credential left by the native messaging bridge, if any.
#[tauri::command]
fn check_pending_save(app: AppHandle) -> Result<Option<String>, String> {
    let path = app_data_dir(&app)?.join("pending.json");
    if path.exists() {
        Ok(Some(fs::read_to_string(&path).map_err(|e| e.to_string())?))
    } else {
        Ok(None)
    }
}

/// Delete the pending credential file after it has been handled.
#[tauri::command]
fn clear_pending_save(app: AppHandle) -> Result<(), String> {
    let path = app_data_dir(&app)?.join("pending.json");
    if path.exists() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Copy vault.json to `backup_path` folder as vault-backup.json.
/// Called by the frontend after every credential mutation when auto-backup is on.
#[tauri::command]
fn backup_vault(app: AppHandle, backup_path: String) -> Result<(), String> {
    let src = vault_path(&app)?;
    if !src.exists() {
        return Ok(()); // nothing to back up yet
    }
    let dest_dir = std::path::Path::new(&backup_path);
    fs::create_dir_all(dest_dir)
        .map_err(|e| format!("Cannot create backup directory: {e}"))?;
    let dest = dest_dir.join("vault-backup.json");
    fs::copy(&src, &dest).map_err(|e| format!("Backup failed: {e}"))?;
    Ok(())
}

/// Register the native messaging host so the Chrome/Edge/Brave extension can talk
/// to this desktop app.  Writes the JSON manifest and (on Windows) the registry keys.
/// `extension_id` is the 32-char ID shown on chrome://extensions.
#[tauri::command]
fn register_native_host(extension_id: String) -> Result<String, String> {
    if extension_id.trim().is_empty() {
        return Err("Extension ID cannot be empty.".into());
    }

    // Path to this running executable — Chrome will use it to launch the host
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("Cannot get executable path: {e}"))?;

    // Write manifest JSON to a stable APPDATA sub-directory
    let manifest_dir = dirs::data_dir()
        .ok_or_else(|| "Cannot resolve APPDATA directory.".to_string())?
        .join("PasswordManager")
        .join("NativeHost");
    std::fs::create_dir_all(&manifest_dir)
        .map_err(|e| format!("Cannot create manifest directory: {e}"))?;

    let manifest_path = manifest_dir.join("com.passwordmanager.native.json");
    let manifest = serde_json::json!({
        "name": "com.passwordmanager.native",
        "description": "Password Manager Native Messaging Host",
        "path": exe_path.to_string_lossy(),
        "type": "stdio",
        "allowed_origins": [format!("chrome-extension://{}/", extension_id.trim())]
    });
    std::fs::write(
        &manifest_path,
        serde_json::to_string_pretty(&manifest)
            .map_err(|e| format!("Cannot serialise manifest: {e}"))?,
    )
    .map_err(|e| format!("Cannot write manifest file: {e}"))?;

    // On Windows: write registry keys for Chrome, Edge, and Brave
    #[cfg(windows)]
    {
        use winreg::enums::HKEY_CURRENT_USER;
        use winreg::RegKey;

        let host_name = "com.passwordmanager.native";
        let manifest_str = manifest_path.to_string_lossy().into_owned();
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);

        for browser in &[
            "Google\\Chrome",
            "Microsoft\\Edge",
            "BraveSoftware\\Brave-Browser",
        ] {
            let reg_path = format!(
                "Software\\{}\\NativeMessagingHosts\\{}",
                browser, host_name
            );
            if let Ok((key, _)) = hkcu.create_subkey(&reg_path) {
                let _ = key.set_value("", &manifest_str.as_str());
            }
        }
    }

    Ok(manifest_path.to_string_lossy().into_owned())
}

// ─── Native Messaging Bridge ──────────────────────────────────────────────────
//
// When Chrome launches this binary for native messaging it passes
// `--native-messaging` as the first argument.  The protocol uses
// 4-byte little-endian message-length prefix followed by a JSON body.
//
// This bridge reads the encrypted vault from disk and answers:
//   VAULT_STATUS_REQUEST  →  { type: "VAULT_STATUS", locked: bool, hostAvailable: true }
//   GET_CREDENTIALS       →  { type: "CREDENTIALS_RESPONSE", credentials: [] }
//                            (credentials are AES-encrypted; the bridge cannot
//                             decrypt them without the master password.  The
//                             unlocked vault session is managed by the desktop
//                             app's JS frontend, not here.)
//
// To get autofill working end-to-end, unlock the desktop app first — the
// desktop app writes a plaintext session file that this bridge reads.

mod native_messaging {
    use serde::{Deserialize, Serialize};
    use std::io::{self, Read, Write};

    #[derive(Deserialize)]
    pub struct InboundMessage {
        pub r#type: String,
        pub origin: Option<String>,
        pub username: Option<String>,
        pub password: Option<String>,
        pub title: Option<String>,
        pub request_id: Option<String>,
        #[serde(rename = "requestId")]
        pub request_id_camel: Option<String>,
    }

    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    pub struct VaultStatus {
        pub r#type: &'static str,
        pub locked: bool,
        pub host_available: bool,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub request_id: Option<String>,
    }

    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    pub struct CredentialsResponse {
        pub r#type: &'static str,
        pub credentials: Vec<serde_json::Value>,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub request_id: Option<String>,
    }

    fn read_message(reader: &mut impl Read) -> io::Result<Option<String>> {
        let mut len_buf = [0u8; 4];
        if reader.read_exact(&mut len_buf).is_err() {
            return Ok(None); // EOF — Chrome closed the port
        }
        let length = u32::from_le_bytes(len_buf) as usize;
        if length == 0 || length > 1_048_576 {
            return Ok(None);
        }
        let mut msg_buf = vec![0u8; length];
        reader.read_exact(&mut msg_buf)?;
        Ok(Some(String::from_utf8_lossy(&msg_buf).into_owned()))
    }

    fn write_message(writer: &mut impl Write, json: &str) -> io::Result<()> {
        let bytes = json.as_bytes();
        let len = (bytes.len() as u32).to_le_bytes();
        writer.write_all(&len)?;
        writer.write_all(bytes)?;
        writer.flush()
    }

    /// Read session credentials written by the unlocked desktop app.
    /// The desktop app writes <app_data>/session.json when the vault is unlocked
    /// and removes it on lock.  The file contains plaintext credentials ONLY for
    /// the duration the vault is open — it is deleted on lock.
    fn read_session(app_data: &std::path::Path) -> Option<(bool, Vec<serde_json::Value>)> {
        let session_path = app_data.join("session.json");
        let raw = std::fs::read_to_string(&session_path).ok()?;
        let v: serde_json::Value = serde_json::from_str(&raw).ok()?;
        let locked = v.get("locked").and_then(|l| l.as_bool()).unwrap_or(true);
        let credentials = v
            .get("credentials")
            .and_then(|c| c.as_array())
            .cloned()
            .unwrap_or_default();
        Some((locked, credentials))
    }

    /// Filter credentials by origin (match on `website` field).
    fn filter_by_origin(
        credentials: &[serde_json::Value],
        origin: &str,
    ) -> Vec<serde_json::Value> {
        credentials
            .iter()
            .filter(|c| {
                if let Some(website) = c.get("website").and_then(|w| w.as_str()) {
                    // Check if the credential's website origin matches the requested origin
                    if let Ok(url) = url::Url::parse(website) {
                        let cred_origin = format!(
                            "{}://{}",
                            url.scheme(),
                            url.host_str().unwrap_or("")
                        );
                        return cred_origin.eq_ignore_ascii_case(origin)
                            || website.contains(origin);
                    }
                    website.contains(origin)
                } else {
                    false
                }
            })
            .cloned()
            .collect()
    }

    pub fn run(app_data: std::path::PathBuf) {
        let stdin = io::stdin();
        let stdout = io::stdout();
        let mut reader = stdin.lock();
        let mut writer = stdout.lock();

        loop {
            let raw = match read_message(&mut reader) {
                Ok(Some(s)) => s,
                _ => break, // EOF or error — exit cleanly
            };

            let msg: InboundMessage = match serde_json::from_str(&raw) {
                Ok(m) => m,
                Err(_) => continue,
            };

            let request_id = msg
                .request_id_camel
                .or(msg.request_id)
                .clone();

            let response_json = match msg.r#type.as_str() {
                "VAULT_STATUS_REQUEST" => {
                    let (locked, _) = read_session(&app_data)
                        .unwrap_or((true, vec![]));
                    serde_json::to_string(&VaultStatus {
                        r#type: "VAULT_STATUS",
                        locked,
                        host_available: true,
                        request_id,
                    })
                    .unwrap_or_default()
                }
                "GET_CREDENTIALS" => {
                    let origin = msg.origin.as_deref().unwrap_or("").to_owned();
                    let (_, credentials) = read_session(&app_data)
                        .unwrap_or((true, vec![]));
                    let matches = if origin.is_empty() {
                        vec![]
                    } else {
                        filter_by_origin(&credentials, &origin)
                    };
                    serde_json::to_string(&CredentialsResponse {
                        r#type: "CREDENTIALS_RESPONSE",
                        credentials: matches,
                        request_id,
                    })
                    .unwrap_or_default()
                }
                "SAVE_CREDENTIAL" => {
                    // Write a pending.json file; the running Tauri app polls it
                    // and asks the user to confirm saving.
                    let pending = serde_json::json!({
                        "title":    msg.title.as_deref().unwrap_or(""),
                        "username": msg.username.as_deref().unwrap_or(""),
                        "password": msg.password.as_deref().unwrap_or(""),
                        "origin":   msg.origin.as_deref().unwrap_or(""),
                    });
                    let _ = std::fs::write(
                        app_data.join("pending.json"),
                        serde_json::to_string(&pending).unwrap_or_default(),
                    );
                    serde_json::json!({ "type": "SAVE_ACK", "requestId": request_id })
                        .to_string()
                }
                _ => continue,
            };

            if write_message(&mut writer, &response_json).is_err() {
                break;
            }
        }
    }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // When launched by Chrome for native messaging, handle stdio protocol
    // and exit — do NOT start the GUI.
    // Chrome passes the extension origin (chrome-extension://ID/) as args[1].
    // We also accept --native-messaging for manual testing.
    let args: Vec<String> = std::env::args().collect();
    let is_native_messaging = args.get(1)
        .map(|a| a.starts_with("chrome-extension://") || a == "--native-messaging")
        .unwrap_or(false);
    if is_native_messaging {
        // Path must match Tauri's app_data_dir() for identifier "com.passwordmanager.app"
        let app_data = dirs::data_dir()
            .unwrap_or_else(|| std::path::PathBuf::from("."))
            .join("com.passwordmanager.app");

        native_messaging::run(app_data);
        return;
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            vault_exists,
            read_vault,
            write_vault,
            delete_vault,
            write_session,
            delete_session,
            get_vault_path,
            register_native_host,
            check_pending_save,
            clear_pending_save,
            backup_vault,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
