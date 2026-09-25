import React, { useState } from 'react';
import { useMedCore } from '../../context/MedCoreContext';
import { formatPeso } from '../../utils/formatters';
import {
  Stethoscope,
  X,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  Send,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export const DoctorQuickSignModal: React.FC = () => {
  const {
    isDoctorQuickSignOpen,
    closeDoctorQuickSign,
    selectedEncounter,
    nudgeDoctor,
    applyAccreditedCeiling,
    advanceStage
  } = useMedCore();

  const [signedSuccess, setSignedSuccess] = useState(false);

  if (!isDoctorQuickSignOpen) return null;

  const doctorName = selectedEncounter.attendingDoctor;
  const declared = selectedEncounter.doctorAgreedFee;
  const excess = selectedEncounter.doctorExcessPf;
  const ceiling = Math.max(0, declared - excess);
  const prc = selectedEncounter.doctorPan.replace('PAN-', 'PRC-');
  const hmoName = selectedEncounter.hmo.hmoName || selectedEncounter.hmo.providerName;
  const isSigned = Boolean(selectedEncounter.doctorSignedAt);

  const handleApplyCeiling = () => {
    applyAccreditedCeiling(selectedEncounter.id);
    setSignedSuccess(true);
    setTimeout(() => {
      setSignedSuccess(false);
      closeDoctorQuickSign();
    }, 1200);
  };

  const handleSignDeclared = () => {
    advanceStage(selectedEncounter.id);
    setSignedSuccess(true);
    setTimeout(() => {
      setSignedSuccess(false);
      closeDoctorQuickSign();
    }, 1200);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={closeDoctorQuickSign}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-navy dark:bg-brand-blue flex items-center justify-center text-white">
              <Stethoscope className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 font-mono">
                Attending Physician PF QuickSign Portal
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                15-Minute SLA Auto-Ceiling Protection
              </p>
            </div>
          </div>
          <button
            onClick={closeDoctorQuickSign}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Doctor Profile Banner */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {doctorName}
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                License: {prc} • Specialization: Internal Medicine / Surgery
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Mobile: +63 917 882 1920
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-brand-blue dark:text-sky-400 border border-sky-500/20 font-semibold">
                {isSigned ? 'SIGNED' : 'PENDING SIGN'}
              </span>
            </div>
          </div>

          {/* Fee Comparison Grid */}
          <div className="grid grid-cols-2 gap-3 font-mono">
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[10px] text-slate-400 block uppercase">Declared Fee</span>
              <span className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 block">
                {formatPeso(declared)}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 block font-sans">
                Physician requested fee
              </span>
            </div>

            <div className="p-3 rounded-lg border border-sky-200 dark:border-sky-900 bg-sky-50/50 dark:bg-sky-950/30">
              <span className="text-[10px] text-sky-600 dark:text-sky-400 block uppercase font-bold">
                {hmoName} Schedule Ceiling
              </span>
              <span className="text-base font-bold text-sky-700 dark:text-sky-300 mt-1 block">
                {formatPeso(ceiling)}
              </span>
              <span className="text-[10px] text-sky-600/80 dark:text-sky-400/80 mt-0.5 block font-sans">
                Contracted HMO tariff
              </span>
            </div>
          </div>

          {/* Excess Fee Warning */}
          {excess > 0 && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-800 dark:text-amber-300 block text-xs">
                  Excess Professional Fee Detected: {formatPeso(excess)}
                </span>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 leading-snug">
                  Under standard hospital policy, signing without capping charges the {formatPeso(excess)} difference directly to the patient out-of-pocket, risking discharge dispute.
                </p>
              </div>
            </div>
          )}

          {signedSuccess ? (
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-center text-emerald-700 dark:text-emerald-300 font-medium">
              <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-500" />
              Doctor Professional Fee Signed & Tripartite Ledger Recalculated!
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              <button
                onClick={handleApplyCeiling}
                className="w-full py-2.5 px-3 rounded-lg bg-brand-navy hover:bg-slate-800 dark:bg-brand-blue dark:hover:bg-sky-600 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Apply Accredited Schedule Ceiling ({formatPeso(ceiling)})</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleSignDeclared}
                  className="py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors"
                >
                  Sign As Declared ({formatPeso(declared)})
                </button>
                <button
                  onClick={() => {
                    nudgeDoctor(selectedEncounter.id);
                    closeDoctorQuickSign();
                  }}
                  className="py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5 text-slate-400" />
                  <span>Send SMS Portal Link</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
