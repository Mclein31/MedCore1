import React from 'react';
import { PatientBillStatement } from '../types/billing';
import { formatPeso, maskName } from '../utils/billFormatters';
import {
  FileText,
  CreditCard,
  QrCode,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Clock,
  CheckCircle2,
  Calendar,
  Building2,
  Lock
} from 'lucide-react';

interface Props {
  bill: PatientBillStatement;
  isMasked: boolean;
  onOpenStatement: () => void;
  onOpenPaymentModal: () => void;
  onOpenGatePass: () => void;
  onOpenReceipts: () => void;
}

export const PatientBillingInbox: React.FC<Props> = ({
  bill,
  isMasked,
  onOpenStatement,
  onOpenPaymentModal,
  onOpenGatePass,
  onOpenReceipts
}) => {
  const p = bill.patient;
  const f = bill.financials;
  const isSettled = f.remainingBalance <= 0 || bill.state === 'PAID';
  const isDisputed = bill.state === 'DISPUTED' || bill.items.some((i) => i.status === 'CONTESTED');

  const displayName = isMasked ? maskName(p.fullName) : p.fullName;

  return (
    <div className="space-y-6 max-w-3xl mx-auto font-sans">
      {/* Active Encounter Banner */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-600 text-white font-black flex items-center justify-center text-lg sm:text-xl shadow-xs shrink-0">
            {displayName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
                {displayName}
              </h2>
              {p.isSeniorCitizen && (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                  Senior Citizen
                </span>
              )}
              {p.isPwd && (
                <span className="text-[10px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full shrink-0">
                  PWD
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
              <span>MRN: <strong className="font-mono text-slate-700">{p.mrn}</strong></span>
              <span>·</span>
              <span>Room: <strong className="text-slate-800">{p.roomBed}</strong></span>
              <span>·</span>
              <span>Admitted: {p.admissionDate.split('T')[0]}</span>
            </div>
            <div className="text-xs text-slate-600 mt-0.5 truncate">
              Attending Specialist: <strong>{bill.attendingSpecialist}</strong>
            </div>
          </div>
        </div>

        {/* State Chip */}
        <div className="shrink-0 flex md:flex-col items-center md:items-end justify-between flex-wrap gap-2">
          {isSettled ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>✓ Fully Settled & Cleared</span>
            </span>
          ) : isDisputed ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>! Contested Item Under Review</span>
            </span>
          ) : bill.state === 'DRAFT' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
              <Clock className="w-3.5 h-3.5" />
              <span>● Bill Under Hospital Audit</span>
            </span>
          ) : bill.state === 'PARTIALLY_PAID' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <Clock className="w-3.5 h-3.5" />
              <span>● Partially Settled</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <Clock className="w-3.5 h-3.5" />
              <span>● Awaiting Patient Settlement</span>
            </span>
          )}
          <span className="text-[10px] text-slate-400 font-mono">
            {bill.billNumber}
          </span>
        </div>
      </div>

      {/* Hero Financial Card */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Background Subtle Accent */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">
              {isSettled ? 'Net Liability' : 'Outstanding Out-of-Pocket Balance'}
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              As of Today
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-5xl font-black font-mono tracking-tight text-white tabular-nums">
              {formatPeso(f.remainingBalance)}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
            {isSettled
              ? 'Your hospital statement is completely settled. Your digital discharge gate pass is active and verified for departure.'
              : 'Itemized hospital charges have been audited against PhilHealth All Case Rates, senior/PWD discounts, and approved commercial HMO coverage.'}
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-4 border-t border-slate-800 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Total Services</span>
              <span className="font-mono font-bold text-slate-200 text-xs sm:text-sm truncate block">{formatPeso(f.grossTotal)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">PhilHealth</span>
              <span className="font-mono font-bold text-blue-400 text-xs sm:text-sm truncate block">-{formatPeso(f.philhealthTotal)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">HMO Insurance</span>
              <span className="font-mono font-bold text-indigo-400 text-xs sm:text-sm truncate block">-{formatPeso(f.hmoApprovedAmount)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Amount Paid</span>
              <span className="font-mono font-bold text-emerald-400 text-xs sm:text-sm truncate block">{formatPeso(f.amountPaid)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Action Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Tile 1: Review Statement */}
        <div
          onClick={onOpenStatement}
          className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-blue-400 shadow-sm hover:shadow-md cursor-pointer transition-all duration-150 flex flex-col justify-between group"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors">
              Review Statement (eSOA)
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Explore the 5-step statutory deduction cascade, out-of-pocket drivers, and itemized charges.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-blue-600">
            <span>Open Statement Breakdown</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Tile 2: Pay Now or Gate Pass */}
        {isSettled ? (
          <div
            onClick={onOpenGatePass}
            className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-300 hover:border-emerald-500 shadow-sm hover:shadow-md cursor-pointer transition-all duration-150 flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900 group-hover:text-emerald-700 transition-colors">
                Digital Discharge Gate Pass
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Your exit credential is ready. Present the cryptographic QR code to ground floor security.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-700">
              <span>View Discharge Pass</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ) : (
          <div
            onClick={onOpenPaymentModal}
            className="p-5 bg-blue-50/50 rounded-2xl border border-blue-300 hover:border-blue-500 shadow-sm hover:shadow-md cursor-pointer transition-all duration-150 flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-700 transition-colors">
                Pay Now (Demo Multi-Rail)
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Settle instantly via QR Ph, GCash, Maya, Card, or execute an RA 9439 0% promissory note.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-blue-700">
              <span>Proceed to Payment</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
