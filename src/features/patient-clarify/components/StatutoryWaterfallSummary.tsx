import React from 'react';
import { StatutoryWaterfall } from '@/types/domain';
import { formatPeso } from '../utils/billFormatters';
import { ShieldCheck, Sparkles, Building, Info } from 'lucide-react';

interface Props {
  waterfall: StatutoryWaterfall;
  hmoName: string;
  isSeniorCitizen?: boolean;
  isPwd?: boolean;
  isNbb?: boolean;
}

export const StatutoryWaterfallSummary: React.FC<Props> = ({
  waterfall,
  hmoName,
  isSeniorCitizen,
  isPwd,
  isNbb
}) => {
  const isSeniorOrPwd = isSeniorCitizen || isPwd;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-600" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
            Statutory Deduction Cascade
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          {isSeniorCitizen && (
            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              RA 9994 Senior
            </span>
          )}
          {isPwd && (
            <span className="text-[10px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
              RA 10754 PWD
            </span>
          )}
          {isNbb && (
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              PhilHealth NBB 100%
            </span>
          )}
        </div>
      </div>

      {/* Waterfall Steps */}
      <div className="p-4 sm:p-5 space-y-3 sm:space-y-3.5 text-xs font-sans">
        {/* Step 1: Gross Charges */}
        <div className="flex items-center justify-between text-slate-700 gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px] shrink-0">
              1
            </span>
            <span className="font-medium truncate">Total Gross Hospital Charges</span>
          </div>
          <span className="font-mono font-bold text-slate-900 text-sm sm:text-base shrink-0">
            {formatPeso(waterfall.grossTotal)}
          </span>
        </div>

        {/* Step 2: 12% VAT Exemption */}
        {waterfall.vatExemption > 0 && (
          <div className="flex items-center justify-between text-emerald-700 bg-emerald-50/50 p-2 sm:p-2.5 rounded-xl border border-emerald-100 gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px] shrink-0">
                2
              </span>
              <div className="min-w-0">
                <span className="font-semibold block truncate">Less: 12% VAT Exemption</span>
                <span className="text-[10px] text-emerald-600 block truncate">Pursuant to RA 9994 / RA 10754</span>
              </div>
            </div>
            <span className="font-mono font-bold text-emerald-800 text-sm sm:text-base shrink-0">
              -{formatPeso(waterfall.vatExemption)}
            </span>
          </div>
        )}

        {/* Step 3: 20% Senior / PWD Discount */}
        {waterfall.seniorPwdDiscount > 0 && (
          <div className="flex items-center justify-between text-emerald-700 bg-emerald-50/50 p-2 sm:p-2.5 rounded-xl border border-emerald-100 gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px] shrink-0">
                3
              </span>
              <div className="min-w-0">
                <span className="font-semibold block truncate">Less: 20% Statutory Discount</span>
                <span className="text-[10px] text-emerald-600 block truncate">Applied on net VAT-exempt base</span>
              </div>
            </div>
            <span className="font-mono font-bold text-emerald-800 text-sm sm:text-base shrink-0">
              -{formatPeso(waterfall.seniorPwdDiscount)}
            </span>
          </div>
        )}

        {/* Step 4: PhilHealth Case Rate */}
        <div className="flex items-center justify-between text-blue-700 bg-blue-50/50 p-2 sm:p-2.5 rounded-xl border border-blue-100 gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[10px] shrink-0">
              {isSeniorOrPwd ? '4' : '2'}
            </span>
            <div className="min-w-0">
              <span className="font-semibold block truncate">Less: PhilHealth Case Rate Benefit</span>
              <span className="text-[10px] text-blue-600 block truncate">
                HCI: {formatPeso(waterfall.philhealthHci)} · PF: {formatPeso(waterfall.philhealthPf)}
              </span>
            </div>
          </div>
          <span className="font-mono font-bold text-blue-800 text-sm sm:text-base shrink-0">
            -{formatPeso(waterfall.philhealthTotal)}
          </span>
        </div>

        {/* Step 5: Commercial HMO LOA */}
        {waterfall.hmoApprovedAmount > 0 && (
          <div className="flex items-center justify-between text-indigo-700 bg-indigo-50/50 p-2 sm:p-2.5 rounded-xl border border-indigo-100 gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center text-[10px] shrink-0">
                {isSeniorOrPwd ? '5' : '3'}
              </span>
              <div className="min-w-0">
                <span className="font-semibold block truncate">Less: {hmoName} Approved LOA</span>
                <span className="text-[10px] text-indigo-600 block truncate">Contracted third-party private coverage</span>
              </div>
            </div>
            <span className="font-mono font-bold text-indigo-800 text-sm sm:text-base shrink-0">
              -{formatPeso(waterfall.hmoApprovedAmount)}
            </span>
          </div>
        )}

        {/* Final Out-of-Pocket Balance */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="font-bold text-slate-900 text-xs sm:text-sm block">
              Patient Out-of-Pocket Liability
            </span>
            <span className="text-[10px] sm:text-[11px] text-slate-500 block truncate">
              Net balance due after all statutory deductions & benefits
            </span>
          </div>
          <div className="text-right shrink-0">
            <span className="font-mono font-extrabold text-slate-900 text-lg sm:text-xl tracking-tight">
              {formatPeso(waterfall.netPatientDue)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
