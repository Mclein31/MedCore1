import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import {
  CONTROL_SIZES,
  BUTTON_VARIANTS,
  type ControlSize,
  type ButtonVariant,
} from './controlTokens';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ControlSize;
  icon?: React.ComponentType<{ className?: string }>;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      icon: Icon,
      iconPosition = 'left',
      isLoading = false,
      fullWidth = false,
      disabled = false,
      className = '',
      type = 'button',
      ...rest
    },
    ref
  ) => {
    const sizeConfig = CONTROL_SIZES[size];
    const variantClass = BUTTON_VARIANTS[variant];

    const iconElement = isLoading ? (
      <Loader2 className={`${sizeConfig.icon} animate-spin shrink-0`} />
    ) : Icon ? (
      <Icon className={`${sizeConfig.icon} shrink-0`} />
    ) : null;

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`apple-control inline-flex items-center justify-center ${sizeConfig.gap} ${sizeConfig.height} ${sizeConfig.px} ${sizeConfig.radius} ${sizeConfig.text} ${variantClass} ${
          fullWidth ? 'w-full' : ''
        } transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${className}`}
        {...rest}
      >
        {iconPosition === 'left' && iconElement}
        {children && <span>{children}</span>}
        {iconPosition === 'right' && iconElement}
      </button>
    );
  }
);

Button.displayName = 'Button';
