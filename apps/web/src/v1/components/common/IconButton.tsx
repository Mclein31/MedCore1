import React, { forwardRef } from 'react';
import { BUTTON_VARIANTS, CONTROL_SIZES, type ButtonVariant, type ControlSize } from './controlTokens';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ComponentType<{ className?: string }>;
  variant?: ButtonVariant;
  size?: ControlSize;
  ariaLabel: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon: Icon,
      variant = 'ghost',
      size = 'md',
      ariaLabel,
      title,
      disabled = false,
      className = '',
      type = 'button',
      ...rest
    },
    ref,
  ) => {
    const sizeConfig = CONTROL_SIZES[size];
    const variantClass = BUTTON_VARIANTS[variant];

    const dimensionClass = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-11 h-11' : 'w-9 h-9';

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        aria-label={ariaLabel}
        title={title || ariaLabel}
        className={`inline-flex items-center justify-center shrink-0 ${dimensionClass} ${sizeConfig.radius} ${variantClass} transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${className}`}
        {...rest}
      >
        <Icon className={`${sizeConfig.icon} shrink-0`} />
      </button>
    );
  },
);

IconButton.displayName = 'IconButton';
