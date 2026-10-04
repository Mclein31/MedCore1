import React from 'react';
import { Encounter } from '@/types/domain';
import { useMedCore } from '@/context/MedCoreContext';
import { formatPeso, formatDuration } from '@/utils/formatters';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  Bed,
  Shield,
  Stethoscope,
  ChevronRight,
  FileCheck2,
  Send,
  Pill,
  QrCode
} from 'lucide-react';
import { ConfirmButton } from '@/components/common';

interface DischargeCardProps {
  encounter: Encounter;
  isSelected: boolean;
}

export const DischargeCard: React.FC<DischargeCardProps> = ({ encounter, isSelected }) => {
  const {
    selectEncounter,
    openDoctorQuickSign,
    openPromissoryModal,
    openGatePassModal,
    advanceStage,
    nudgeDoctor,
    clearPharmacyRts,
    approveHmoFinalLoa,
    settlePatientBalance
  } = useMedCore();

  const patientName = encounter.patient.fullName || encounter.patient.maskedName;
  const roomBed = encounter.bedNumber || encounter.roomBed;
  const roomType = encounter.roomType || encounter.roomCategory.replace(/_/g, ' ');
  const doctorName = encounter.attendingDoctor;
  const hmoName = encounter.hmo.hmoName || encounter.hmo.providerName;
  const diagnosis = encounter.primaryDiagnosis || encounter.philhealth.primaryDescription;
  const elapsed = encounter.elapsedMinutesInStage ?? encounter.elapsedMinutes;

  const handleCardClick = () => {
    selectEncounter(encounter.id);
  };

  // Determine stage-specific action button
  const renderQuickAction = () => {
    switch (encounter.stage) {
      case 'MGH_DECLARED':
        return (
          <div className="mt-3" onClick={(e) => e.stopPropagation()}>
            <ConfirmButton
              label={
                <span className="flex items-center justify-center gap-1.5">
                  <span>Initiate Discharge Audit</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              }
              modalTitle="Initiate Patient Discharge Audit?"
              modalDescription={`Commence the formal discharge clearance audit for ${patientName} (${encounter.encounterNumber}). This initiates statutory calculations and pharmacy checks.`}
              confirmLabel="Initiate Audit"
              variant="primary"
              confirmVariant="primary"
              contextInfo={[
                { label: 'Patient', value: patientName },
                { label: 'Encounter', value: encounter.encounterNumber },
                { label: 'Room/Bed', value: roomBed },
                { label: 'Attending Doctor', value: doctorName }
              ]}
              size="xs"
              fullWidth
              onConfirm={() => {
                selectEncounter(encounter.id);
                advanceStage(encounter.id);
              }}
            />
          </div>
        );

      case 'DOCTOR_PF_PENDING':
        return (
          <div className="flex gap-2 mt-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                selectEncounter(encounter.id);
                nudgeDoctor(encounter.id);
              }}
              className="flex-1 py-2 px-2.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-xs font-medium text-slate-700 flex items-center justify-center gap-1 transition-colors"
              title="Send SMS nudge to doctor"
            >
              <Send className="w-3 h-3 text-slate-500" />
              <span>Nudge SMS</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                selectEncounter(encounter.id);
                openDoctorQuickSign();
              }}
              className="flex-1 py-2 px-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors shadow-xs"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Apply Ceiling</span>
            </button>
          </div>
        );

      case 'PHARMACY_RTS_AUDIT':
        return (
          <div className="mt-3" onClick={(e) => e.stopPropagation()}>
            <ConfirmButton
              label={
                <span className="flex items-center justify-center gap-1.5">
                  <Pill className="w-3.5 h-3.5" />
                  <span>Clear RTS & Reconcile Meds</span>
                </span>
              }
              modalTitle="Clear Pharmacy RTS & Reconcile Meds?"
              modalDescription={`Certify that unadministered medicines for ${patientName} are reconciled and credited back by Central Pharmacy.`}
              confirmLabel="Clear RTS"
              variant="success"
              confirmVariant="success"
              contextInfo={[
                { label: 'Patient', value: patientName },
                { label: 'Room/Bed', value: roomBed },
                { label: 'Payer', value: hmoName }
              ]}
              size="xs"
              fullWidth
              onConfirm={() => {
                selectEncounter(encounter.id);
                clearPharmacyRts(encounter.id);
              }}
            />
          </div>
        );

      case 'HMO_FINAL_LOA':
        return (
          <div className="mt-3" onClick={(e) => e.stopPropagation()}>
            <ConfirmButton
              label={
                <span className="flex items-center justify-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Confirm eLOA Coverage</span>
                </span>
              }
              modalTitle="Confirm HMO eLOA Coverage?"
              modalDescription={`Confirm final insurance adjudication and lock approved coverage of ${formatPeso(encounter.waterfall.hmoApprovedAmount)} for ${patientName}.`}
              confirmLabel="Confirm eLOA"
              variant="primary"
              confirmVariant="primary"
              contextInfo={[
                { label: 'Patient', value: patientName },
                { label: 'HMO Provider', value: hmoName },
                { label: 'Approved Amount', value: formatPeso(encounter.waterfall.hmoApprovedAmount) },
                { label: 'Net Patient Due', value: formatPeso(encounter.waterfall.netPatientDue) }
              ]}
              size="xs"
              fullWidth
              onConfirm={() => {
                selectEncounter(encounter.id);
                approveHmoFinalLoa(encounter.id);
              }}
            />
          </div>
        );

      case 'PENDING_SETTLEMENT':
        return (
          <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex-1">
              <ConfirmButton
                label={
                  <span className="flex items-center justify-center gap-1">
                    <QrCode className="w-3.5 h-3.5" />
                    <span>QR Ph Pay</span>
                  </span>
                }
                modalTitle="Confirm QR Ph Patient Payment?"
                modalDescription={`Record QR Ph digital payment of ${formatPeso(encounter.waterfall.netPatientDue)} for ${patientName}.`}
                confirmLabel="Record Payment"
                variant="success"
                confirmVariant="success"
                contextInfo={[
                  { label: 'Patient', value: patientName },
                  { label: 'Encounter', value: encounter.encounterNumber },
                  { label: 'Amount Due', value: formatPeso(encounter.waterfall.netPatientDue) }
                ]}
                size="xs"
                fullWidth
                onConfirm={() => {
                  selectEncounter(encounter.id);
                  settlePatientBalance(encounter.id, 'QR_PH');
                }}
              />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                selectEncounter(encounter.id);
                openPromissoryModal(encounter.id);
              }}
              className="py-1 px-2.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors"
              title="RA 9439 Promissory Note Guarantee"
            >
              RA 9439 Note
            </button>
          </div>
        );

      case 'CLEARED_GATE_PASS':
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              selectEncounter(encounter.id);
              openGatePassModal();
            }}
            className="w-full mt-3 py-2 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>View Pass #{encounter.dischargePass?.passNumber || 'Verified'}</span>
          </button>
        );

      default:
        return null;
    }
  };

  const slaBorderColor =
    encounter.slaStatus === 'BREACH'
      ? 'border-rose-300 ring-1 ring-rose-200'
      : encounter.slaStatus === 'WARNING'
      ? 'border-amber-300 ring-1 ring-amber-200'
      : isSelected
      ? 'border-blue-500 ring-1 ring-blue-300 shadow-sm'
      : 'border-slate-200 hover:border-slate-300';

  return (
    <div
      onClick={handleCardClick}
      className={`p-4 rounded-xl bg-white border transition-all cursor-pointer relative shadow-2xs ${slaBorderColor} ${
        isSelected ? 'bg-blue-50/30' : ''
      }`}
    >
      {/* Top row: Patient Name + Room & Bed */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-base text-slate-900 truncate">
              {patientName}
            </span>
            {encounter.patient.isSeniorCitizen && (
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded">
                Senior
              </span>
            )}
            {encounter.patient.isPwd && (
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                PWD
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
            <Bed className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-800">{roomBed}</span>
            <span>·</span>
            <span className="truncate">{roomType}</span>
          </div>
        </div>

        {/* SLA Status Badge */}
        <StatusBadge
          label={formatDuration(elapsed)}
          variant={
            encounter.slaStatus === 'BREACH'
              ? 'danger'
              : encounter.slaStatus === 'WARNING'
              ? 'warning'
              : 'success'
          }
          pulse={encounter.slaStatus === 'BREACH'}
        />
      </div>

      {/* Middle row: Diagnosis & Doctor */}
      <div className="my-2 py-2 border-y border-slate-100 text-xs text-slate-600 space-y-1">
        <div className="flex items-center gap-1 truncate">
          <span className="text-slate-400 shrink-0 font-medium">Dx:</span>
          <span className="truncate font-medium text-slate-800">
            {diagnosis}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 truncate text-slate-500">
            <Stethoscope className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">{doctorName}</span>
          </div>
          <span className="font-mono text-slate-400 text-xs shrink-0">
            {encounter.encounterNumber}
          </span>
        </div>
      </div>

      {/* Bottom row: Payer & Balance */}
      <div className="flex items-center justify-between pt-0.5 text-xs">
        <div className="flex items-center gap-1.5 text-slate-600">
          <Shield className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-800 truncate max-w-[110px]">
            {hmoName}
          </span>
        </div>
        <div className="text-right">
          <div className="font-mono font-bold text-slate-900 text-base tabular-nums">
            {formatPeso(encounter.waterfall.netPatientDue)}
          </div>
          <div className="text-[11px] text-slate-500">
            {encounter.waterfall.netPatientDue === 0 ? 'Zero Balance' : 'Net Due'}
          </div>
        </div>
      </div>

      {/* Quick Action Button for the Stage */}
      {renderQuickAction()}
    </div>
  );
};
