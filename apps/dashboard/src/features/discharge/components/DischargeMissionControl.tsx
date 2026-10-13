import React from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import { DischargeStage } from '@/types/domain';
import { DischargeCard } from './DischargeCard';
import { formatPeso } from '@/utils/formatters';
import {
  Clock,
  Stethoscope,
  Pill,
  ShieldCheck,
  CreditCard,
  QrCode
} from '@/components/common/SolarIcons';

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
    targetMinutes: 'Done',
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
      return (
        enc.items.some(
          (item) =>
            (item.status === 'CONTESTED' || item.isDisputed) &&
            item.status !== 'SUPERVISORY_WAIVED' &&
            item.status !== 'WAIVED'
        ) ||
        enc.disputes.some(
          (d) =>
            d.status !== 'SUPERVISOR_WAIVED' &&
            (d.status as string) !== 'SUPERVISORY_WAIVED' &&
            d.status !== 'HMO_RECONSIDERED' &&
            (d.status as string) !== 'RESOLVED' &&
            (d.status as string) !== 'WAIVED'
        )
      );
    }
    return true;
  });

  const warningCount = encounters.filter((e) => e.slaStatus === 'WARNING').length;
  const breachCount = encounters.filter((e) => e.slaStatus === 'BREACH').length;
  const disputedCount = encounters.filter(
    (e) =>
      e.items.some(
        (item) =>
          (item.status === 'CONTESTED' || item.isDisputed) &&
          item.status !== 'SUPERVISORY_WAIVED' &&
          item.status !== 'WAIVED'
      ) ||
      e.disputes.some(
        (d) =>
          d.status !== 'SUPERVISOR_WAIVED' &&
          (d.status as string) !== 'SUPERVISORY_WAIVED' &&
          d.status !== 'HMO_RECONSIDERED' &&
          (d.status as string) !== 'RESOLVED' &&
          (d.status as string) !== 'WAIVED'
      )
  ).length;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header & Filter Controls */}
      <div className="p-4 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-slate-900">
              6-Stage Discharge Pipeline
            </h2>
            <span className="text-xs text-slate-500">
              {filteredEncounters.length} active inpatient cases
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Active 6-stage tripartite discharge pipeline · Total SLA target &lt;45m
          </div>
        </div>

        {/* Filter Segmented Controls */}
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({encounters.length})
          </button>
          <button
            onClick={() => setActiveFilter('WARNING')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeFilter === 'WARNING'
                ? 'bg-white text-amber-700 shadow-xs'
                : 'text-slate-600 hover:text-amber-700'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Warning ({warningCount})</span>
          </button>
          <button
            onClick={() => setActiveFilter('BREACH')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeFilter === 'BREACH'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-slate-600 hover:text-rose-700'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Breach ({breachCount})</span>
          </button>
          <button
            onClick={() => setActiveFilter('DISPUTED')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeFilter === 'DISPUTED'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-600 hover:text-purple-700'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>Disputed ({disputedCount})</span>
          </button>
        </div>
      </div>

      {/* 6-Stage Kanban Board */}
      <div className="flex-1 overflow-x-auto p-4 flex gap-4 min-h-0">
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
              className="flex-1 min-w-[270px] max-w-[320px] flex flex-col bg-slate-100/80 rounded-xl border border-slate-200 overflow-hidden"
            >
              {/* Column Header */}
              <div className="p-3 border-b border-slate-200 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <StageIcon className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="font-semibold text-sm text-slate-800 truncate">
                      {s.shortTitle}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                    {stageEncounters.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 mt-1.5">
                  <span>Target: {s.targetMinutes}</span>
                  <span className="tabular-nums font-mono font-semibold text-slate-700">
                    {formatPeso(totalStageAmount)}
                  </span>
                </div>
              </div>

              {/* Cards List */}
              <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                {stageEncounters.map((encounter) => (
                  <DischargeCard
                    key={encounter.id}
                    encounter={encounter}
                    isSelected={encounter.id === selectedEncounterId}
                  />
                ))}

                {stageEncounters.length === 0 && (
                  <div className="h-28 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs p-3 text-center">
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
