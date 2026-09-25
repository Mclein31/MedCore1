import React from 'react';
import { Encounter } from '../../types/domain';
import { useMedCore } from '../../context/MedCoreContext';
import { formatPeso, formatDuration } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';
import {
  Bed,
  Clock,
  Shield,
  Stethoscope,
  ChevronRight,
  AlertCircle,
  FileCheck2,
  Send,
  Pill,
  CreditCard,
  QrCode
} from 'lucide-react';

interface DischargeCardProps {
  encounter: Encounter;
  isSelected: boolean;
}

export const DischargeCard: React.FC<DischargeCardProps> = ({ encounter, isSelected }) => {
  const {
    selectEncounter,
    openActionDrawer,
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

  const handleCardClick = (e: React.MouseEvent) => {
    selectEncounter(encounter.id);
  };

  // Determine stage-specific action button
  const renderQuickAction = () => {
    switch (encounter.stage) {
      case 'MGH_DECLARED':
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              selectEncounter(encounter.id);
              advanceStage(encounter.id);
            }}
            className="w-full mt-2 py-1 px-2 rounded bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900 border border-sky-200 dark:border-sky-800 text-[11px] font-medium text-sky-700 dark:text-sky-300 flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Initiate Discharge Audit</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        );

      case 'DOCTOR_PF_PENDING':
        return (
          <div className="flex gap-1.5 mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                selectEncounter(encounter.id);
                nudgeDoctor(encounter.id);
              }}
              className="flex-1 py-1 px-2 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1 transition-colors"
              title="Send SMS nudge to doctor"
            >
              <Send className="w-2.5 h-2.5 text-slate-400" />
              <span>Nudge SMS</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                selectEncounter(encounter.id);
                openDoctorQuickSign();
              }}
              className="flex-1 py-1 px-2 rounded bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900 border border-sky-200 dark:border-sky-800 text-[11px] font-medium text-sky-700 dark:text-sky-300 flex items-center justify-center gap-1 transition-colors"
            >
              <FileCheck2 className="w-2.5 h-2.5 text-brand-blue dark:text-sky-400" />
              <span>Sign / Ceiling</span>
            </button>
          </div>
        );

      case 'PHARMACY_RTS_AUDIT':
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              selectEncounter(encounter.id);
              clearPharmacyRts(encounter.id);
            }}
            className="w-full mt-2 py-1 px-2 rounded bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Pill className="w-3 h-3 text-emerald-500" />
            <span>Clear RTS & Reconcile Meds</span>
          </button>
        );

      case 'HMO_FINAL_LOA':
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              selectEncounter(encounter.id);
              approveHmoFinalLoa(encounter.id);
            }}
            className="w-full mt-2 py-1 px-2 rounded bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900 border border-sky-200 dark:border-sky-800 text-[11px] font-medium text-sky-700 dark:text-sky-300 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Shield className="w-3 h-3 text-sky-500" />
            <span>Confirm eLOA Coverage</span>
          </button>
        );

      case 'PENDING_SETTLEMENT':
        return (
          <div className="flex gap-1.5 mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                selectEncounter(encounter.id);
                settlePatientBalance(encounter.id, 'QR_PH');
              }}
              className="flex-1 py-1 px-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium flex items-center justify-center gap-1 transition-colors shadow-xs"
            >
              <QrCode className="w-3 h-3" />
              <span>QR Ph Pay</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                selectEncounter(encounter.id);
                openPromissoryModal();
              }}
              className="py-1 px-2 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300 transition-colors"
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
            className="w-full mt-2 py-1 px-2 rounded bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1.5 transition-colors font-mono"
          >
            <QrCode className="w-3 h-3 text-emerald-500" />
            <span>Pass #{encounter.dischargePass?.passNumber || 'VERIFIED'}</span>
          </button>
        );

      default:
        return null;
    }
  };

  const slaBorderColor =
    encounter.slaStatus === 'BREACH'
      ? 'border-rose-400 dark:border-rose-600 ring-1 ring-rose-500/20'
      : encounter.slaStatus === 'WARNING'
      ? 'border-amber-400 dark:border-amber-600 ring-1 ring-amber-500/20'
      : isSelected
      ? 'border-brand-blue ring-1 ring-brand-blue/30 shadow-xs'
      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700';

  return (
    <div
      onClick={handleCardClick}
      className={`p-3 rounded-lg bg-white dark:bg-slate-900/90 border transition-all cursor-pointer relative group ${slaBorderColor} ${
        isSelected ? 'bg-sky-50/30 dark:bg-slate-850' : ''
      }`}
    >
      {/* Top row: Patient Name + Room & Bed */}
      <div className="flex items-start justify-between gap-1 mb-1">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
              {patientName}
            </span>
            {encounter.patient.isSeniorCitizen && (
              <span className="text-[9px] font-mono px-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0 font-bold">
                SC
              </span>
            )}
            {encounter.patient.isPwd && (
              <span className="text-[9px] font-mono px-1 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0 font-bold">
                PWD
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
            <Bed className="w-2.5 h-2.5 text-slate-400" />
            <span>{roomBed}</span>
            <span>•</span>
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
      <div className="my-1.5 py-1.5 border-y border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-600 dark:text-slate-400 space-y-1">
        <div className="flex items-center gap-1 truncate">
          <span className="text-slate-400 shrink-0">Dx:</span>
          <span className="truncate font-medium text-slate-700 dark:text-slate-300">
            {diagnosis}
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-1 truncate text-slate-500">
            <Stethoscope className="w-2.5 h-2.5 text-slate-400 shrink-0" />
            <span className="truncate">{doctorName}</span>
          </div>
          <span className="font-mono text-slate-400 shrink-0">
            {encounter.encounterNumber}
          </span>
        </div>
      </div>

      {/* Bottom row: Payer & Balance */}
      <div className="flex items-center justify-between pt-0.5 text-xs">
        <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
          <Shield className="w-3 h-3 text-slate-400" />
          <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[90px]">
            {hmoName}
          </span>
        </div>
        <div className="text-right">
          <div className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs tabular-nums">
            {formatPeso(encounter.waterfall.netPatientDue)}
          </div>
          <div className="text-[9px] text-slate-400">
            {encounter.waterfall.netPatientDue === 0 ? 'Zero Balance' : 'Net Patient Due'}
          </div>
        </div>
      </div>

      {/* Quick Action Button for the Stage */}
      {renderQuickAction()}
    </div>
  );
};
