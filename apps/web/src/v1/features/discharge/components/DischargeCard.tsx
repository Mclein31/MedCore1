import { ConfirmButton } from '@/v1/components/common';
import { Bed } from '@/v1/components/common/SolarIcons';
import { StatusBadge } from '@/v1/components/common/StatusBadge';
import { useMedCore } from '@/v1/context/MedCoreContext';
import type { Encounter } from '@/v1/types/domain';
import { formatDuration, formatPeso } from '@/v1/utils/formatters';
import React from 'react';

interface DischargeCardProps {
  encounter: Encounter;
  isSelected: boolean;
}

const payerLogoSources: Record<string, string> = {
  maxicare: '/payers/maxicare.png',
  intellicare: '/payers/intellicare.png',
  medicard: '/payers/medicard.png',
  philcare: '/payers/philcare.png',
  'pacific cross': '/payers/pacific-cross.png',
  'etiqa philippines': '/payers/etiqa.svg',
  'caritas health shield': '/payers/caritas.png',
  'insular health care': '/payers/insular.png',
};

const actionButtonClass = '!h-8 !min-h-8 !rounded-md !px-2 !py-0 !text-xs font-semibold';

const PayerIdentity: React.FC<{ name: string; philHealth?: boolean }> = ({ name, philHealth = false }) => {
  const logo = philHealth ? '/payers/philhealth.png' : payerLogoSources[name.trim().toLowerCase()];

  return (
    <span className="flex min-w-0 items-center" role="img" aria-label={name} title={name}>
      {logo && (
        <img
          src={logo}
          alt=""
          aria-hidden="true"
          className="h-5 w-10 shrink-0 object-contain"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      )}
    </span>
  );
};

export const DischargeCard: React.FC<DischargeCardProps> = ({ encounter, isSelected }) => {
  const {
    selectEncounter,
    openDoctorQuickSign,
    openPromissoryModal,
    openGatePassModal,
    advanceStage,
    clearPharmacyRts,
    approveHmoFinalLoa,
    settlePatientBalance,
    nudgeDoctor,
    isSmsSending,
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
              label={<span className="whitespace-nowrap">Start audit</span>}
              modalTitle="Initiate Patient Discharge Audit?"
              modalDescription={`Commence the formal discharge clearance audit for ${patientName} (${encounter.encounterNumber}). This initiates statutory calculations and pharmacy checks.`}
              confirmLabel="Initiate Audit"
              variant="primary"
              confirmVariant="primary"
              contextInfo={[
                { label: 'Patient', value: patientName },
                { label: 'Encounter', value: encounter.encounterNumber },
                { label: 'Room/Bed', value: roomBed },
                { label: 'Attending Doctor', value: doctorName },
              ]}
              size="xs"
              className={actionButtonClass}
              fullWidth
              onConfirm={() => {
                selectEncounter(encounter.id);
                return advanceStage(encounter.id);
              }}
            />
          </div>
        );

      case 'DOCTOR_PF_PENDING':
        return (
          <div className="flex gap-1.5 mt-2.5" onClick={(e) => e.stopPropagation()}>
            <button
              disabled
              onClick={(event) => {
                event.stopPropagation();
                void nudgeDoctor(encounter.id);
              }}
              className={`flex-1 min-w-0 h-8 rounded-md border border-slate-300 hover:bg-slate-100 px-2 text-xs font-semibold text-slate-700 flex items-center justify-center transition-colors whitespace-nowrap ${actionButtonClass}`}
              title="SMS notifications are not available yet"
            >
              <span>{isSmsSending(encounter.id) ? 'Preparing…' : 'Remind doctor'}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                selectEncounter(encounter.id);
                openDoctorQuickSign();
              }}
              className={`flex-1 min-w-0 h-8 rounded-md bg-blue-600 hover:bg-blue-700 px-2 text-xs font-semibold text-white flex items-center justify-center transition-colors whitespace-nowrap ${actionButtonClass}`}
            >
              <span>Review PF</span>
            </button>
          </div>
        );

      case 'PHARMACY_RTS_AUDIT':
        return (
          <div className="mt-3" onClick={(e) => e.stopPropagation()}>
            <ConfirmButton
              permission="discharge:clear-pharmacy"
              label={<span className="whitespace-nowrap">Clear RTS</span>}
              modalTitle="Clear Pharmacy RTS & Reconcile Meds?"
              modalDescription={`Certify that unadministered medicines for ${patientName} are reconciled and credited back by Central Pharmacy.`}
              confirmLabel="Clear RTS"
              variant="success"
              confirmVariant="success"
              contextInfo={[
                { label: 'Patient', value: patientName },
                { label: 'Room/Bed', value: roomBed },
                { label: 'Payer', value: hmoName },
              ]}
              size="xs"
              className={actionButtonClass}
              fullWidth
              onConfirm={() => {
                selectEncounter(encounter.id);
                return clearPharmacyRts(encounter.id);
              }}
            />
          </div>
        );

      case 'HMO_FINAL_LOA':
        return (
          <div className="mt-3" onClick={(e) => e.stopPropagation()}>
            <ConfirmButton
              permission="discharge:final-loa"
              label={<span className="whitespace-nowrap">Confirm eLOA</span>}
              modalTitle="Confirm HMO eLOA Coverage?"
              modalDescription={`Confirm final insurance adjudication and lock approved coverage of ${formatPeso(encounter.waterfall.hmoApprovedAmount)} for ${patientName}.`}
              confirmLabel="Confirm eLOA"
              variant="primary"
              confirmVariant="primary"
              contextInfo={[
                { label: 'Patient', value: patientName },
                { label: 'HMO Provider', value: hmoName },
                { label: 'Approved Amount', value: formatPeso(encounter.waterfall.hmoApprovedAmount) },
                { label: 'Net Patient Due', value: formatPeso(encounter.waterfall.netPatientDue) },
              ]}
              size="xs"
              className={actionButtonClass}
              fullWidth
              onConfirm={() => {
                selectEncounter(encounter.id);
                return approveHmoFinalLoa(encounter.id);
              }}
            />
          </div>
        );

      case 'PENDING_SETTLEMENT':
        return (
          <div className="flex gap-1.5 mt-2.5" onClick={(e) => e.stopPropagation()}>
            <div className="flex-1">
              <ConfirmButton
                permission="payment:record"
                label={<span className="whitespace-nowrap">QR Ph Pay</span>}
                modalTitle="Confirm QR Ph Patient Payment?"
                modalDescription={`Record QR Ph digital payment of ${formatPeso(encounter.waterfall.netPatientDue)} for ${patientName}.`}
                confirmLabel="Record Payment"
                variant="success"
                confirmVariant="success"
                contextInfo={[
                  { label: 'Patient', value: patientName },
                  { label: 'Encounter', value: encounter.encounterNumber },
                  { label: 'Amount Due', value: formatPeso(encounter.waterfall.netPatientDue) },
                ]}
                size="xs"
                className={actionButtonClass}
                fullWidth
                onConfirm={() => {
                  selectEncounter(encounter.id);
                  return settlePatientBalance(encounter.id, 'QR_PH');
                }}
              />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                selectEncounter(encounter.id);
                openPromissoryModal(encounter.id);
              }}
              className={`h-8 whitespace-nowrap rounded-md border border-slate-300 hover:bg-slate-100 px-2 text-xs font-semibold text-slate-700 transition-colors ${actionButtonClass}`}
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
            title={`View discharge pass ${encounter.dischargePass?.passNumber || 'verified'}`}
            aria-label={`View discharge pass ${encounter.dischargePass?.passNumber || 'verified'}`}
            className={`w-full h-8 mt-2.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center transition-colors ${actionButtonClass}`}
          >
            <span>View pass</span>
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
      className={`p-2.5 rounded-lg bg-white border transition-colors cursor-pointer relative shadow-2xs ${slaBorderColor} ${
        isSelected ? 'bg-blue-50/30' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-semibold text-base text-slate-900" title={patientName}>
          {patientName}
        </span>
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

      <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-slate-600">
        <Bed className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="truncate font-semibold text-slate-800" title={`${roomBed} · ${roomType}`}>
          {roomBed} <span className="font-normal text-slate-500">· {roomType}</span>
        </span>
        {encounter.patient.isSeniorCitizen && (
          <span className="shrink-0 rounded bg-amber-50 px-1 text-[10px] font-bold text-amber-700">
            Senior
          </span>
        )}
        {encounter.patient.isPwd && (
          <span className="shrink-0 rounded bg-indigo-50 px-1 text-[10px] font-bold text-indigo-700">
            PWD
          </span>
        )}
      </div>

      <div className="mt-2 truncate text-xs text-slate-700" title={diagnosis}>
        <span className="mr-1 text-slate-400">Dx</span>
        <span className="font-medium">{diagnosis}</span>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs">
        <div className="flex min-w-0 items-center gap-1" aria-label="Coverage providers">
          <PayerIdentity name="PhilHealth" philHealth />
          <PayerIdentity name={hmoName} />
        </div>
        <div className="shrink-0 text-right">
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
