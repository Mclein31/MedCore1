import { useStaff } from '../../../staff/session';
import type { Permission } from '@medcore/domain';
import { Loader2 } from '@/v1/components/common/SolarIcons';
import type { ConfirmationContextInfo, ConfirmationModalVariant } from '@/v1/components/modals';
import { useMedCore } from '@/v1/context/MedCoreContext';
import React from 'react';

export type ConfirmButtonVariant = 'primary' | 'success' | 'warning' | 'danger' | 'outline' | 'subtle';
export type ConfirmButtonSize = 'xs' | 'sm' | 'md';

export interface ConfirmButtonProps {
  permission?: Permission;
  label: React.ReactNode;
  /**
   * Title displayed in the confirmation modal.
   * If omitted, modalTitle or a smart derivation from label/title is used.
   */
  title?: string;
  modalTitle?: string;
  /**
   * Action-specific description displayed in the confirmation modal.
   */
  description?: string;
  modalDescription?: string;
  /**
   * Label for the confirmation action inside the modal (e.g., "Approve", "Waive Balance").
   */
  confirmLabel?: string;
  /**
   * Label for the cancel button inside the modal (default: "Cancel").
   */
  cancelLabel?: string;
  /**
   * Visual styling of the button on screen.
   */
  variant?: ConfirmButtonVariant;
  /**
   * Visual theme of the confirmation button in the modal.
   */
  confirmVariant?: ConfirmButtonVariant | ConfirmationModalVariant;
  size?: ConfirmButtonSize;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  disabled?: boolean;
  isLoading?: boolean;
  contextInfo?: ConfirmationContextInfo[];
  fullWidth?: boolean;
  stopPropagation?: boolean;
  ariaLabel?: string;
  requiresValidationFriction?: boolean;
  validationKeyword?: string;
  onConfirm: (e?: React.MouseEvent) => void | Promise<void>;
  onCancel?: () => void;
}

export const ConfirmButton: React.FC<ConfirmButtonProps> = ({
  label,
  permission,
  title,
  modalTitle,
  description,
  modalDescription,
  confirmLabel,
  cancelLabel = 'Cancel',
  variant = 'primary',
  confirmVariant,
  size = 'xs',
  icon: Icon,
  className = '',
  disabled = false,
  isLoading = false,
  contextInfo,
  fullWidth = false,
  stopPropagation = true,
  ariaLabel,
  requiresValidationFriction,
  validationKeyword,
  onConfirm,
  onCancel,
}) => {
  const { can } = useStaff();
  const { requestConfirmation } = useMedCore();

  // Size styling tokens matching hospital command workstation density
  const sizeClasses: Record<ConfirmButtonSize, { btn: string; icon: string; gap: string }> = {
    xs: {
      btn: 'px-2.5 py-1 text-xs rounded-md font-semibold',
      icon: 'w-3 h-3',
      gap: 'gap-1',
    },
    sm: {
      btn: 'px-3 py-1.5 text-xs rounded-lg font-semibold',
      icon: 'w-3.5 h-3.5',
      gap: 'gap-1.5',
    },
    md: {
      btn: 'px-4 py-2 text-sm rounded-lg font-semibold',
      icon: 'w-4 h-4',
      gap: 'gap-2',
    },
  };

  // Button surface variants
  const variantClasses: Record<ConfirmButtonVariant, string> = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs focus:ring-2 focus:ring-blue-500',
    success: 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs focus:ring-2 focus:ring-emerald-500',
    warning: 'bg-amber-700 hover:bg-amber-800 text-white shadow-2xs focus:ring-2 focus:ring-amber-500',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-2xs focus:ring-2 focus:ring-rose-500',
    outline:
      'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs focus:ring-2 focus:ring-slate-400',
    subtle:
      'border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 focus:ring-2 focus:ring-blue-400',
  };

  // Resolve action-specific title and description
  const labelText = typeof label === 'string' ? label : '';
  const resolvedTitle =
    modalTitle || (title ? (title.endsWith('?') ? title : `${title}?`) : `${labelText || 'Confirm Action'}?`);

  const resolvedDescription =
    modalDescription ||
    description ||
    (variant === 'danger' || confirmVariant === 'danger'
      ? 'This is a sensitive operational change that cannot be easily reversed. Verify the details before proceeding.'
      : 'This action will update the active hospital record and execute the revenue cycle workflow.');

  const resolvedConfirmLabel = confirmLabel || labelText || 'Confirm';

  const resolvedModalVariant: ConfirmationModalVariant =
    confirmVariant === 'danger' ||
    confirmVariant === 'warning' ||
    confirmVariant === 'success' ||
    confirmVariant === 'primary'
      ? confirmVariant
      : variant === 'danger'
        ? 'danger'
        : variant === 'warning'
          ? 'warning'
          : variant === 'success'
            ? 'success'
            : 'primary';

  const handleClick = (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.stopPropagation();
    }
    if (disabled || isLoading) return;

    // Launch centralized confirmation modal instead of changing button inline
    requestConfirmation({
      title: resolvedTitle,
      description: resolvedDescription,
      confirmLabel: resolvedConfirmLabel,
      cancelLabel,
      variant: resolvedModalVariant,
      contextInfo,
      requiresValidationFriction,
      validationKeyword,
      onConfirm: async () => {
        await onConfirm(e);
      },
      onCancel,
    });
  };

  if (permission && !can(permission)) return null;
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isLoading}
      title={title || resolvedTitle}
      aria-label={ariaLabel || (typeof label === 'string' ? label : undefined)}
      className={`${fullWidth ? 'flex w-full' : 'inline-flex'} items-center justify-center ${sizeClasses[size].gap} ${sizeClasses[size].btn} ${variantClasses[variant]} ${className} transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
    >
      {isLoading ? (
        <Loader2 className={`${sizeClasses[size].icon} animate-spin`} />
      ) : Icon ? (
        <Icon className={sizeClasses[size].icon} />
      ) : null}
      <span>{label}</span>
    </button>
  );
};
