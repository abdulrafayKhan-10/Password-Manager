import React, { useState } from 'react';
import { cn } from '@/lib/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: string;
  error?: string;
  /** If true, adds an eye icon to toggle password visibility */
  passwordToggle?: boolean;
  /** Extra action icon button rendered on the right */
  actionIcon?: string;
  onActionClick?: () => void;
  actionTitle?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  icon,
  error,
  passwordToggle,
  actionIcon,
  onActionClick,
  actionTitle,
  className,
  type,
  ...rest
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputType = passwordToggle ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
          {label}
        </label>
      )}
      <div className="group relative flex items-center">
        {icon && (
          <span className="material-symbols-outlined absolute left-3 text-slate-400 group-focus-within:text-primary transition-colors select-none pointer-events-none z-10">
            {icon}
          </span>
        )}
        <input
          type={inputType}
          className={cn(
            'w-full py-3 bg-white dark:bg-[#251d3d] border border-slate-200 dark:border-primary/20 rounded-lg',
            'focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all',
            'text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm',
            icon ? 'pl-10' : 'pl-4',
            passwordToggle || actionIcon ? 'pr-20' : 'pr-4',
            error && 'border-red-400 focus:ring-red-400/40',
            className
          )}
          {...rest}
        />
        <div className="absolute right-2 flex items-center gap-1">
          {passwordToggle && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              className="p-1.5 text-slate-400 hover:text-primary transition-colors"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              <span className="material-symbols-outlined text-xl">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          )}
          {actionIcon && (
            <button
              type="button"
              tabIndex={-1}
              onClick={onActionClick}
              className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors"
              title={actionTitle}
            >
              <span className="material-symbols-outlined text-xl">{actionIcon}</span>
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-red-500 ml-1">{error}</p>}
    </div>
  );
};
