import React from 'react';
import { useVaultStore } from '@/store/vault.store';
import { cn } from '@/lib/cn';

export const NotificationToaster: React.FC = () => {
  const notifications = useVaultStore((s) => s.notifications);
  const dismiss = useVaultStore((s) => s.dismissNotification);

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80 pointer-events-none">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium',
            'pointer-events-auto animate-slide-up',
            n.type === 'success' &&
              'bg-emerald-500 text-white',
            n.type === 'error' &&
              'bg-red-500 text-white',
            n.type === 'info' &&
              'bg-slate-700 dark:bg-slate-800 text-white'
          )}
        >
          <span className="material-symbols-outlined text-lg shrink-0">
            {n.type === 'success' ? 'check_circle' : n.type === 'error' ? 'error' : 'info'}
          </span>
          <span className="flex-1">{n.message}</span>
          <button
            onClick={() => dismiss(n.id)}
            className="opacity-70 hover:opacity-100 transition-opacity"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      ))}
    </div>
  );
};
