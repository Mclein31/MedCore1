import React from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import { formatPhp } from '@/utils/formatters';
import { X, CheckCircle2 } from 'lucide-react';

export const WhyDoIOweThisDrawer: React.FC = () => {
  const {
    isWhyDoIOweThisOpen,
    closeWhyDoIOweThis,
    selectedWhyItem,
    selectedEncounter,
    freezeDisputeItem,
    supervisoryWaiveItem
  } = useMedCore();

  if (!isWhyDoIOweThisOpen || !selectedWhyItem) return null;

  const item = selectedWhyItem;
  const isWaived = item.status === 'SUPERVISORY_WAIVED' || item.status === 'WAIVED';
  const isSeniorOrPwd = Boolean(
    selectedEncounter.patient.seniorCitizenId ||
    selectedEncounter.patient.isSeniorCitizen ||
    selectedEncounter.patient.pwdId ||
    selectedEncounter.patient.isPwd
  );

  const vatExemption = isSeniorOrPwd && item.isVatable
    ? Number((item.grossAmount - item.grossAmount / 1.12).toFixed(2))
    : 0;
  const vatExemptBase = Number((item.grossAmount - vatExemption).toFixed(2));
  const seniorPwdDiscount = isSeniorOrPwd && item.isVatable
    ? Number((vatExemptBase * 0.20).toFixed(2))
    : 0;
  const philhealth = Number((item.philhealthCovered || 0).toFixed(2));
  const hmo = Number((item.hmoCovered || 0).toFixed(2));
  const statutoryAndInsuranceDeductions = Number((vatExemption + seniorPwdDiscount + philhealth + hmo).toFixed(2));
  const preWaiverBalance = Math.max(0, Number((item.grossAmount - statutoryAndInsuranceDeductions).toFixed(2)));
  const supervisoryWaiver = isWaived ? preWaiverBalance : 0;
  const totalDeductions = Number((statutoryAndInsuranceDeductions + supervisoryWaiver).toFixed(2));
  const netPatientDue = isWaived ? 0 : Math.max(0, Number((item.grossAmount - totalDeductions).toFixed(2)));

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex justify-end"
      onClick={closeWhyDoIOweThis}
    >
      <div
        className="w-full max-w-lg bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between bg-white">
          <div>
            <h3 className="font-semibold text-slate-900 text-base">
              Line-Item Explanation
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Natural-language adjudication breakdown for patient clarity
            </p>
          </div>
          <button
            onClick={closeWhyDoIOweThis}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto overscroll-contain space-y-6 text-sm bg-slate-50/50">
          {/* Supervisory Waiver Banner */}
          {isWaived && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold block">Supervisory Waiver Applied</span>
                <span>This line item has been officially waived under RA 9439 discharge protocol. Net patient liability is ₱0.00.</span>
              </div>
            </div>
          )}

          {/* Item Overview */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-mono text-slate-400">
                  {item.code}
                </span>
                <div className="font-semibold text-base text-slate-900 mt-1">
                  {item.description}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {item.category.replace(/_/g, ' ')} · Qty: {item.qty} × {formatPhp(item.unitPrice)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold font-mono text-slate-900">
                  {formatPhp(item.grossAmount)}
                </div>
                <span className="text-xs text-slate-500">Gross Total</span>
              </div>
            </div>
          </div>

          {/* Plain Language Direct Explanation */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1.5">
            <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Why Patient Owes This Balance
            </div>
            <p className="text-sm text-slate-800 leading-relaxed font-normal">
              {item.plainLanguageExplainer}
            </p>
          </div>

          {/* Waterfall Cascade for this Item */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-900">
              Deduction Calculation
            </h4>

            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Gross Hospital Price</span>
                <span className="font-mono text-slate-900 font-medium">
                  {formatPhp(item.grossAmount)}
                </span>
              </div>

              {isSeniorOrPwd && item.isVatable && (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>Less: 12% VAT exemption</span>
                    <span className="font-mono text-emerald-600 font-semibold">
                      -{formatPhp(vatExemption)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Less: 20% Senior/PWD discount</span>
                    <span className="font-mono text-emerald-600 font-semibold">
                      -{formatPhp(seniorPwdDiscount)}
                    </span>
                  </div>
                </>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Less: PhilHealth Case Rate (ACR)</span>
                <span className="font-mono text-slate-700">
                  {philhealth > 0
                    ? `-${formatPhp(philhealth)}`
                    : '₱0.00 (Uncovered)'}
                </span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Less: {selectedEncounter.hmo.providerName} coverage</span>
                <span className="font-mono text-slate-700">
                  {hmo > 0
                    ? `-${formatPhp(hmo)}`
                    : '₱0.00 (Policy inner limit)'}
                </span>
              </div>

              {isWaived && (
                <div className="flex justify-between text-slate-600 bg-emerald-50/60 p-2 rounded-lg border border-emerald-200">
                  <span className="text-emerald-900 font-semibold">Less: Supervisory Goodwill Waiver</span>
                  <span className="font-mono text-emerald-700 font-bold">
                    -{formatPhp(supervisoryWaiver)}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex justify-between text-slate-600 text-xs font-semibold">
                <span>Total Applicable Deductions</span>
                <span className="font-mono text-emerald-700 font-bold">
                  -{formatPhp(totalDeductions)}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                <span className="font-semibold text-slate-900 text-sm">
                  Net Patient Responsibility
                </span>
                <span className="font-mono font-bold text-xl text-slate-900">
                  {formatPhp(netPatientDue)}
                </span>
              </div>
            </div>
          </div>

          {/* Statutory References */}
          <div className="p-3.5 bg-slate-100 rounded-lg text-xs text-slate-600 space-y-1">
            <div><strong className="text-slate-700">RA 9439:</strong> Anti-Hospital Detention Law prohibits holding patients for unpaid balances.</div>
            <div><strong className="text-slate-700">PhilHealth Cir 2024-0037:</strong> 50% rate increase applied to Case Rate bundles.</div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center gap-3">
          {isWaived ? (
            <div className="flex-1 py-2.5 px-3 rounded-lg text-center text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>✓ Waived by Supervisor (₱0.00 Due)</span>
            </div>
          ) : item.status === 'CONTESTED' || item.isDisputed ? (
            <div className="flex-1 py-2.5 px-3 rounded-lg text-center text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200">
              Item Frozen on Dispute Desk
            </div>
          ) : (
            <button
              onClick={() => {
                freezeDisputeItem(
                  selectedEncounter.id,
                  item.id,
                  'Patient questioned coverage disparity during pre-discharge triage'
                );
                closeWhyDoIOweThis();
              }}
              className="flex-1 py-2.5 px-3 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-sm transition-colors shadow-xs"
            >
              Freeze on Dispute Desk
            </button>
          )}

          {!isWaived && item.patientOop > 0 && item.status !== 'CONTESTED' && !item.isDisputed && (
            <button
              onClick={() => {
                supervisoryWaiveItem(
                  selectedEncounter.id,
                  item.id,
                  'Supervisory goodwill courtesy waiver under RA 9439 discharge protocol'
                );
                closeWhyDoIOweThis();
              }}
              className="py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors shadow-xs"
            >
              Waive Balance
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
