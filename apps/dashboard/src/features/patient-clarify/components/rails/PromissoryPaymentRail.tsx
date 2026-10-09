import React, { useState } from 'react';
import { GOVERNMENT_ID_RULES, validateGovernmentId, type GovernmentIdType } from '../../../../../../shared/governmentId';
import { formatPeso } from '../../utils/billFormatters';
import { calculateInstallmentPlan } from '@/utils/financing';
import { ShieldCheck, Scale, Check, FileText } from 'lucide-react';

interface Props {
  amount: number;
  patientName: string;
  onPay: (params: {
    payerName: string;
    payerContact: string;
    promissoryMonths?: 3 | 6 | 12;
    borrowerIdType?: string;
    borrowerIdNumber?: string;
  }) => void;
  isProcessing?: boolean;
}

export const PromissoryPaymentRail: React.FC<Props> = ({
  amount,
  patientName,
  onPay,
  isProcessing
}) => {
  const [months, setMonths] = useState<3 | 6 | 12>(6);
  const [borrowerName, setBorrowerName] = useState(patientName || 'Maria Santos Dela Cruz');
  const [relationship, setRelationship] = useState('PATIENT');
  const [idType, setIdType] = useState<GovernmentIdType>('PHILSYS_NATIONAL_ID');
  const [idNumber, setIdNumber] = useState('');
  const [signed, setSigned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan = calculateInstallmentPlan(amount, months);
  const identity = validateGovernmentId(idType, idNumber);
  const idRule = GOVERNMENT_ID_RULES[idType];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    if (!borrowerName.trim()) {
      setError('Please provide the legal borrower or guarantor full name.');
      return;
    }
    if (!identity.valid) {
      setError(identity.error);
      return;
    }
    if (!signed) {
      setError('Please check the acknowledgment box to execute this legal promissory note.');
      return;
    }

    onPay({
      payerName: borrowerName,
      payerContact: '',
      promissoryMonths: months,
      borrowerIdType: idType,
      borrowerIdNumber: identity.normalized
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4 font-sans text-xs">
      {/* Statutory Header */}
      <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
        <div className="flex items-center gap-2 font-bold text-xs">
          <Scale className="w-4 h-4 text-amber-700 shrink-0" />
          <span>Republic Act No. 9439 Statutory Promissory Note</span>
        </div>
        <p className="text-[11px] text-amber-800 leading-relaxed">
          Pursuant to the Philippine Anti-Hospital Detention Law, medically cleared patients in non-private accommodations are entitled to discharge upon execution of a <strong>0.00% interest</strong> promissory note.
        </p>
      </div>

      {/* Term Selector */}
      <div>
        <label className="font-bold text-slate-800 block mb-1.5">
          Select Statutory Repayment Term (0.00% Interest)
        </label>
        <div className="grid grid-cols-3 gap-2">
          {([3, 6, 12] as const).map((m) => {
            const p = calculateInstallmentPlan(amount, m);
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMonths(m)}
                className={`p-3 rounded-xl border text-center transition-all ${
                  months === m
                    ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-bold text-xs">{m} Months</div>
                <div className="font-mono font-bold text-sm text-slate-900 mt-1">
                  {formatPeso(p.monthlyInstallment)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">/ month</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Schedule Preview */}
      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
        <div className="flex items-center justify-between font-semibold text-xs text-slate-700">
          <span>Principal Financed Amount:</span>
          <span className="font-mono font-bold text-slate-900">{formatPeso(plan.financedAmount)}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>Statutory Interest Rate (RA 9439):</span>
          <span className="font-mono font-bold text-emerald-700">0.00%</span>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>First Due Date:</span>
          <span className="font-medium text-slate-800">October 25, 2026</span>
        </div>
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-900">
          <span>Total Payable:</span>
          <span className="font-mono text-sm">{formatPeso(plan.totalRepayment)}</span>
        </div>
      </div>

      {/* Legal Guarantor Information */}
      <div className="space-y-3">
        <div>
          <label className="font-bold text-slate-800 block mb-1">Borrower / Guarantor Legal Name</label>
          <input
            type="text"
            value={borrowerName}
            onChange={(e) => setBorrowerName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-bold text-slate-800 block mb-1">Government ID Type</label>
            <select
              value={idType}
              onChange={(e) => { setIdType(e.target.value as GovernmentIdType); setIdNumber(''); }}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="PHILSYS_NATIONAL_ID">PhilSys National ID</option>
              <option value="UMID">UMID (SSS / GSIS)</option>
              <option value="DRIVERS_LICENSE">Driver's License (LTO)</option>
              <option value="PASSPORT">Philippine Passport</option>
            </select>
          </div>
          <div>
            <label className="font-bold text-slate-800 block mb-1">ID Number</label>
            <input
              type="text"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              autoComplete="off"
              placeholder={idRule.placeholder}
              aria-invalid={idNumber.length > 0 && !identity.valid}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-2 text-xs text-slate-600">{idRule.hint}</p>
            {idNumber && !identity.valid && <p role="alert" className="mt-2 text-xs text-rose-700">{identity.error}</p>}
          </div>
        </div>
      </div>

      {/* Signature Acknowledgment */}
      <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
        <input
          type="checkbox"
          checked={signed}
          onChange={(e) => setSigned(e.target.checked)}
          className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
        />
        <span className="text-[11px] text-slate-600 leading-relaxed">
          I hereby execute this statutory agreement with St. Jude Medical Center Manila and agree to honor the monthly schedule. I understand this legally authorizes immediate hospital exit clearance.
        </span>
      </label>

      {error && (
        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isProcessing || !identity.valid || !signed}
        className={`w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2 ${
          isProcessing || !identity.valid || !signed ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <FileText className="w-4 h-4" />
        <span>{isProcessing ? 'Executing Promissory Note...' : 'Execute Statutory Promissory Note & Unlock Gate Pass'}</span>
      </button>
    </form>
  );
};
