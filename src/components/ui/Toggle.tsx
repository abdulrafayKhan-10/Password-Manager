import React from 'react';
import { cn } from '@/lib/cn';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  icon?: string;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  icon,
  disabled,
}) => {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-primary/10 border border-slate-200 dark:border-primary/5">
      <div className="flex items-center gap-3">
        {icon && (
          <span className="material-symbols-outlined text-primary/70">{icon}</span>
        )}
        <div>
          {label && <p className="font-medium text-sm">{label}</p>}
          {description && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
          )}
        </div>
      </div>
      <label
        className={cn(
          'relative inline-flex items-center cursor-pointer',
          disabled && 'opacity-50 pointer-events-none'
        )}
      >
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary transition-colors" />
      </label>
    </div>
  );
};
