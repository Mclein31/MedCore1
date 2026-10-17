import { Button, IconButton } from '@/v1/components/common';
import { ShieldAlert, X } from '@/v1/components/common/SolarIcons';
import { ViewportOverlay } from '@/v1/components/common/ViewportOverlay';
import type { ChargemasterItem } from '@/v1/types/domain';
import React, { useState } from 'react';
import { formatPeso } from '../utils/billFormatters';

interface Props {
  item: ChargemasterItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitDispute: (itemId: string, reason: string) => Promise<void>;
}

export const DisputeItemModal: React.FC<Props> = ({ item, isOpen, onClose, onSubmitDispute }) => {
  const [category, setCategory] = useState('UNADMINISTERED_MED');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!isOpen || !item) return null;

  const reasons = [
    { id: 'UNADMINISTERED_MED', label: 'Medicine not administered / unreturned to pharmacy' },
    { id: 'EXCESS_DOCTOR_FEE', label: 'Doctor professional fee exceeds agreed rate' },
    { id: 'DUPLICATE_DIAGNOSTIC', label: 'Duplicate laboratory / radiology charge' },
    { id: 'UNCONSUMED_SUPPLY', label: 'Ward supply or disposable not utilized' },
    { id: 'OTHER', label: 'Other billing discrepancy' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    const selectedReasonLabel = reasons.find((r) => r.id === category)?.label || 'Disputed charge';
    const fullReason = details.trim() ? `${selectedReasonLabel}: ${details.trim()}` : selectedReasonLabel;

    try {
      await onSubmitDispute(item.id, fullReason);
      onClose();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'The hospital did not confirm your dispute. Try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ViewportOverlay
      className="overflow-y-auto flex items-center justify-center p-4"
      backdropClassName="bg-slate-900/50 backdrop-blur-xs"
      motion="rise"
      layer="modal"
    >
      <div className="bg-white rounded-xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-rose-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Contest Chargemaster Item</h3>
              <p className="text-xs text-rose-700 font-medium">
                Submit an immediate dispute ticket to hospital billing
              </p>
            </div>
          </div>
          <IconButton size="sm" variant="ghost" icon={X} onClick={onClose} ariaLabel="Close modal" />
        </div>

        {/* Item Summary */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 text-xs">
          <div className="text-slate-500 font-medium">Contested Charge:</div>
          <div className="font-bold text-slate-900 text-sm mt-0.5">{item.description}</div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200">
            <span className="font-mono text-slate-500">Code: {item.code}</span>
            <span className="font-mono font-bold text-rose-700 text-sm">
              Your Share: {formatPeso(item.patientOop)}
            </span>
          </div>
        </div>

        {/* Dispute Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans">
          {error && (
            <p role="alert" className="text-rose-700">
              {error}
            </p>
          )}
          <div>
            <label className="font-bold text-slate-800 block mb-1.5">Reason for Contestation</label>
            <div className="space-y-2">
              {reasons.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    category === r.id
                      ? 'bg-blue-50/70 border-blue-400 text-blue-900 font-semibold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="disputeCategory"
                    checked={category === r.id}
                    onChange={() => setCategory(r.id)}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs leading-snug">{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-800 block mb-1">Additional Details (Optional)</label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide nurse name, ward room timing, or context..."
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
            <strong>Patient Protection Notice:</strong> Filing a dispute freezes this line item amount. You
            will be able to settle the undisputed remainder of your bill immediately without delaying
            discharge clearance.
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" size="md" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="md" variant="destructive" isLoading={isSubmitting}>
              Freeze &amp; File Dispute
            </Button>
          </div>
        </form>
      </div>
    </ViewportOverlay>
  );
};
