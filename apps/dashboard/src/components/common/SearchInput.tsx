import React, { forwardRef } from 'react';
import { Search, X } from 'lucide-react';
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
      size === 'sm' ? 'pl-8 pr-7' : 'pl-9 pr-8';

    const iconClass =
      size === 'sm' ? 'left-2.5 w-3.5 h-3.5' : 'left-3 w-4 h-4';

    const clearButtonClass =
      size === 'sm' ? 'right-2 w-3 h-3' : 'right-2.5 w-3.5 h-3.5';

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
          className={`${sizeConfig.height} ${paddingClass} ${sizeConfig.text} ${sizeConfig.radius} bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 placeholder-slate-400 shadow-2xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed leading-normal ${className}`}
          {...rest}
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className={`absolute ${clearButtonClass} text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer`}
            title="Clear search"
            aria-label="Clear search"
          >
            <X className="w-full h-full" />
          </button>
        )}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
