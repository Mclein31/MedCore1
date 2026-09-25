import React from 'react';
import { useMedCore } from '../../context/MedCoreContext';
import { formatPeso, formatDuration } from '../../utils/formatters';
import {
  X,
  Send,
  FileCheck2,
  Pill,
  ShieldCheck,
  CreditCard,
  QrCode,
  FileText,
  AlertTriangle,
  Lock,
  ChevronRight,
  ExternalLink,
  Smartphone,
  CheckCircle2,
  Clock
} from 'lucide-react';

export const ContextualActionDrawer: React.FC = () => {
  const {
    isActionDrawerOpen,
    closeActionDrawer,
    selectedEncounter,
    advanceStage,
    nudgeDoctor,
    applyAccreditedCeiling,
    clearPharmacyRts,
    approveHmoFinalLoa,
    settlePatientBalance,
    openDoctorQuickSign,
    openPromissoryModal,
    openGatePassModal,
    setActiveRoute
  } = useMedCore();

  if (!isActionDrawerOpen) return null;

  const enc = selectedEncounter;
  const waterfall = enc.waterfall;
  const pName = enc.patient.fullName || enc.patient.maskedName;
  const elapsed = enc.elapsedMinutesInStage ?? enc.elapsedMinutes;
  const doctorName = enc.attendingDoctor;
  const declared = enc.doctorAgreedFee;
  const ceiling = enc.doctorAgreedFee - enc.doctorExcessPf;
  const hmoName = enc.hmo.hmoName || enc.hmo.providerName;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-end"
      onClick={closeActionDrawer}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50 dark:bg-slate-900/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-navy text-white dark:bg-brand-blue font-bold">
                TIER 4
              </span>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 font-mono">
                Contextual Operational Action Drawer
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Active Case: {pName} ({enc.encounterNumber})
            </p>
          </div>
          <button
            onClick={closeActionDrawer}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
          {/* Active Stage & SLA Tracker */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold uppercase text-slate-500">
                Discharge Workflow Stage
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-brand-blue dark:text-sky-400 border border-sky-500/20">
                {formatDuration(elapsed)} elapsed
              </span>
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {enc.stage.replace(/_/g, ' ')}
            </div>
            <button
              onClick={() => advanceStage(enc.id)}
              className="w-full py-2 px-3 rounded bg-brand-navy hover:bg-slate-800 dark:bg-brand-blue dark:hover:bg-sky-600 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <span>Advance to Next Stage</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Operational Action Blocks */}
          <div className="space-y-3">
            <h4 className="font-mono font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
              Available Interventions
            </h4>

            {/* 1. Doctor PF Intervention */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Doctor Professional Fee Triage
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {doctorName}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Current PF: {formatPeso(declared)} • HMO Ceiling: {formatPeso(ceiling)}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => nudgeDoctor(enc.id)}
                  className="py-1.5 px-2 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center justify-center gap-1 transition-colors"
                >
                  <Send className="w-3 h-3 text-slate-400" />
                  <span>Send SMS Nudge</span>
                </button>
                <button
                  onClick={openDoctorQuickSign}
                  className="py-1.5 px-2 rounded bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-medium text-xs flex items-center justify-center gap-1 transition-colors"
                >
                  <FileCheck2 className="w-3 h-3 text-brand-blue" />
                  <span>Doctor QuickSign</span>
                </button>
              </div>
            </div>

            {/* 2. Pharmacy RTS Clearance */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Pharmacy Return-to-Stock (RTS)
                </span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  PNDF Aligned
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Audits unadministered ward medicines and credit slips to prevent over-billing.
              </p>
              <button
                onClick={() => clearPharmacyRts(enc.id)}
                className="w-full py-1.5 px-2 rounded bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Pill className="w-3 h-3 text-emerald-500" />
                <span>Reconcile Ward Stock & Clear RTS</span>
              </button>
            </div>

            {/* 3. HMO Final eLOA Clearance */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  HMO Final eLOA Adjudication
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {hmoName}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Auto-transmits finalized SOA to HMO portal for real-time electronic letter of authorization.
              </p>
              <button
                onClick={() => approveHmoFinalLoa(enc.id)}
                className="w-full py-1.5 px-2 rounded bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
                <span>Validate & Lock HMO Coverage</span>
              </button>
            </div>

            {/* 4. Financial Settlement Interventions */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Point-of-Sale Settlement Options
                </span>
                <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400">
                  {formatPeso(waterfall.netPatientDue)} Due
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => settlePatientBalance(enc.id, 'QR_PH')}
                  className="py-1.5 px-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center justify-center gap-1 transition-colors shadow-xs"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>QR Ph Pay</span>
                </button>
                <button
                  onClick={openPromissoryModal}
                  className="py-1.5 px-2 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center justify-center gap-1 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>RA 9439 Note</span>
                </button>
              </div>
            </div>

            {/* 5. Gate Pass & Dispute Navigation */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={openGatePassModal}
                className="py-2 px-2 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <QrCode className="w-3.5 h-3.5 text-slate-400" />
                <span>Lobby Gate Pass</span>
              </button>
              <button
                onClick={() => {
                  closeActionDrawer();
                  setActiveRoute('PATIENT_CLARIFY');
                }}
                className="py-2 px-2 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                <span>Patient Clarify</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
