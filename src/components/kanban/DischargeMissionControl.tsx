import React from 'react';
import { useMedCore } from '../../context/MedCoreContext';
import { DischargeStage, Encounter } from '../../types/domain';
import { DischargeCard } from './DischargeCard';
import { formatPeso } from '../../utils/formatters';
import {
  Clock,
  ShieldAlert,
  Filter,
  CheckCircle2,
  Stethoscope,
  Pill,
  ShieldCheck,
  CreditCard,
  QrCode
} from 'lucide-react';

interface StageConfig {
  stage: DischargeStage;
  title: string;
  shortTitle: string;
  targetMinutes: string;
  icon: React.ElementType;
}

const STAGES: StageConfig[] = [
  {
    stage: 'MGH_DECLARED',
    title: '1. MGH Order Declared',
    shortTitle: '1. MGH Declared',
    targetMinutes: '<10m',
    icon: Clock
  },
  {
    stage: 'DOCTOR_PF_PENDING',
    title: '2. Doctor PF Pending',
    shortTitle: '2. Doctor PF',
    targetMinutes: '<15m',
    icon: Stethoscope
  },
  {
    stage: 'PHARMACY_RTS_AUDIT',
    title: '3. Pharmacy RTS Audit',
    shortTitle: '3. Pharmacy RTS',
    targetMinutes: '<10m',
    icon: Pill
  },
  {
    stage: 'HMO_FINAL_LOA',
    title: '4. HMO Final LOA Review',
    shortTitle: '4. HMO eLOA',
    targetMinutes: '<20m',
    icon: ShieldCheck
  },
  {
    stage: 'PENDING_SETTLEMENT',
    title: '5. Pending Settlement',
    shortTitle: '5. Settlement',
    targetMinutes: '<10m',
    icon: CreditCard
  },
  {
    stage: 'CLEARED_GATE_PASS',
    title: '6. Cleared & Gate Pass Issued',
    shortTitle: '6. Cleared Pass',
    targetMinutes: 'Completed',
    icon: QrCode
  }
];

export const DischargeMissionControl: React.FC = () => {
  const {
    encounters,
    selectedEncounterId,
    activeFilter,
    setActiveFilter
  } = useMedCore();

  // Apply filters
  const filteredEncounters = encounters.filter((enc) => {
    if (activeFilter === 'WARNING') return enc.slaStatus === 'WARNING';
    if (activeFilter === 'BREACH') return enc.slaStatus === 'BREACH';
    if (activeFilter === 'DISPUTED') {
      return enc.items.some((item) => item.status === 'CONTESTED' || item.isDisputed);
    }
    return true;
  });

  const warningCount = encounters.filter((e) => e.slaStatus === 'WARNING').length;
  const breachCount = encounters.filter((e) => e.slaStatus === 'BREACH').length;
  const disputedCount = encounters.filter((e) =>
    e.items.some((item) => item.status === 'CONTESTED' || item.isDisputed)
  ).length;

  return (
    <div className="flex flex-col h-full bg-slate-50/60 dark:bg-[#0B1120] border-r border-slate-200 dark:border-slate-800">
      {/* Header & Filter Controls */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 font-mono">
              Discharge Clearance Mission Control
            </h2>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-brand-blue dark:text-sky-400 font-semibold border border-sky-500/20">
              {filteredEncounters.length} Inpatient Cases
            </span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Active 6-Stage Tripartite Discharge Pipeline • SLA Target: &lt;45m Total
          </div>
        </div>

        {/* Filter Toggle Badges */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-2 py-1 rounded text-[11px] transition-colors ${
              activeFilter === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-medium'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            All ({encounters.length})
          </button>
          <button
            onClick={() => setActiveFilter('WARNING')}
            className={`px-2 py-1 rounded text-[11px] transition-colors flex items-center gap-1 ${
              activeFilter === 'WARNING'
                ? 'bg-amber-500 text-white font-medium'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
            }`}
          >
            <span>Warning</span>
            <span className="font-bold">({warningCount})</span>
          </button>
          <button
            onClick={() => setActiveFilter('BREACH')}
            className={`px-2 py-1 rounded text-[11px] transition-colors flex items-center gap-1 ${
              activeFilter === 'BREACH'
                ? 'bg-rose-600 text-white font-medium'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
            }`}
          >
            <span>Breach</span>
            <span className="font-bold">({breachCount})</span>
          </button>
          <button
            onClick={() => setActiveFilter('DISPUTED')}
            className={`px-2 py-1 rounded text-[11px] transition-colors flex items-center gap-1 ${
              activeFilter === 'DISPUTED'
                ? 'bg-purple-600 text-white font-medium'
                : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 hover:bg-purple-500/20'
            }`}
          >
            <span>Disputed</span>
            <span className="font-bold">({disputedCount})</span>
          </button>
        </div>
      </div>

      {/* 6-Stage Kanban Board */}
      <div className="flex-1 overflow-x-auto p-3 flex gap-3 min-h-0">
        {STAGES.map((s) => {
          const StageIcon = s.icon;
          const stageEncounters = filteredEncounters.filter(
            (enc) => enc.stage === s.stage
          );
          const totalStageAmount = stageEncounters.reduce(
            (acc, curr) => acc + curr.waterfall.netPatientDue,
            0
          );

          return (
            <div
              key={s.stage}
              className="flex-1 min-w-[240px] max-w-[310px] flex flex-col bg-slate-100/70 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden"
            >
              {/* Column Header */}
              <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <StageIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                      {s.shortTitle}
                    </span>
                  </div>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {stageEncounters.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1">
                  <span>Target: {s.targetMinutes}</span>
                  <span className="tabular-nums font-medium text-slate-600 dark:text-slate-400">
                    {formatPeso(totalStageAmount)}
                  </span>
                </div>
              </div>

              {/* Cards List */}
              <div className="flex-1 p-2 space-y-2.5 overflow-y-auto">
                {stageEncounters.map((encounter) => (
                  <DischargeCard
                    key={encounter.id}
                    encounter={encounter}
                    isSelected={encounter.id === selectedEncounterId}
                  />
                ))}

                {stageEncounters.length === 0 && (
                  <div className="h-28 rounded-lg border border-dashed border-slate-200 dark:border-slate-800/60 flex items-center justify-center text-slate-400 text-[11px] p-2 text-center font-mono">
                    No cases in this stage
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
