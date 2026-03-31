/**
 * useAutoLock.ts
 *
 * Automatically locks the vault after a configurable period of inactivity.
 * Listens for mousemove, keydown, click, and scroll events to detect activity.
 * The timer resets on every activity event.
 *
 * Security note: we intentionally do NOT use setTimeout with a long delay in a
 * production environment because tabs can be throttled by the browser when
 * hidden. For a desktop Tauri app this is fine; for a browser extension, pair
 * this with a Tauri background listener on the Rust side.
 */

import { useEffect, useRef } from 'react';
import { useVaultStore } from '@/store/vault.store';

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
];

export function useAutoLock() {
  const status = useVaultStore((s) => s.status);
  const autoLockTimeout = useVaultStore((s) => s.settings.autoLockTimeout);
  const lockVault = useVaultStore((s) => s.lockVault);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Only run when the vault is unlocked and auto-lock is not disabled
    if (status !== 'unlocked' || autoLockTimeout === 0) return;

    const timeoutMs = autoLockTimeout * 60 * 1000;

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        lockVault();
      }, timeoutMs);
    };

    // Start the initial timer
    resetTimer();

    // Reset on any user activity
    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, resetTimer, { passive: true })
    );

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, resetTimer)
      );
    };
  }, [status, autoLockTimeout, lockVault]);
}
