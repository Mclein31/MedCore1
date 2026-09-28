import React from 'react';
import { PriorityActionStrip } from '@/features/command-center/components/PriorityActionStrip';
import { ActiveDischargeRadar } from '@/features/discharge/components/ActiveDischargeRadar';
import { DualOperationalPipelines } from '@/features/command-center/components/DualOperationalPipelines';
import { VelocityRecoveryPulse } from '@/features/command-center/components/VelocityRecoveryPulse';

export const CommandCenterPage: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50 scroll-smooth">
      {/* SCREEN 1: Priority Action Strip + Discharge Clearance Workstation */}
      {/* Fits completely within the viewing height with bounded scrolling queue and bottom breathing room */}
      <section className="h-[calc(100vh-56px)] max-h-[calc(100vh-56px)] flex flex-col bg-white border-b border-slate-200 shrink-0 overflow-hidden pb-3 sm:pb-4">
        <PriorityActionStrip />
        <div className="flex-1 min-h-0 flex flex-col">
          <ActiveDischargeRadar />
        </div>
      </section>

      {/* SCREEN 2: Dual Operational Pipelines (Payer Coverage & Unresolved Billing Exceptions) */}
      {/* On next scroll, takes up the whole viewing height with trailing velocity pulse */}
      <section className="min-h-[calc(100vh-56px)] flex flex-col justify-between bg-slate-50/50 shrink-0 pb-3 sm:pb-4">
        <div className="flex-1 min-h-0 flex flex-col">
          <DualOperationalPipelines />
        </div>
        <VelocityRecoveryPulse />
      </section>
    </div>
  );
};

export const CommandCenterView = CommandCenterPage;
