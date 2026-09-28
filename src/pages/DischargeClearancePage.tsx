import React, { useState } from 'react';
import { ActiveDischargeRadar } from '@/features/discharge/components/ActiveDischargeRadar';
import { DischargeMissionControl } from '@/features/discharge/components/DischargeMissionControl';
import { Columns, Kanban } from 'lucide-react';

export const DischargeClearancePage: React.FC = () => {
  const [subView, setSubView] = useState<'WORKSPACE' | 'KANBAN'>('WORKSPACE');

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-56px)] max-h-[calc(100vh-56px)] overflow-hidden bg-slate-50 pb-3 sm:pb-4">
      {/* Subview Navigation Bar */}
      <div className="px-6 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
        <span className="text-xs text-slate-500 font-medium">
          Discharge Clearance Mission Control · 45-Min Statutory Target
        </span>
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
          <button
            onClick={() => setSubView('WORKSPACE')}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              subView === 'WORKSPACE'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Master / Detail Queue</span>
          </button>
          <button
            onClick={() => setSubView('KANBAN')}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              subView === 'KANBAN'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>6-Stage Pipeline</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {subView === 'WORKSPACE' ? <ActiveDischargeRadar /> : <DischargeMissionControl />}
      </div>
    </div>
  );
};

export const DischargeClearanceView = DischargeClearancePage;
