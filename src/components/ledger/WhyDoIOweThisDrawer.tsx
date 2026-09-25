import React from 'react';
import { useMedCore } from '../../context/MedCoreContext';
import { formatPeso } from '../../utils/formatters';
import {
  HelpCircle,
  X,
  Shield,
  FileQuestion,
  Lock,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';

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
  const isSeniorOrPwd =
    selectedEncounter.patient.isSeniorCitizen ||
    selectedEncounter.patient.isPwd;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-end"
      onClick={closeWhyDoIOweThis}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50 dark:bg-slate-900/80">
          <div>
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-brand-blue dark:text-sky-400" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 font-mono">
                Line-Item Plain-English Explainer
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Natural-language adjudication breakdown for patient clarity
            </p>
          </div>
          <button
            onClick={closeWhyDoIOweThis}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
          {/* Item Overview Card */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {item.code}
                </span>
                <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 mt-1">
                  {item.description}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Category: {item.category.replace(/_/g, ' ')} • Qty: {item.qty} × {formatPeso(item.unitPrice)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100">
                  {formatPeso(item.grossAmount)}
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Gross Total</span>
              </div>
            </div>
          </div>

          {/* Plain English Explanation Box */}
          <div className="p-3.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800">
            <div className="flex items-center gap-1.5 font-semibold text-sky-900 dark:text-sky-300 text-xs mb-1.5">
              <Info className="w-3.5 h-3.5 text-brand-blue" />
              <span>&ldquo;Why Do I Owe This?&rdquo; Direct Answer</span>
            </div>
            <p className="text-sky-900/90 dark:text-sky-200/90 leading-relaxed text-xs">
              {item.plainLanguageExplainer}
            </p>
          </div>

          {/* Tripartite Deduction Cascade Breakdown for this item */}
          <div className="space-y-2">
            <h4 className="font-mono font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
              Multi-Payer Coverage Waterfall
            </h4>
            <div className="space-y-1.5 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-mono text-xs">
              <div className="flex justify-between">
                <span>1. Gross Hospital Price:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatPeso(item.grossAmount)}
                </span>
              </div>

              {isSeniorOrPwd && item.isVatable && (
                <>
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>2. Less: 12% VAT Exemption (RA 9994/10754):</span>
                    <span>- {formatPeso((item.grossAmount / 1.12) * 0.12)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>3. Less: 20% Senior/PWD Discount:</span>
                    <span>- {formatPeso((item.grossAmount / 1.12) * 0.20)}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between text-sky-600 dark:text-sky-400">
                <span>4. Less: PhilHealth Case Rate (ACR):</span>
                <span>
                  {item.philhealthCovered > 0
                    ? `- ${formatPeso(item.philhealthCovered)}`
                    : '₱0.00 (Unbundled / Cap exceeded)'}
                </span>
              </div>

              <div className="flex justify-between text-sky-600 dark:text-sky-400">
                <span>5. Less: HMO Approved LOA ({selectedEncounter.hmo.hmoName || selectedEncounter.hmo.providerName}):</span>
                <span>
                  {item.hmoCovered > 0
                    ? `- ${formatPeso(item.hmoCovered)}`
                    : '₱0.00 (Policy Exclusion / Inner Cap)'}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between font-bold text-sm text-slate-900 dark:text-slate-100">
                <span>Net Patient Due:</span>
                <span className={item.patientOop > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
                  {formatPeso(item.patientOop)}
                </span>
              </div>
            </div>
          </div>

          {/* Statutory and Policy Citations */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-1.5 text-[11px]">
            <div className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
              Regulatory References & Safeguards
            </div>
            <ul className="list-disc list-inside text-slate-500 dark:text-slate-400 space-y-1">
              <li>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">RA 9439:</span> Anti-Hospital Detention Law prohibits holding patients for unpaid balances.
              </li>
              <li>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">PhilHealth Cir 2024-0037:</span> 50% rate increase applied to Case Rate bundles.
              </li>
              <li>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">PNDF / Essential Medicines:</span> Uncovered non-formulary meds flag mandatory alternatives.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center gap-2">
          {item.status === 'CONTESTED' || item.isDisputed ? (
            <div className="flex-1 py-1.5 px-3 rounded bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-medium flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Item Frozen on Dispute Desk</span>
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
              className="flex-1 py-1.5 px-3 rounded bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Freeze on Dispute Desk</span>
            </button>
          )}

          {item.patientOop > 0 && item.status !== 'CONTESTED' && !item.isDisputed && (
            <button
              onClick={() => {
                supervisoryWaiveItem(
                  selectedEncounter.id,
                  item.id,
                  'Supervisory goodwill courtesy waiver under RA 9439 discharge protocol'
                );
                closeWhyDoIOweThis();
              }}
              className="py-1.5 px-3 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors"
            >
              Supervisory Waive
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
