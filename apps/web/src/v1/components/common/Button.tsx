import { useStaff } from '../../../staff/session';
import type { Permission } from '@medcore/domain';
import { Loader2 } from '@/v1/components/common/SolarIcons';
import React, { forwardRef } from 'react';
import { BUTTON_VARIANTS, CONTROL_SIZES, type ButtonVariant, type ControlSize } from './controlTokens';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  permission?: Permission;
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
      permission,
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
    ref,
  ) => {
    const { can } = useStaff();
    if (permission && !can(permission)) return null;
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
        {children && <span className="inline-flex min-w-0 items-center">{children}</span>}
        {iconPosition === 'right' && iconElement}
      </button>
    );
  },
);

Button.displayName = 'Button';
