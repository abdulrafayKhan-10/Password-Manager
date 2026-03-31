import React, { useEffect } from 'react';
import { cn } from '@/lib/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  maxWidth = 'max-w-[520px]',
}) => {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background-dark/80 backdrop-blur-md p-4 animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={cn(
          'relative w-full bg-slate-50 dark:bg-[#1c162e] rounded-xl shadow-2xl',
          'text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-primary/20 overflow-hidden animate-slide-up',          'flex flex-col max-h-[90vh]',          maxWidth
        )}
      >
        {/* Header — always visible */}
        <header className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-primary/10 shrink-0">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-2xl">{icon}</span>
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold tracking-tight">{title}</h2>
              {subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center size-8 rounded-full hover:bg-slate-200 dark:hover:bg-primary/20 transition-colors text-slate-500 dark:text-slate-400"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </header>

        {/* Body */}
        {children}
      </div>
    </div>
  );
};
