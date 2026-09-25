import React from 'react';
import { DischargeMissionControl } from '../components/kanban/DischargeMissionControl';

export const DischargeClearanceView: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100/50 dark:bg-[#070D18]">
      <DischargeMissionControl />
    </div>
  );
};
