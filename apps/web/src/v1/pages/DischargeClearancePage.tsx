import type { SegmentedTabItem } from '@/v1/components/common';
import { SegmentedTabs } from '@/v1/components/common';
import { Columns, Kanban } from '@/v1/components/common/SolarIcons';
import { ActiveDischargeRadar } from '@/v1/features/discharge/components/ActiveDischargeRadar';
import { DischargeMissionControl } from '@/v1/features/discharge/components/DischargeMissionControl';
import React, { useState } from 'react';

const VIEW_TABS: SegmentedTabItem<'WORKSPACE' | 'KANBAN'>[] = [
  { id: 'WORKSPACE', label: 'Master / Detail Queue', icon: Columns },
  { id: 'KANBAN', label: '6-Stage Pipeline', icon: Kanban },
];

export const DischargeClearancePage: React.FC = () => {
  const [subView, setSubView] = useState<'WORKSPACE' | 'KANBAN'>('WORKSPACE');

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-slate-50">
      {/* Subview Navigation Bar */}
      <div className="px-4 sm:px-6 py-2 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs">
        <div className="min-w-0 flex flex-wrap items-center gap-2">
          <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            Discharge Clearance Mission Control
          </h1>
          <span className="text-slate-300 hidden sm:inline">·</span>
          <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
            45-Min Statutory Target
          </span>
        </div>
        <SegmentedTabs size="sm" items={VIEW_TABS} activeId={subView} onChange={setSubView} />
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {subView === 'WORKSPACE' ? <ActiveDischargeRadar /> : <DischargeMissionControl />}
      </div>
    </div>
  );
};

export const DischargeClearanceView = DischargeClearancePage;
