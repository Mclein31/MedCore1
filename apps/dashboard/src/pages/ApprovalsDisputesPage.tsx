import React, { useState } from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import { DualOperationalPipelines } from '@/features/command-center/components/DualOperationalPipelines';
import { CoverageApprovalsView } from './CoverageApprovalsPage';
import { DisputesExceptionsView } from './DisputesExceptionsPage';
import { VelocityRecoveryPulse } from '@/features/command-center/components/VelocityRecoveryPulse';
import { Columns, ShieldCheck, AlertTriangle } from '@/components/common/SolarIcons';
import { SegmentedTabs, SegmentedTabItem } from '@/components/common';

export const ApprovalsDisputesPage: React.FC = () => {
  const { encounters } = useMedCore();
  const [subView, setSubView] = useState<'DUAL' | 'ROSTER' | 'DISPUTES'>('DUAL');

  const hmoPendingCount = encounters.filter(
    (e) => e.hmo.finalLoaStatus === 'PENDING_SUBMISSION' || e.hmo.finalLoaStatus === 'AWAITING_CODE'
  ).length;

  const disputedCount = encounters.filter(
    (e) =>
      e.items.some(
        (i) =>
          (i.status === 'CONTESTED' || i.isDisputed) &&
          i.status !== 'SUPERVISORY_WAIVED' &&
          i.status !== 'WAIVED'
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

  const subViewTabs: SegmentedTabItem<'DUAL' | 'ROSTER' | 'DISPUTES'>[] = [
    {
      id: 'DUAL',
      label: 'Dual Pipelines',
      icon: Columns,
      badge: hmoPendingCount + disputedCount,
      badgeVariant: 'amber'
    },
    {
      id: 'ROSTER',
      label: 'HMO Gateway Roster',
      icon: ShieldCheck
    },
    {
      id: 'DISPUTES',
      label: 'Disputes & Promissory',
      icon: AlertTriangle
    }
  ];

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-slate-50">
      {/* Sub-navigation Switcher Bar */}
      <div className="min-h-11 py-2 px-4 sm:px-6 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 z-10 shadow-2xs">
        <div className="min-w-0 max-w-full flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex flex-wrap items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Payer Approvals &amp; Billing Disputes
            </h1>
            <span className="text-slate-300 hidden md:inline">·</span>
            <span className="text-xs font-semibold text-slate-500 hidden md:inline">
              Dual Operational Watch
            </span>
          </div>

          <SegmentedTabs
            size="sm"
            items={subViewTabs}
            activeId={subView}
            onChange={setSubView}
          />
        </div>

        <div className="text-[11px] text-slate-500 hidden lg:flex items-center gap-2 font-medium">
          <span>PhilHealth Circular 2024-0037</span>
          <span className="text-slate-300">·</span>
          <span>RA 9439 Anti-Detention</span>
        </div>
      </div>

      {/* Main Content View */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {subView === 'DUAL' ? (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-slate-50/50">
            <DualOperationalPipelines
              onViewAllPayer={() => setSubView('ROSTER')}
              onViewAllExceptions={() => setSubView('DISPUTES')}
            />
          </div>
        ) : subView === 'ROSTER' ? (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <CoverageApprovalsView />
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <DisputesExceptionsView />
          </div>
        )}
      </div>

      {/* Docked Operational Velocity & Reclaimed Bed-Hours Pulse */}
      <VelocityRecoveryPulse />
    </div>
  );
};

export const ApprovalsDisputesView = ApprovalsDisputesPage;
