import React from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import { formatPhp } from '@/utils/formatters';
import { X, ExternalLink, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

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

  const getStageTitle = (stage: string) => {
    switch (stage) {
      case 'MGH_DECLARED':
        return 'Step 1 of 6: MGH order declared';
      case 'DOCTOR_PF_PENDING':
        return 'Step 2 of 6: Doctor PF confirmation';
      case 'PHARMACY_RTS_AUDIT':
        return 'Step 3 of 6: Pharmacy return audit';
      case 'HMO_FINAL_LOA':
        return 'Step 4 of 6: HMO final LOA review';
      case 'PENDING_SETTLEMENT':
        return 'Step 5 of 6: Payment settlement';
      case 'CLEARED_GATE_PASS':
        return 'Step 6 of 6: Gate pass issued';
      default:
        return stage;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        onClick={closeDossierDrawer}
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-2xs transition-opacity"
      />

      {/* Drawer Panel (620px width) */}
      <div className="relative w-full max-w-[620px] bg-white border-l border-slate-200 shadow-xl flex flex-col h-full z-10">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between bg-white">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="font-bold text-slate-900 text-xl tracking-tight">
                {enc.patient.fullName || enc.patient.maskedName}
              </h3>
              {enc.patient.isSeniorCitizen && (
                <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                  Senior Citizen
                </span>
              )}
              {enc.patient.isPwd && (
                <span className="text-xs font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-full">
                  PWD
                </span>
              )}
            </div>
            <div className="text-sm text-slate-500 mt-1 font-medium">
              Case <span className="font-mono">{enc.encounterNumber}</span> · {enc.roomBed} ({enc.roomCategory.replace('_', ' ')}) · Attending: <strong>{enc.attendingDoctor}</strong>
            </div>
          </div>

          <button
            onClick={closeDossierDrawer}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-6 text-sm">
          {/* SLA & Stage Summary Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                {isBreached ? (
                  <span className="font-bold text-rose-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>{Math.abs(remainingMinutes)}m overdue (SLA Breached)</span>
                  </span>
                ) : enc.elapsedMinutes >= 25 ? (
                  <span className="font-bold text-amber-700 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>{remainingMinutes}m remaining on 45m SLA</span>
                  </span>
                ) : (
                  <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>On Schedule ({remainingMinutes}m left)</span>
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                MGH declared at {new Date(enc.mghOrderTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {enc.elapsedMinutes}m elapsed
              </div>
            </div>

            <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs">
              {getStageTitle(enc.stage)}
            </span>
          </div>

          {/* Three-Driver Out-of-Pocket Breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Out-of-Pocket Balance Drivers
            </h4>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white shadow-2xs">
              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">
                    1. Room upgrade differential
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Daily rate {formatPhp(enc.dailyRoomRate)} vs. HMO policy allowance {formatPhp(enc.dailyRoomAllowance)}
                  </div>
                </div>
                <span className="font-mono font-bold text-slate-900 text-base">
                  {formatPhp(enc.waterfall.roomUpgradeExcess)}
                </span>
              </div>

              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">
                    2. Non-covered consumables &amp; pharmacy
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Excluded medical supplies &amp; sundry items
                  </div>
                </div>
                <span className="font-mono font-bold text-slate-900 text-base">
                  {formatPhp(enc.waterfall.excludedConsumables)}
                </span>
              </div>

              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">
                    3. Attending doctor excess professional fee
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Declared fee exceeds {enc.hmo.providerName} tariff ceiling
                  </div>
                </div>
                <span className="font-mono font-bold text-slate-900 text-base">
                  {formatPhp(enc.doctorExcessPf)}
                </span>
              </div>
            </div>
          </div>

          {/* Statutory Waterfall Breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Statutory Calculation Breakdown
            </h4>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Gross hospital &amp; doctor charges</span>
                <span className="font-mono font-semibold text-slate-900">
                  {formatPhp(enc.waterfall.grossTotal)}
                </span>
              </div>

              {(enc.patient.isSeniorCitizen || enc.patient.isPwd) && (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>Less: 12% VAT exemption (RA 9994/10754)</span>
                    <span className="font-mono font-semibold text-emerald-700">
                      -{formatPhp(enc.waterfall.vatExemption)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Less: 20% Senior Citizen / PWD discount</span>
                    <span className="font-mono font-semibold text-emerald-700">
                      -{formatPhp(enc.waterfall.seniorPwdDiscount)}
                    </span>
                  </div>
                </>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Less: PhilHealth All Case Rate (ACR)</span>
                <span className="font-mono font-semibold text-blue-700">
                  -{formatPhp(enc.waterfall.philhealthTotal)}
                </span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Less: {enc.hmo.providerName} approved LOA</span>
                <span className="font-mono font-semibold text-blue-700">
                  -{formatPhp(enc.waterfall.hmoApprovedAmount)}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                <span className="font-bold text-slate-900 text-base">
                  Net Patient Balance Due
                </span>
                <span className="font-mono font-bold text-2xl text-slate-900 tabular-nums">
                  {formatPhp(enc.waterfall.netPatientDue)}
                </span>
              </div>
            </div>
          </div>

          {/* Live Operational Timeline / Audit Log */}
          {enc.timeline && enc.timeline.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Operational Milestones &amp; Activity Log
              </h4>
              <div className="space-y-2.5 border border-slate-200 rounded-xl p-4 bg-slate-50/60">
                {enc.timeline.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 text-xs">
                    <div className="font-mono text-slate-400 font-semibold shrink-0 w-16 pt-0.5">
                      {event.timeDisplay}
                    </div>
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-blue-600" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 flex items-center justify-between">
                        <span>{event.title}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{event.actor}</span>
                      </div>
                      <p className="text-slate-600 mt-0.5 leading-relaxed">
                        {event.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick link to full tripartite ledger */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-500">
              Primary diagnosis: <strong>{enc.primaryDiagnosis}</strong> ({enc.primaryIcd10})
            </span>
            <button
              onClick={handleOpenLedger}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>Inspect full itemized ledger</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Drawer Action Footer */}
        <div className="p-5 border-t border-slate-200 bg-white space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            {/* Dynamic Stage Actions */}
            {enc.stage === 'DOCTOR_PF_PENDING' && (
              <button
                onClick={() => applyAccreditedCeiling(enc.id)}
                className="py-2.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-xs transition-colors"
              >
                Apply 15m Ceiling Rate
              </button>
            )}

            {enc.stage === 'PHARMACY_RTS_AUDIT' && (
              <button
                onClick={() => clearPharmacyRts(enc.id)}
                className="py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs transition-colors"
              >
                Clear Pharmacy RTS
              </button>
            )}

            {enc.stage === 'HMO_FINAL_LOA' && (
              <button
                onClick={() => approveHmoFinalLoa(enc.id)}
                className="py-2.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-xs transition-colors"
              >
                Approve HMO Final LOA
              </button>
            )}

            <button
              onClick={() => {
                selectEncounter(enc.id);
                issueDigitalGatePass(enc.id);
              }}
              className="py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs transition-colors"
            >
              Issue Gate Pass
            </button>

            <button
              onClick={() => {
                selectEncounter(enc.id);
                openPromissoryModal(enc.id);
              }}
              className="py-2.5 px-3 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-800 font-semibold text-sm transition-colors"
            >
              RA 9439 Promissory Note
            </button>
          </div>

          <button
            onClick={() => openPatientClarifyDrawer(enc)}
            className="w-full py-2 px-3 text-xs text-blue-600 hover:text-blue-800 font-semibold text-center transition-colors"
          >
            Send Patient Clarify Magic Link (SMS / WhatsApp) →
          </button>
        </div>
      </div>
    </div>
  );
};
