import React from 'react';
import { useMedCore } from '../../context/MedCoreContext';
import { formatPhp } from '../../utils/formatters';
import {
  X,
  Clock,
  User,
  Shield,
  FileCheck2,
  AlertTriangle,
  Building,
  CheckCircle,
  QrCode,
  Smartphone,
  ExternalLink,
  ChevronRight,
  Receipt,
  FileText
} from 'lucide-react';

export const DischargeDossierDrawer: React.FC = () => {
  const {
    isDossierDrawerOpen,
    closeDossierDrawer,
    dossierEncounter,
    applyAccreditedCeiling,
    clearPharmacyRts,
    approveHmoFinalLoa,
    issueDigitalGatePass,
    openPromissoryModal,
    openPatientClarifyDrawer,
    setActiveRoute,
    selectEncounter
  } = useMedCore();

  if (!isDossierDrawerOpen || !dossierEncounter) return null;

  const enc = dossierEncounter;
  const remainingMinutes = 45 - enc.elapsedMinutes;
  const isBreached = remainingMinutes <= 0;

  const handleOpenLedger = () => {
    selectEncounter(enc.id);
    setActiveRoute('ENCOUNTERS_LEDGER');
    closeDossierDrawer();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        onClick={closeDossierDrawer}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer Panel (600px width) */}
      <div className="relative w-full max-w-[620px] bg-white dark:bg-[#0F172A] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-blue/10 dark:bg-sky-500/10 flex items-center justify-center font-mono font-bold text-brand-blue dark:text-sky-400 text-sm border border-brand-blue/20">
              {enc.roomBed.replace('Room ', '').replace('Bed ', '')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {enc.patient.maskedName}
                </h3>
                {enc.patient.isSeniorCitizen && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
                    SENIOR CITIZEN
                  </span>
                )}
                {enc.patient.isPwd && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-bold">
                    PWD
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                MRN: {enc.patient.mrn} • Case: {enc.encounterNumber} • {enc.roomCategory}
              </div>
            </div>
          </div>

          <button
            onClick={closeDossierDrawer}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body: Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* 45m Statutory SLA Countdown Banner */}
          <div
            className={`p-3.5 rounded-lg border flex items-center justify-between font-mono ${
              isBreached
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
                : enc.elapsedMinutes >= 25
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 shrink-0" />
              <div>
                <div className="font-bold text-xs uppercase tracking-wide">
                  {isBreached
                    ? `45-Minute Discharge SLA Breached (+${Math.abs(remainingMinutes)}m Over)`
                    : `${remainingMinutes} Minutes Remaining on 45m SLA`}
                </div>
                <div className="text-[11px] opacity-80">
                  MGH Declared at {new Date(enc.mghOrderTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {enc.elapsedMinutes}m elapsed
                </div>
              </div>
            </div>

            <span className="text-xs font-bold px-2 py-1 rounded bg-white/60 dark:bg-slate-900/60 border border-current">
              {enc.stage.replace('_', ' ')}
            </span>
          </div>

          {/* Three-Driver Out-of-Pocket Breakdown */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-brand-blue" />
                Three-Driver Patient Responsibility Breakdown
              </h4>
              <span className="text-[10px] font-mono text-slate-400">
                Philippine OOP Architecture
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {/* Driver 1: Room Upgrade Differential */}
              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
                <div className="text-[10px] uppercase font-mono text-slate-400">
                  1. Room Upgrade
                </div>
                <div className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                  {formatPhp(enc.waterfall.roomUpgradeExcess)}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  Rate {formatPhp(enc.dailyRoomRate)} vs allowance {formatPhp(enc.dailyRoomAllowance)}
                </div>
              </div>

              {/* Driver 2: Non-Covered Consumables */}
              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
                <div className="text-[10px] uppercase font-mono text-slate-400">
                  2. Consumables
                </div>
                <div className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                  {formatPhp(enc.waterfall.excludedConsumables)}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  Disallowed supply exclusions &amp; sundries
                </div>
              </div>

              {/* Driver 3: Doctor Excess PF */}
              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
                <div className="text-[10px] uppercase font-mono text-slate-400">
                  3. Doctor Excess PF
                </div>
                <div className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                  {formatPhp(enc.doctorExcessPf)}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  Over HMO tariff ceiling ({enc.attendingDoctor})
                </div>
              </div>
            </div>
          </div>

          {/* Statutory Waterfall Deduction Breakdown */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-2">
              Statutory Waterfall Deductions (Centavo Precision)
            </h4>

            <div className="space-y-1.5 font-mono text-xs divide-y divide-slate-100 dark:divide-slate-800/80">
              <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
                <span>Gross Hospital &amp; Doctor Charges</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatPhp(enc.waterfall.grossTotal)}
                </span>
              </div>

              {(enc.patient.isSeniorCitizen || enc.patient.isPwd) && (
                <>
                  <div className="flex justify-between py-1 text-emerald-600 dark:text-emerald-400">
                    <span>- 12% VAT Exemption (RA 9994/10754)</span>
                    <span>-{formatPhp(enc.waterfall.vatExemption)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-emerald-600 dark:text-emerald-400">
                    <span>- 20% Senior Citizen / PWD Statutory Discount</span>
                    <span>-{formatPhp(enc.waterfall.seniorPwdDiscount)}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between py-1 text-sky-600 dark:text-sky-400">
                <span>- PhilHealth All Case Rate (ACR) Total</span>
                <span>-{formatPhp(enc.waterfall.philhealthTotal)}</span>
              </div>

              <div className="flex justify-between py-1 text-indigo-600 dark:text-indigo-400">
                <span>- HMO Approved LOA ({enc.hmo.providerName})</span>
                <span>-{formatPhp(enc.waterfall.hmoApprovedAmount)}</span>
              </div>

              <div className="flex justify-between pt-2.5 text-sm font-bold text-slate-900 dark:text-slate-100">
                <span>NET PATIENT BALANCE DUE</span>
                <span className="text-base text-rose-600 dark:text-rose-400">
                  {formatPhp(enc.waterfall.netPatientDue)}
                </span>
              </div>
            </div>
          </div>

          {/* Clinical & Claims Diagnostic Details */}
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 flex items-center justify-between text-xs">
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">
                Primary Diagnosis &amp; ICD-10
              </div>
              <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {enc.primaryDiagnosis} ({enc.primaryIcd10})
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                Attending: {enc.attendingDoctor} • Case Rate Code: {enc.philhealth.caseRateCode}
              </div>
            </div>

            <button
              onClick={handleOpenLedger}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors shrink-0"
            >
              <span>Full Ledger</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Drawer Action Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 space-y-2">
          {/* Quick Primary Actions */}
          <div className="grid grid-cols-2 gap-2">
            {/* Action 1: Doctor QuickSign / Ceiling */}
            {enc.stage === 'DOCTOR_PF_PENDING' && (
              <button
                onClick={() => applyAccreditedCeiling(enc.id)}
                className="w-full py-2 px-3 rounded-md bg-amber-500 hover:bg-amber-600 text-white font-mono font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Apply 15m Ceiling Rate
              </button>
            )}

            {/* Action 2: Clear Pharmacy RTS */}
            {enc.stage === 'PHARMACY_RTS_AUDIT' && (
              <button
                onClick={() => clearPharmacyRts(enc.id)}
                className="w-full py-2 px-3 rounded-md bg-sky-600 hover:bg-sky-700 text-white font-mono font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Clear Pharmacy RTS Audit
              </button>
            )}

            {/* Action 3: HMO Approval */}
            {enc.stage === 'HMO_FINAL_LOA' && (
              <button
                onClick={() => approveHmoFinalLoa(enc.id)}
                className="w-full py-2 px-3 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-mono font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Approve HMO Final LOA
              </button>
            )}

            {/* Action 4: Issue Gate Pass */}
            <button
              onClick={() => {
                selectEncounter(enc.id);
                issueDigitalGatePass(enc.id);
              }}
              className="py-2 px-3 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <QrCode className="w-3.5 h-3.5" />
              Issue Gate Pass
            </button>

            {/* Action 5: RA 9439 Promissory Note */}
            <button
              onClick={() => {
                selectEncounter(enc.id);
                openPromissoryModal();
              }}
              className="py-2 px-3 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-mono font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <FileText className="w-3.5 h-3.5" />
              RA 9439 Promissory Note
            </button>
          </div>

          {/* Action 6: Send Patient Clarify Magic Link */}
          <button
            onClick={() => openPatientClarifyDrawer(enc)}
            className="w-full py-2 px-3 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
            <span>Send Patient Clarify Magic Link (SMS / WhatsApp)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
