import React, { forwardRef } from 'react';
import { Search, X } from '@/components/common/SolarIcons';
import { CONTROL_SIZES, type ControlSize } from './controlTokens';

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  size?: ControlSize;
  wrapperClassName?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value,
      onChange,
      onClear,
      placeholder = 'Search...',
      size = 'md',
      className = '',
      wrapperClassName = '',
      disabled = false,
      ...rest
    },
    ref
  ) => {
    const sizeConfig = CONTROL_SIZES[size];

    const paddingClass =
      size === 'sm' ? 'pl-8 pr-9' : 'pl-9 pr-10';

    const iconClass =
      size === 'sm' ? 'left-2.5 w-3.5 h-3.5' : 'left-3 w-4 h-4';

    const clearButtonClass =
      size === 'sm' ? 'right-1.5' : 'right-2';

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange('');
      onClear?.();
    };

    return (
      <div className={`relative flex items-center shrink-0 ${wrapperClassName}`}>
        <Search
          className={`absolute ${iconClass} text-slate-400 pointer-events-none`}
        />
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`${sizeConfig.height} ${paddingClass} ${sizeConfig.text} ${sizeConfig.radius} min-w-0 bg-slate-50 border border-control focus:bg-white focus:border-brand-teal focus:ring-1 focus:ring-brand-teal text-slate-800 placeholder-slate-400 shadow-2xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed leading-normal ${className}`}
          {...rest}
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className={`absolute ${clearButtonClass} w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:text-slate-900 cursor-pointer`}
            title="Clear search"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
