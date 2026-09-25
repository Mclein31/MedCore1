import React from 'react';

interface StatusBadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  pulse?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = 'neutral',
  pulse = false,
  className = ''
}) => {
  const variantStyles = {
    success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
    danger: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
    info: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30',
    neutral: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border font-mono tracking-tight ${variantStyles[variant]} ${className}`}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              variant === 'danger'
                ? 'bg-rose-500'
                : variant === 'warning'
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
              variant === 'danger'
                ? 'bg-rose-600'
                : variant === 'warning'
                ? 'bg-amber-600'
                : 'bg-emerald-600'
            }`}
          />
        </span>
      )}
      {label}
    </span>
  );
};
