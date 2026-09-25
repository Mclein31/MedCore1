import React, { useState } from 'react';
import { useMedCore } from '../../context/MedCoreContext';
import { formatPeso } from '../../utils/formatters';
import {
  FileText,
  X,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  CreditCard,
  User,
  ShieldCheck,
  Scale
} from 'lucide-react';

export const DigitalPromissoryModal: React.FC = () => {
  const {
    isPromissoryModalOpen,
    closePromissoryModal,
    selectedEncounter,
    executePromissoryNote
  } = useMedCore();

  const enc = selectedEncounter;
  const balance = enc.waterfall.netPatientDue;

  const [borrowerName, setBorrowerName] = useState(enc.patient.fullName || enc.patient.maskedName);
  const [idType, setIdType] = useState<'PHILSYS_NATIONAL_ID' | 'UMID' | 'DRIVERS_LICENSE'>('PHILSYS_NATIONAL_ID');
  const [idNumber, setIdNumber] = useState('1284-9921-4820-9182');
  const [months, setMonths] = useState<3 | 6 | 12>(6);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isPromissoryModalOpen) return null;

  const monthlyAmortization = Number((balance / months).toFixed(2));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executePromissoryNote(enc.id, borrowerName, idType, idNumber, months);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      closePromissoryModal();
    }, 1400);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={closePromissoryModal}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-navy dark:bg-brand-blue flex items-center justify-center text-white">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 font-mono">
                RA 9439 Statutory Promissory Note Guarantee
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Anti-Hospital Detention Law Compliant Undertaking
              </p>
            </div>
          </div>
          <button
            onClick={closePromissoryModal}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        {isSuccess ? (
          <div className="p-8 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm font-mono">
              Promissory Note Executed & Gate Pass Cleared!
            </h4>
            <p className="text-xs text-slate-500">
              Discharge clearance unlocked. Encrypted promissory contract archived with Legal & Billing.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
            {/* Statutory Compliance Banner */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Republic Act No. 9439 Compliance Guarantee</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                It shall be unlawful for any hospital or medical clinic to detain or cause to be detained persons who desire to leave the hospital grounds for reasons of nonpayment of medical bills.
              </p>
            </div>

            {/* Note Details */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Guarantor / Borrower Name
                </label>
                <input
                  type="text"
                  value={borrowerName}
                  onChange={(e) => setBorrowerName(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-brand-blue"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Government ID Type
                </label>
                <select
                  value={idType}
                  onChange={(e) => setIdType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-brand-blue"
                >
                  <option value="PHILSYS_NATIONAL_ID">PhilSys National ID</option>
                  <option value="UMID">Unified Multi-Purpose ID (UMID)</option>
                  <option value="DRIVERS_LICENSE">LTO Driver's License</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                ID Reference Number
              </label>
              <input
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus:border-brand-blue"
                required
              />
            </div>

            {/* Repayment Amortization Schedule */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                  Repayment Schedule (0% Statutory Interest)
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                  Principal: {formatPeso(balance)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[3, 6, 12].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMonths(m as any)}
                    className={`py-2 px-2 rounded border text-center transition-all ${
                      months === m
                        ? 'border-brand-blue bg-sky-50 dark:bg-sky-950/40 text-brand-navy dark:text-sky-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-mono">{m} Months</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {formatPeso(balance / m)}/mo
                    </div>
                  </button>
                ))}
              </div>

              <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs font-mono">
                <span className="text-slate-500">Monthly Installment ({months} Payments):</span>
                <span className="font-bold text-brand-navy dark:text-sky-300 text-sm">
                  {formatPeso(monthlyAmortization)} / month
                </span>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closePromissoryModal}
                className="py-2 px-3 rounded text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2 px-4 rounded bg-brand-navy hover:bg-slate-800 dark:bg-brand-blue dark:hover:bg-sky-600 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Execute Note & Issue Gate Pass</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
