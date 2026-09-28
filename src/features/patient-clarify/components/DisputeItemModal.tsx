import React, { useState } from 'react';
import { ChargemasterItem } from '@/types/domain';
import { formatPeso } from '../utils/billFormatters';
import { AlertTriangle, X, Check, ShieldAlert } from 'lucide-react';

interface Props {
  item: ChargemasterItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitDispute: (itemId: string, reason: string) => void;
}

export const DisputeItemModal: React.FC<Props> = ({
  item,
  isOpen,
  onClose,
  onSubmitDispute
}) => {
  if (!isOpen || !item) return null;

  const [category, setCategory] = useState('UNADMINISTERED_MED');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reasons = [
    { id: 'UNADMINISTERED_MED', label: 'Medicine not administered / unreturned to pharmacy' },
    { id: 'EXCESS_DOCTOR_FEE', label: 'Doctor professional fee exceeds agreed rate' },
    { id: 'DUPLICATE_DIAGNOSTIC', label: 'Duplicate laboratory / radiology charge' },
    { id: 'UNCONSUMED_SUPPLY', label: 'Ward supply or disposable not utilized' },
    { id: 'OTHER', label: 'Other billing discrepancy' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const selectedReasonLabel = reasons.find((r) => r.id === category)?.label || 'Disputed charge';
    const fullReason = details.trim() ? `${selectedReasonLabel}: ${details.trim()}` : selectedReasonLabel;
    
    setTimeout(() => {
      onSubmitDispute(item.id, fullReason);
      setIsSubmitting(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-rose-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Contest Chargemaster Item
              </h3>
              <p className="text-xs text-rose-700 font-medium">
                Submit an immediate dispute ticket to hospital billing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Item Summary */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 text-xs">
          <div className="text-slate-500 font-medium">Contested Charge:</div>
          <div className="font-bold text-slate-900 text-sm mt-0.5">
            {item.description}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200">
            <span className="font-mono text-slate-500">Code: {item.code}</span>
            <span className="font-mono font-bold text-rose-700 text-sm">
              Your Share: {formatPeso(item.patientOop)}
            </span>
          </div>
        </div>

        {/* Dispute Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans">
          <div>
            <label className="font-bold text-slate-800 block mb-1.5">
              Reason for Contestation
            </label>
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
            <label className="font-bold text-slate-800 block mb-1">
              Additional Details (Optional)
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide nurse name, ward room timing, or context..."
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
            <strong>Patient Protection Notice:</strong> Filing a dispute freezes this line item amount. You will be able to settle the undisputed remainder of your bill immediately without delaying discharge clearance.
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? 'Logging Ticket...' : 'Freeze & File Dispute'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
