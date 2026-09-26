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
  const dotColor = {
    success: 'bg-emerald-600',
    warning: 'bg-amber-500',
    danger: 'bg-rose-600',
    info: 'bg-blue-600',
    neutral: 'bg-slate-400'
  };

  const textColor = {
    success: 'text-emerald-700 font-bold',
    warning: 'text-amber-700 font-bold',
    danger: 'text-rose-700 font-bold',
    info: 'text-blue-700 font-bold',
    neutral: 'text-slate-600 font-semibold'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs ${textColor[variant]} ${className}`}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        {pulse && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColor[variant]}`}
          />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${dotColor[variant]}`}
        />
      </span>
      <span>{label}</span>
    </span>
  );
};
