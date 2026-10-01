import React from 'react';
import { PriorityActionStrip } from '@/features/command-center/components/PriorityActionStrip';
import { ActiveDischargeRadar } from '@/features/discharge/components/ActiveDischargeRadar';
import { DualOperationalPipelines } from '@/features/command-center/components/DualOperationalPipelines';
import { VelocityRecoveryPulse } from '@/features/command-center/components/VelocityRecoveryPulse';

export const CommandCenterPage: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50 scroll-smooth snap-y snap-mandatory">
      {/* SCREEN 1: Priority Action Strip + Discharge Clearance Workstation */}
      {/* Occupies exact available viewport height (calc(100vh - var(--header-height, 3rem))) with zero whole-page scrolling */}
      <section className="h-[calc(100vh-var(--header-height,3rem))] max-h-[calc(100vh-var(--header-height,3rem))] flex flex-col bg-white border-b border-slate-200 shrink-0 overflow-hidden snap-start">
        <PriorityActionStrip />
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <ActiveDischargeRadar />
        </div>
      </section>

      {/* SCREEN 2: Dual Operational Pipelines (Payer Coverage & Unresolved Billing Exceptions) */}
      {/* Matches exact workstation viewport height with docked velocity pulse footer */}
      <section className="h-[calc(100vh-var(--header-height,3rem))] max-h-[calc(100vh-var(--header-height,3rem))] flex flex-col justify-between bg-slate-50/50 shrink-0 overflow-hidden snap-start">
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <DualOperationalPipelines />
        </div>
        <VelocityRecoveryPulse />
      </section>
    </div>
  );
};

export const CommandCenterView = CommandCenterPage;
