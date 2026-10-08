import React from 'react';
import { formatPhp } from '@/utils/formatters';
import { WaterfallAggregate } from '@/utils/rcmAnalyticsCalculations';
import { ShieldCheck, Info, CheckCircle2 } from 'lucide-react';

interface HospitalFinancingWaterfallProps {
  waterfall: WaterfallAggregate;
}

export const HospitalFinancingWaterfall: React.FC<HospitalFinancingWaterfallProps> = ({
  waterfall
}) => {
  const {
    grossTotal,
    vatExemption,
    seniorPwdDiscount,
    philhealthTotal,
    hmoApprovedAmount,
    netPatientDue,
    isBalanced,
    balanceDiff,
    vatShare,
    seniorShare,
    philhealthShare,
    hmoShare,
    patientDueShare,
    thirdPartyCoveredRatio
  } = waterfall;

  // Calculate widths for horizontal stacked bar (ensuring minimum visibility if non-zero)
  const segments = [
    {
      id: 'vat',
      label: '12% VAT Exemption',
      legalRef: 'RA 9994 / RA 10754',
      amount: vatExemption,
      share: vatShare,
      color: 'bg-purple-500',
      textColor: 'text-purple-700',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      id: 'senior',
      label: '20% SC/PWD Discount',
      legalRef: 'RA 9994 / RA 10754',
      amount: seniorPwdDiscount,
      share: seniorShare,
      color: 'bg-indigo-500',
      textColor: 'text-indigo-700',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200'
    },
    {
      id: 'philhealth',
      label: 'PhilHealth ACR Benefit',
      legalRef: 'Cir 2024-0037 (+50%)',
      amount: philhealthTotal,
      share: philhealthShare,
      color: 'bg-emerald-600',
      textColor: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200'
    },
    {
      id: 'hmo',
      label: 'Commercial HMO Approved',
      legalRef: '8 Licensed Carriers',
      amount: hmoApprovedAmount,
      share: hmoShare,
      color: 'bg-blue-600',
      textColor: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      id: 'oop',
      label: 'Net Patient Out-of-Pocket',
      legalRef: 'Residual Liability',
      amount: netPatientDue,
      share: patientDueShare,
      color: 'bg-amber-500',
      textColor: 'text-amber-800',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200'
    }
  ];

  return (
    <div className="h-full min-w-0 p-6 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-slate-900">
              Hospital Multi-Payer Financing Waterfall
            </h3>
            {isBalanced ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                100% Balanced (0.00 Centavo Drift)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                Reconciliation Diff: ₱{balanceDiff.toFixed(2)}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Sequential statutory deduction cascade pursuant to RA 9994, RA 10754, RA 11223, and PhilHealth Circular 2024-0037.
          </p>
        </div>

        <div className="text-left font-mono">
          <div className="text-xs text-slate-400 font-sans">Total Chargemaster Gross</div>
          <div className="text-lg font-bold text-slate-900">{formatPhp(grossTotal)}</div>
        </div>
      </div>

      {/* Horizontal Proportional Stacked Cascade Bar */}
      <div className="space-y-2">
        <div className="h-6 w-full rounded-md bg-slate-100 flex overflow-hidden p-0.5 border border-slate-200/80">
          {segments.map((s) => {
            if (s.share <= 0) return null;
            return (
              <div
                key={s.id}
                style={{ width: `${Math.max(s.share, 2)}%` }}
                className={`h-full ${s.color} transition-all relative group first:rounded-l-sm last:rounded-r-sm`}
                title={`${s.label}: ${formatPhp(s.amount)} (${s.share}%)`}
              >
                {/* Tooltip on hover */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-[11px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-20 pointer-events-none">
                  <div className="font-semibold">{s.label}</div>
                  <div className="font-mono text-emerald-300 font-bold">{formatPhp(s.amount)} ({s.share}%)</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend / Metrics Chips below the bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-2">
          {segments.map((s) => (
            <div
              key={s.id}
              className={`p-2.5 rounded-lg border ${s.borderColor} ${s.bgColor} space-y-1`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-xs ${s.color}`} />
                <span className="text-[11px] font-bold text-slate-700 truncate">{s.label}</span>
              </div>
              <div className="font-mono font-bold text-xs text-slate-900">
                {formatPhp(s.amount)}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>{s.legalRef}</span>
                <span className="font-mono font-bold text-slate-700">{s.share}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Analytical Payer Absorption & Household OOP Summary */}
      <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-slate-500 font-medium">Third-Party Absorbed Coverage</div>
          <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
            {formatPhp(philhealthTotal + hmoApprovedAmount)}
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
            {thirdPartyCoveredRatio}% of gross hospital charges
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-slate-500 font-medium">Statutory Social Exemptions</div>
          <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
            {formatPhp(vatExemption + seniorPwdDiscount)}
          </div>
          <div className="text-[11px] text-indigo-700 font-semibold mt-0.5">
            {Number((vatShare + seniorShare).toFixed(1))}% statutory write-down (RA 9994/10754)
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-slate-500 font-medium">Household OOP Burden</div>
          <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
            {formatPhp(netPatientDue)}
          </div>
          <div className="text-[11px] text-amber-700 font-semibold mt-0.5">
            {patientDueShare}% net patient due prior to settlement
          </div>
        </div>
      </div>
    </div>
  );
};
