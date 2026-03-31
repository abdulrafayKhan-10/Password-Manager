import React from 'react';
import { calculateStrength } from '@/crypto/vault-crypto';
import { cn } from '@/lib/cn';

interface StrengthMeterProps {
  password: string;
  className?: string;
}

const LABELS: Record<string, string> = {
  'very-weak': 'Very Weak',
  'weak': 'Weak',
  'fair': 'Fair',
  'strong': 'Strong',
  'very-strong': 'Very Strong',
};

export const StrengthMeter: React.FC<StrengthMeterProps> = ({ password, className }) => {
  const result = calculateStrength(password);

  if (!password) return null;

  return (
    <div className={cn('space-y-1', className)}>
      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${result.pct}%`, backgroundColor: result.color }}
        />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: result.color }}>
        {LABELS[result.label]}
      </p>
    </div>
  );
};
