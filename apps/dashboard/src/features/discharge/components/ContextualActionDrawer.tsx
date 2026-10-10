import React from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import { formatPeso, formatDuration } from '@/utils/formatters';
import {
  X,
  Send,
  FileCheck2,
  Pill,
  ShieldCheck,
  QrCode,
  FileText,
  ChevronRight
} from 'lucide-react';
import { ConfirmButton } from '@/components/common';

export const ContextualActionDrawer: React.FC = () => {
  const {
    isActionDrawerOpen,
    closeActionDrawer,
    selectedEncounter,
    selectEncounter,
    advanceStage,
    clearPharmacyRts,
    approveHmoFinalLoa,
    settlePatientBalance,
    openDoctorQuickSign,
    openPromissoryModal,
    openGatePassModal
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
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end"
      onClick={closeActionDrawer}
    >
      <div
        className="w-full max-w-lg bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50/70">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              Operational Actions
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Active case: <span className="font-semibold text-slate-700">{pName}</span> · <span className="font-mono">{enc.encounterNumber}</span>
            </p>
          </div>
          <button
            onClick={closeActionDrawer}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-5 overflow-y-auto overscroll-contain space-y-5 text-sm bg-slate-50/40">
          {/* Active Stage & SLA Tracker */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-bold uppercase tracking-wider text-slate-600">
                Discharge Workflow Stage
              </span>
              <span className="font-semibold text-slate-700">
                {formatDuration(elapsed)} elapsed
              </span>
            </div>
            <div className="text-lg font-bold text-slate-900">
              {enc.stage.replace(/_/g, ' ')}
            </div>
            <ConfirmButton
              label={
                <span className="flex items-center justify-center gap-2">
                  <span>Advance to Next Stage</span>
                  <ChevronRight className="w-4 h-4" />
                </span>
              }
              modalTitle="Advance Discharge Workflow Stage?"
              modalDescription={`Advance case ${enc.encounterNumber} (${pName}) from ${enc.stage.replace(/_/g, ' ')} to the next discharge stage in the clinical pathway.`}
              confirmLabel="Advance Stage"
              variant="primary"
              confirmVariant="primary"
              contextInfo={[
                { label: 'Patient', value: pName },
                { label: 'Current Stage', value: enc.stage.replace(/_/g, ' ') },
                { label: 'Time in Stage', value: formatDuration(elapsed) },
                { label: 'Room/Bed', value: enc.bedNumber || enc.roomBed }
              ]}
              size="md"
              fullWidth
              onConfirm={() => advanceStage(enc.id)}
            />
          </div>

          {/* Operational Action Blocks */}
          <div className="space-y-4">
            <h4 className="font-bold text-slate-600 uppercase tracking-wider text-xs">
              Available Interventions
            </h4>

            {/* 1. Doctor PF Intervention */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">
                  Doctor Professional Fee Triage
                </span>
                <span className="text-xs text-slate-600 font-medium">
                  {doctorName}
                </span>
              </div>
              <div className="text-xs text-slate-600">
                Current PF: <span className="font-mono font-semibold text-slate-800">{formatPeso(declared)}</span> · Schedule Ceiling: <span className="font-mono font-semibold text-blue-700">{formatPeso(ceiling)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  disabled title="SMS delivery is not configured"
                  className="py-2.5 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Send className="w-3.5 h-3.5 text-slate-500" />
                  <span>SMS Unavailable</span>
                </button>
                <button
                  onClick={openDoctorQuickSign}
                  className="py-2.5 px-3 rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Doctor QuickSign</span>
                </button>
              </div>
            </div>

            {/* 2. Pharmacy RTS Clearance */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">
                  Pharmacy Return-to-Stock (RTS)
                </span>
                <span className="text-xs text-emerald-700 font-bold">
                  ✓ PNDF Aligned
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Audit unadministered ward medicines and credit slips to prevent over-billing.
              </p>
              <ConfirmButton
                label={
                  <span className="flex items-center justify-center gap-1.5">
                    <Pill className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Reconcile Ward Stock & Clear RTS</span>
                  </span>
                }
                modalTitle="Clear Pharmacy Return-to-Stock Audit?"
                modalDescription={`Reconcile ward medicines and certify that all credit slips for ${pName} have been processed with Central Pharmacy.`}
                confirmLabel="Clear RTS"
                variant="outline"
                confirmVariant="success"
                contextInfo={[
                  { label: 'Patient', value: pName },
                  { label: 'Ward/Bed', value: enc.bedNumber || enc.roomBed },
                  { label: 'PNDF Alignment', value: 'Verified' }
                ]}
                size="sm"
                fullWidth
                className="border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800"
                onConfirm={() => clearPharmacyRts(enc.id)}
              />
            </div>

            {/* 3. HMO Final eLOA Clearance */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">
                  HMO Final eLOA Adjudication
                </span>
                <span className="text-xs text-slate-600 font-semibold">
                  {hmoName}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Transmits finalized SOA to HMO portal for real-time electronic letter of authorization.
              </p>
              <ConfirmButton
                label={
                  <span className="flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                    <span>Validate & Lock HMO Coverage</span>
                  </span>
                }
                modalTitle="Validate & Lock HMO Coverage?"
                modalDescription={`Validate final adjudication and lock ${hmoName} coverage amount for ${pName}.`}
                confirmLabel="Lock HMO LOA"
                variant="outline"
                confirmVariant="primary"
                contextInfo={[
                  { label: 'Patient', value: pName },
                  { label: 'Payer', value: hmoName },
                  { label: 'Approved Amount', value: formatPeso(waterfall.hmoApprovedAmount) },
                  { label: 'Patient Due', value: formatPeso(waterfall.netPatientDue) }
                ]}
                size="sm"
                fullWidth
                className="border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-800"
                onConfirm={() => approveHmoFinalLoa(enc.id)}
              />
            </div>

            {/* 4. Financial Settlement Interventions */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">
                  Point-of-Sale Settlement Options
                </span>
                <span className="text-base font-bold font-mono text-slate-900 tabular-nums">
                  {formatPeso(waterfall.netPatientDue)} Due
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <ConfirmButton
                  label={
                    <span className="flex items-center justify-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5" />
                      <span>QR Ph Pay</span>
                    </span>
                  }
                  modalTitle="Confirm QR Ph Patient Settlement?"
                  modalDescription={`Record QR Ph cashless settlement of ${formatPeso(waterfall.netPatientDue)} for ${pName}. This will clear the balance and unlock gate pass generation.`}
                  confirmLabel="Record Payment"
                  variant="success"
                  confirmVariant="success"
                  contextInfo={[
                    { label: 'Patient', value: pName },
                    { label: 'Payment Channel', value: 'Bangko Sentral QR Ph POS' },
                    { label: 'Settlement Amount', value: formatPeso(waterfall.netPatientDue) }
                  ]}
                  size="sm"
                  fullWidth
                  onConfirm={() => settlePatientBalance(enc.id, 'QR_PH')}
                />
                <button
                  onClick={() => {
                    selectEncounter(enc.id);
                    openPromissoryModal(enc.id);
                  }}
                  className="py-2.5 px-3 rounded-lg border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5 text-purple-600" />
                  <span>RA 9439 Note</span>
                </button>
              </div>
            </div>

            {/* 5. Gate Pass Navigation */}
            <div className="pt-1">
              <button
                onClick={openGatePassModal}
                className="w-full py-2.5 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <QrCode className="w-3.5 h-3.5 text-slate-500" />
                <span>Lobby Gate Pass</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
