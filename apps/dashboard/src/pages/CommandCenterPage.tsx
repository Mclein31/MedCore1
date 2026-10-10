import React from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import { formatPhp } from '@/utils/formatters';
import { PriorityActionStrip } from '@/features/command-center/components/PriorityActionStrip';
import { VelocityRecoveryPulse } from '@/features/command-center/components/VelocityRecoveryPulse';
import { ConfirmButton, Button } from '@/components/common';
import { ExecutiveAiBriefingCard } from '@/components/ai/ExecutiveAiBriefingCard';
import {
  ArrowRight,
  Clock,
  ShieldAlert,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  Scale,
  Bed,
  Layers,
  DoorOpen
} from 'lucide-react';

export const CommandCenterPage: React.FC = () => {
  const {
    encounters,
    setActiveRoute,
    selectEncounter,
    approveHmoFinalLoa,
    openWhyDoIOweThis,
    openAdmitPatientModal
  } = useMedCore();

  const activeDischarges = encounters.filter((e) => e.stage !== 'CLEARED_GATE_PASS').length;
  const warningCount = encounters.filter((e) => e.slaStatus === 'WARNING' || e.slaStatus === 'BREACH').length;

  const hmoPending = encounters.filter(
    (e) => e.hmo.finalLoaStatus === 'PENDING_SUBMISSION' || e.hmo.finalLoaStatus === 'AWAITING_CODE'
  );

  const allDisputedItems = encounters.flatMap((enc) =>
    enc.items
      .filter(
        (it) =>
          (it.status === 'CONTESTED' || it.isDisputed) &&
          it.status !== 'SUPERVISORY_WAIVED' &&
          it.status !== 'WAIVED'
      )
      .map((it) => ({
        ...it,
        encounterId: enc.id,
        patientName: enc.patient.fullName || enc.patient.maskedName,
        roomBed: enc.roomBed
      }))
  );

  const totalReceivables = encounters.reduce((sum, e) => sum + e.waterfall.netPatientDue, 0);
  const totalPhilHealthInFlight = encounters.reduce((sum, e) => sum + e.philhealth.totalCaseRate, 0);
  const totalHmoInFlight = encounters.reduce((sum, e) => sum + e.hmo.approvedAmount, 0);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-slate-50">
      {/* Top Header Bar */}
      <div className="h-11 px-4 sm:px-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 z-10 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            Hospital Operations Home
          </h1>
          <span className="text-slate-300 hidden sm:inline">·</span>
          <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
            St. Jude Medical Center Manila · Shift 07:00 - 15:00
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Data Feed · 250 Inpatients Tracked</span>
          </span>

          <Button
            size="sm"
            variant="primary"
            icon={UserPlus}
            onClick={openAdmitPatientModal}
            title="Admit new patient and allocate hospital bed"
          >
            + Admit Inpatient
          </Button>
        </div>
      </div>

      {/* Main 4 Quick Nav Cards */}
      <PriorityActionStrip />

      {/* Main Scrollable Executive Dashboard Content */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
        {/* Executive AI Briefing Telemetry */}
        <ExecutiveAiBriefingCard />

        {/* Tier 1: 3-Pillar Operational Scorecard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Card 1: Active Inpatient Census & Bed Utilization */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Bed className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Census &amp; Bed Capacity
                  </span>
                </div>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  91% Occupancy
                </span>
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                    182 / 200
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    182 Occupied · 18 Available / Turnover
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    {activeDischarges} Discharges Pending
                  </span>
                </div>
              </div>

              {/* Occupancy bar */}
              <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden border border-slate-200/60">
                <div className="bg-blue-600 h-full rounded-full" style={{ width: '91%' }} />
              </div>
            </div>

            <Button
              size="sm"
              variant="ghost"
              fullWidth
              iconPosition="right"
              icon={ArrowRight}
              className="justify-between pt-2 border-t border-slate-100 text-blue-600 hover:text-blue-800"
              onClick={() => setActiveRoute('ENCOUNTERS_LEDGER')}
            >
              <span>View Full Census &amp; Bed Matrix</span>
            </Button>
          </div>

          {/* Card 2: Discharge Clearance Velocity */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Discharge Velocity
                  </span>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  88% Faster TAT
                </span>
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <div className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
                    34.2 mins
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Target: &lt;45m SLA (Baseline: 4.8 hrs)
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-700 font-mono">
                    28.5 hrs Reclaimed
                  </span>
                  <div className="text-[10px] text-slate-400">4 ER turns enabled</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-600 pt-2 border-t border-slate-100 mt-2">
                <span>Clean Claim Rate: <strong className="text-slate-900 font-mono">96.4%</strong></span>
                <span>At Risk / Breached: <strong className="text-rose-600 font-mono">{warningCount}</strong></span>
              </div>
            </div>

            <Button
              size="sm"
              variant="ghost"
              fullWidth
              iconPosition="right"
              icon={ArrowRight}
              className="justify-between pt-2 border-t border-slate-100 text-blue-600 hover:text-blue-800"
              onClick={() => setActiveRoute('DISCHARGE_CLEARANCE')}
            >
              <span>Launch Discharge Mission Control</span>
            </Button>
          </div>

          {/* Card 3: Payer Portfolio & Inpatient Receivables */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Inpatient Receivables
                  </span>
                </div>
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  In-Flight Portfolio
                </span>
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                    {formatPhp(totalReceivables)}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Net Patient Responsibility (250 Inpatients)
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-600 pt-2 border-t border-slate-100 mt-2">
                <span>PhilHealth: <strong className="font-mono text-emerald-700">{formatPhp(totalPhilHealthInFlight)}</strong></span>
                <span>HMO LOA: <strong className="font-mono text-blue-700">{formatPhp(totalHmoInFlight)}</strong></span>
              </div>
            </div>

            <Button
              size="sm"
              variant="ghost"
              fullWidth
              iconPosition="right"
              icon={ArrowRight}
              className="justify-between pt-2 border-t border-slate-100 text-blue-600 hover:text-blue-800"
              onClick={() => setActiveRoute('COVERAGE_APPROVALS')}
            >
              <span>Open Approvals &amp; Disputes Desk</span>
            </Button>
          </div>
        </div>

        {/* Tier 2: Urgent Operational Action Queues (2-column side-by-side) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Urgent HMO Approvals */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Critical HMO Coverage Authorizations
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  {hmoPending.length} Awaiting Final Code
                </span>
              </div>

              <div className="space-y-2">
                {hmoPending.slice(0, 4).map((enc) => {
                  const pName = enc.patient.fullName || enc.patient.maskedName;
                  return (
                    <div
                      key={enc.id}
                      onClick={() => selectEncounter(enc.id)}
                      className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 flex items-center justify-between text-xs transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-slate-900 truncate">
                          {pName} · <span className="font-mono text-slate-600 font-normal">{enc.roomBed}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {enc.hmo.hmoName || enc.hmo.providerName} · LOA: <strong className="font-mono text-slate-800 font-bold">{formatPhp(enc.hmo.approvedAmount)}</strong>
                        </div>
                      </div>

                      <ConfirmButton
                        label="Approve LOA"
                        modalTitle="Approve HMO LOA Coverage?"
                        modalDescription={`Approve and lock coverage of ${formatPhp(enc.hmo.approvedAmount)} from ${enc.hmo.hmoName || enc.hmo.providerName} for ${pName}.`}
                        confirmLabel="Approve LOA"
                        variant="success"
                        confirmVariant="success"
                        size="sm"
                        icon={CheckCircle2}
                        onConfirm={() => approveHmoFinalLoa(enc.id)}
                        title="Approve HMO Final LOA"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <Button
              size="sm"
              variant="ghost"
              fullWidth
              iconPosition="right"
              icon={ArrowRight}
              className="justify-between pt-2 border-t border-slate-100 text-blue-600 hover:text-blue-800"
              onClick={() => setActiveRoute('COVERAGE_APPROVALS')}
            >
              <span>View All {hmoPending.length} Pending Payer Approvals</span>
            </Button>
          </div>

          {/* Active Billing Exceptions */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-purple-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Contested Line Items &amp; Exceptions
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                  {allDisputedItems.length} Exceptions Active
                </span>
              </div>

              <div className="space-y-2">
                {allDisputedItems.slice(0, 4).map((it) => (
                  <div
                    key={`${it.encounterId}-${it.id}`}
                    onClick={() => selectEncounter(it.encounterId)}
                    className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 flex items-center justify-between text-xs transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                        <span>{it.description}</span>
                        <span className="font-mono text-slate-500 font-normal">({it.roomBed})</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {it.patientName} · {it.plainLanguageExplainer || it.disputeReason || 'Awaiting adjudication rationale'}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-slate-900 tabular-nums">
                        {formatPhp(it.patientOop || it.grossAmount)}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="p-0 h-auto text-[10px] font-semibold text-blue-600 hover:underline mt-0.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectEncounter(it.encounterId);
                          openWhyDoIOweThis(it);
                        }}
                      >
                        Why Do I Owe?
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button
              size="sm"
              variant="ghost"
              fullWidth
              iconPosition="right"
              icon={ArrowRight}
              className="justify-between pt-2 border-t border-slate-100 text-blue-600 hover:text-blue-800"
              onClick={() => setActiveRoute('COVERAGE_APPROVALS')}
            >
              <span>View All {allDisputedItems.length} Contested Exceptions</span>
            </Button>
          </div>
        </div>

        {/* Tier 3: Philippine Statutory Compliance & Consumer Protections Strip */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Philippine Statutory Healthcare Compliance Guarantees
              </span>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Hospital Audit Verified</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-xs text-slate-900 block">RA 9439 Anti-Detention Law</span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Zero patient detention for unpaid medical bills. Promissory notes guaranteed at 0% interest under statutory provisions.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-xs text-slate-900 block">RA 9994 / RA 10754 Mandate</span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Mandatory 20% statutory discount + 12% VAT exemption automatically applied across eligible hospital consumables &amp; doctor fees.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-xs text-slate-900 block">PhilHealth Circular 2024-0037</span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                PhilHealth benefit deducted prior to commercial HMO LOA adjudication to prevent out-of-pocket patient co-pay overcharges.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Persistent Docked Velocity Pulse */}
      <VelocityRecoveryPulse />
    </div>
  );
};

export const CommandCenterView = CommandCenterPage;
export const HomeView = CommandCenterPage;
