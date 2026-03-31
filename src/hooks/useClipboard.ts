/**
 * useClipboard.ts
 *
 * Secure clipboard utility with automatic clear.
 *
 * Security note: copied passwords are erased from the clipboard after 30 seconds
 * to prevent inadvertent exposure via clipboard history tools.
 */

import { useCallback, useRef } from 'react';
import { useVaultStore } from '@/store/vault.store';

const CLIPBOARD_CLEAR_DELAY_MS = 30_000; // 30 seconds

export function useClipboard() {
  const pushNotification = useVaultStore((s) => s.pushNotification);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (text: string, label = 'Copied') => {
      try {
        await navigator.clipboard.writeText(text);
        pushNotification(`${label} to clipboard.`, 'success');

        // Schedule clipboard clear
        if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
        clearTimerRef.current = setTimeout(async () => {
          try {
            // Only clear if the clipboard still contains our value
            const current = await navigator.clipboard.readText();
            if (current === text) {
              await navigator.clipboard.writeText('');
            }
          } catch {
            // readText permission may be denied in some environments; ignore
          }
        }, CLIPBOARD_CLEAR_DELAY_MS);
      } catch {
        pushNotification('Failed to copy to clipboard.', 'error');
      }
    },
    [pushNotification]
  );

  return { copy };
}
