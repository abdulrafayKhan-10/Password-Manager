<#
.SYNOPSIS
  Registers the Password Manager native messaging host for Chrome/Edge/Brave.

.DESCRIPTION
  Run this script ONCE after installing the desktop app and loading the
  extension as an unpacked extension in your browser.

  Steps:
    1. Build the Tauri app:   npm run tauri build
    2. Load the extension from the  extension/dist  folder in Chrome
       (chrome://extensions → Developer mode → Load unpacked)
    3. Copy your extension ID from chrome://extensions
    4. Run this script:  .\setup-native-host.ps1 -ExtensionId YOUR_ID

.PARAMETER ExtensionId
  The Chrome extension ID shown on chrome://extensions (e.g. abcdefghijklmnopqrstuvwxyz123456)

.PARAMETER AppExePath
  Full path to the built password-manager.exe.
  Defaults to: src-tauri\target\release\password-manager.exe (relative to script location)
#>

param(
  [Parameter(Mandatory = $true)]
  [string]$ExtensionId,

  [string]$AppExePath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Resolve paths ─────────────────────────────────────────────────────────────

$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir  # one level up from extension/

if (-not $AppExePath) {
  $AppExePath = Join-Path $ProjectRoot "src-tauri\target\release\password-manager.exe"
}

if (-not (Test-Path $AppExePath)) {
  Write-Error @"
Desktop app binary not found at:
  $AppExePath

Please build the app first:
  npm run tauri build

Or provide the path explicitly:
  .\setup-native-host.ps1 -ExtensionId $ExtensionId -AppExePath "C:\path\to\password-manager.exe"
"@
  exit 1
}

# ── Write manifest JSON ───────────────────────────────────────────────────────

$ManifestDir  = "$env:APPDATA\PasswordManager\NativeHost"
$ManifestPath = "$ManifestDir\com.passwordmanager.native.json"

New-Item -ItemType Directory -Force -Path $ManifestDir | Out-Null

$Manifest = @{
  name             = "com.passwordmanager.native"
  description      = "Password Manager Native Messaging Host"
  path             = $AppExePath
  type             = "stdio"
  allowed_origins  = @("chrome-extension://$ExtensionId/")
} | ConvertTo-Json -Depth 3

Set-Content -Path $ManifestPath -Value $Manifest -Encoding UTF8

Write-Host "✓ Manifest written to: $ManifestPath" -ForegroundColor Green

# ── Register in Windows registry for Chrome, Edge, Brave ─────────────────────

$HostName   = "com.passwordmanager.native"
$RegKey     = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HostName"
$EdgeRegKey = "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\$HostName"

New-Item -Path $RegKey     -Force | Out-Null; Set-ItemProperty -Path $RegKey     -Name "(Default)" -Value $ManifestPath
New-Item -Path $EdgeRegKey -Force | Out-Null; Set-ItemProperty -Path $EdgeRegKey -Name "(Default)" -Value $ManifestPath

Write-Host "✓ Registered for Chrome: $RegKey"  -ForegroundColor Green
Write-Host "✓ Registered for Edge:   $EdgeRegKey" -ForegroundColor Green

# Brave uses Chrome's registry key — already covered above.

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  Native host registered successfully!" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Reload the extension in chrome://extensions" -ForegroundColor Gray
Write-Host "  2. Open the Password Manager desktop app" -ForegroundColor Gray
Write-Host "  3. Unlock your vault" -ForegroundColor Gray
Write-Host "  4. Click the extension icon on any login page" -ForegroundColor Gray
