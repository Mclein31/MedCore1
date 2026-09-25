import React from 'react';
import { PriorityActionStrip } from '../components/dashboard/PriorityActionStrip';
import { ActiveDischargeRadar } from '../components/dashboard/ActiveDischargeRadar';
import { DualOperationalPipelines } from '../components/dashboard/DualOperationalPipelines';
import { VelocityRecoveryPulse } from '../components/dashboard/VelocityRecoveryPulse';

export const CommandCenterView: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100/50 dark:bg-[#070D18]">
      {/* LEVEL 2: Priority Action Strip (4 Bento Action Cards) */}
      <PriorityActionStrip />

      {/* LEVEL 3: Active Discharge Radar (High-Density 45-min Mission Control Table) */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <ActiveDischargeRadar />
      </div>

      {/* LEVEL 4: Dual Operational Pipelines (Payer Coverage Watch & Unresolved Billing Disputes) */}
      <DualOperationalPipelines />

      {/* LEVEL 5: 24-Hour Velocity & Recovery Pulse (Trailing KPIs) */}
      <VelocityRecoveryPulse />
    </div>
  );
};
