import React, { useEffect } from 'react';
import { useVaultStore } from '@/store/vault.store';
import { useAutoLock } from '@/hooks/useAutoLock';
import { NotificationToaster } from '@/components/NotificationToaster';

// Pages
import { SetupPage } from '@/pages/SetupPage';
import { UnlockPage } from '@/pages/UnlockPage';
import { VaultPage } from '@/pages/VaultPage';
import { GeneratorPage } from '@/pages/GeneratorPage';
import { SettingsPage } from '@/pages/SettingsPage';

export const App: React.FC = () => {
  const initialize = useVaultStore((s) => s.initialize);
  const view = useVaultStore((s) => s.view);
  const settings = useVaultStore((s) => s.settings);

  // Apply theme on mount
  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  // Check if vault.json exists on startup
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Auto-lock on inactivity
  useAutoLock();

  return (
    <>
      {view === 'setup'     && <SetupPage />}
      {view === 'unlock'    && <UnlockPage />}
      {view === 'vault'     && <VaultPage />}
      {view === 'generator' && <GeneratorPage />}
      {view === 'settings'  && <SettingsPage />}

      {/* Global toast notifications */}
      <NotificationToaster />
    </>
  );
};
