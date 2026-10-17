import { ChevronDown } from '@/v1/components/common/SolarIcons';
import React, { forwardRef } from 'react';
import { CONTROL_SIZES, type ControlSize } from './controlTokens';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: ControlSize;
  options?: SelectOption[];
  wrapperClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { children, options, size = 'md', className = '', wrapperClassName = '', disabled = false, ...rest },
    ref,
  ) => {
    const sizeConfig = CONTROL_SIZES[size];

    const paddingClass = size === 'sm' ? 'pl-2.5 pr-7' : 'pl-3 pr-8';
    const chevronClass = size === 'sm' ? 'right-2 w-3.5 h-3.5' : 'right-2.5 w-4 h-4';

    return (
      <div className={`relative inline-flex items-center shrink-0 ${wrapperClassName}`}>
        <select
          ref={ref}
          disabled={disabled}
          className={`${sizeConfig.height} ${paddingClass} ${sizeConfig.text} ${sizeConfig.radius} min-w-0 bg-white border border-control focus:border-brand-teal focus:ring-1 focus:ring-brand-teal text-slate-800 font-medium appearance-none cursor-pointer shadow-2xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          {...rest}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <ChevronDown className={`absolute ${chevronClass} text-slate-400 pointer-events-none`} />
      </div>
    );
  },
);

Select.displayName = 'Select';
