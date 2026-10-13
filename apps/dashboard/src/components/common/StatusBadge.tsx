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
  return (
    <span
      className={`status-badge status-badge-${variant} inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ${className}`}
    >
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
        {pulse && (
          <span
            className="status-badge-dot animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          />
        )}
        <span
          className="status-badge-dot relative inline-flex rounded-full h-2 w-2"
        />
      </span>
      <span>{label}</span>
    </span>
  );
};
