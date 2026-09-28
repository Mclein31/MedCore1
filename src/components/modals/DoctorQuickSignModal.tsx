import React, { useState } from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import { formatPeso } from '@/utils/formatters';
import {
  Stethoscope,
  X,
  FileCheck2,
  CheckCircle2,
  Send,
  AlertTriangle
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
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={closeDoctorQuickSign}
    >
      <div
        className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Physician Professional Fee Clearance
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                15-minute SLA statutory ceiling protection
              </p>
            </div>
          </div>
          <button
            onClick={closeDoctorQuickSign}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-sm">
          {/* Doctor Profile Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between shadow-xs">
            <div>
              <div className="font-bold text-slate-900 text-base">
                {doctorName}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                License: <span className="font-mono font-medium text-slate-800">{prc}</span> • Internal Medicine / Surgery
              </div>
              <div className="text-xs text-slate-500 mt-0.5 font-mono">
                +63 917 882 1920
              </div>
            </div>
            <div className="text-right">
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                isSigned ? 'text-emerald-700' : 'text-amber-700'
              }`}>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isSigned ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                  }`}
                />
                {isSigned ? '✓ Signed' : '● Pending Signature'}
              </span>
            </div>
          </div>

          {/* Fee Comparison Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Declared Fee
              </span>
              <span className="text-2xl font-bold font-mono text-slate-900 mt-1.5 block tabular-nums">
                {formatPeso(declared)}
              </span>
              <span className="text-xs text-slate-500 mt-1 block">
                Physician requested amount
              </span>
            </div>

            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 shadow-xs">
              <span className="text-xs font-semibold text-blue-900 uppercase tracking-wider block">
                {hmoName} Schedule Ceiling
              </span>
              <span className="text-2xl font-bold font-mono text-blue-700 mt-1.5 block tabular-nums">
                {formatPeso(ceiling)}
              </span>
              <span className="text-xs text-blue-700/80 mt-1 block">
                Contracted tariff limit
              </span>
            </div>
          </div>

          {/* Excess Fee Warning */}
          {excess > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 shadow-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <span className="font-bold text-amber-900 block mb-0.5 text-sm">
                  Excess Fee Identified: {formatPeso(excess)}
                </span>
                <p className="text-amber-800">
                  Signing without capping charges the {formatPeso(excess)} difference directly to the patient out-of-pocket, risking discharge dispute and delay.
                </p>
              </div>
            </div>
          )}

          {signedSuccess ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center text-emerald-800 font-semibold">
              <CheckCircle2 className="w-7 h-7 mx-auto mb-1.5 text-emerald-600" />
              Doctor professional fee signed and tripartite ledger updated.
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <button
                onClick={handleApplyCeiling}
                className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Apply Schedule Ceiling ({formatPeso(ceiling)})</span>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleSignDeclared}
                  className="py-2.5 px-3 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-sm transition-colors shadow-xs"
                >
                  Sign As Declared ({formatPeso(declared)})
                </button>
                <button
                  onClick={() => {
                    nudgeDoctor(selectedEncounter.id);
                    closeDoctorQuickSign();
                  }}
                  className="py-2.5 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Send className="w-4 h-4 text-slate-500" />
                  <span>Send SMS Link</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
