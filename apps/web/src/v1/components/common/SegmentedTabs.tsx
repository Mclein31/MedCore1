import React from 'react';
import { CONTROL_SIZES, type ControlSize } from './controlTokens';

export type SegmentedBadgeVariant = 'default' | 'amber' | 'rose' | 'emerald' | 'blue' | 'purple';

export interface SegmentedTabItem<T extends string = string> {
  id: T;
  label: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
  badgeVariant?: SegmentedBadgeVariant;
  title?: string;
}

export interface SegmentedTabsProps<T extends string = string> {
  items: SegmentedTabItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  size?: ControlSize;
  className?: string;
  ariaLabel?: string;
  fullWidth?: boolean;
}

export function SegmentedTabs<T extends string = string>({
  items,
  activeId,
  onChange,
  size = 'md',
  className = '',
  ariaLabel = 'Navigation tabs',
  fullWidth = false,
}: SegmentedTabsProps<T>) {
  const sizeConfig = CONTROL_SIZES[size];

  const badgeVariantClasses: Record<SegmentedBadgeVariant, string> = {
    default: 'bg-slate-200/70 text-slate-700',
    amber: 'bg-amber-100 text-amber-800',
    rose: 'bg-rose-100 text-rose-800',
    emerald: 'bg-emerald-100 text-emerald-800',
    blue: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`${fullWidth ? 'flex w-full' : 'inline-flex'} min-w-0 max-w-full overflow-x-auto items-center gap-1 p-0.5 bg-slate-100 rounded-lg border border-slate-200 ${sizeConfig.text} ${className}`}
    >
      {items.map((item) => {
        const isActive = item.id === activeId;
        const Icon = item.icon;
        const badgeVariant = item.badgeVariant || 'default';

        return (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            title={item.title}
            onClick={() => onChange(item.id)}
            className={`${fullWidth ? 'flex-1 min-w-0' : 'shrink-0'} inline-flex items-center justify-center ${sizeConfig.gap} ${
              size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1'
            } rounded-md font-semibold transition-colors cursor-pointer ${
              isActive
                ? 'bg-white text-brand-teal-dark shadow-2xs font-bold border border-slate-300'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {Icon && <Icon className={`${sizeConfig.icon} shrink-0`} />}
            <span>{item.label}</span>
            {item.badge !== undefined && item.badge !== null && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums ${badgeVariantClasses[badgeVariant]}`}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
