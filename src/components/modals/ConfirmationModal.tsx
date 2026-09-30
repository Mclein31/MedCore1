import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  X,
  Loader2
} from 'lucide-react';

export type ConfirmationModalVariant = 'primary' | 'danger' | 'warning' | 'success';

export interface ConfirmationContextInfo {
  label: string;
  value: string | React.ReactNode;
}

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmationModalVariant;
  contextInfo?: ConfirmationContextInfo[];
  isLoading?: boolean;
  error?: string | null;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  contextInfo,
  isLoading = false,
  error = null,
  onConfirm,
  onCancel
}) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const isExecutingRef = useRef(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const isBusy = isLoading || internalLoading;
  const activeError = error || internalError;

  // Reset internal state and lock body scroll when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setInternalLoading(false);
      setInternalError(null);
      isExecutingRef.current = false;
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      // Focus the cancel button by default for safety
      const timer = setTimeout(() => {
        cancelBtnRef.current?.focus();
      }, 50);
      return () => {
        document.body.style.overflow = originalOverflow;
        clearTimeout(timer);
      };
    } else {
      setInternalLoading(false);
      setInternalError(null);
      isExecutingRef.current = false;
    }
  }, [isOpen]);

  // Handle ESC key and focus trapping
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!isBusy) {
          e.preventDefault();
          onCancel();
        }
        return;
      }

      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isBusy, onCancel]);

  const handleConfirm = useCallback(async () => {
    if (isExecutingRef.current || isBusy) return;

    isExecutingRef.current = true;
    setInternalLoading(true);
    setInternalError(null);

    try {
      await onConfirm();
    } catch (err: unknown) {
      isExecutingRef.current = false;
      setInternalLoading(false);
      const msg = err instanceof Error ? err.message : 'The action could not be completed. Please try again.';
      setInternalError(msg);
    }
  }, [isBusy, onConfirm]);

  if (!isOpen) return null;

  // Variant design tokens matching MedCore1 hospital command workstation language
  const variantTokens = {
    primary: {
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: ShieldCheck,
      confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 shadow-sm'
    },
    danger: {
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: ShieldAlert,
      confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500 shadow-sm'
    },
    warning: {
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: AlertTriangle,
      confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500 shadow-sm'
    },
    success: {
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: CheckCircle2,
      confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500 shadow-sm'
    }
  }[variant];

  const IconComponent = variantTokens.icon;

  const modalContent = (
    <div
      className="fixed inset-0 z-confirmation z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isBusy) {
          onCancel();
        }
      }}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-desc"
        className="relative z-10 w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-900 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 pb-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-white">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${variantTokens.badgeBg}`}
            >
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="confirm-modal-title"
                className="font-bold text-base text-slate-900 leading-snug"
              >
                {title}
              </h3>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">
                Hospital Command Verification
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            aria-label="Close dialog"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-3.5 bg-white text-xs">
          <p id="confirm-modal-desc" className="text-slate-600 leading-relaxed text-xs">
            {description}
          </p>

          {/* Contextual Information Matrix (Optional) */}
          {contextInfo && contextInfo.length > 0 && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 font-sans">
              {contextInfo.map((info, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">{info.label}:</span>
                  <span className="font-semibold text-slate-800 text-right">{info.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Error Banner (if execution failed) */}
          {activeError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block">Action Interrupted:</span>
                <span>{activeError}</span>
              </div>
            </div>
          )}

          <div className="text-[11px] text-slate-400 italic">
            This action will update active hospital operational records and revenue cycle ledgers.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="py-2 px-3.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors shadow-2xs disabled:opacity-40"
          >
            {cancelLabel}
          </button>

          <button
            ref={confirmBtnRef}
            type="button"
            onClick={handleConfirm}
            disabled={isBusy}
            className={`py-2 px-4 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${variantTokens.confirmBtn}`}
          >
            {isBusy ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{confirmLabel}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};
