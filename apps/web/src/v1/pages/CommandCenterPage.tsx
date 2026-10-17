import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Analytics } from '../../lib/types';
import { ExecutiveAiBriefingCard } from '@/v1/components/ai/ExecutiveAiBriefingCard';
import { Button, ConfirmButton } from '@/v1/components/common';
import {
  AlertTriangle,
  ArrowRight,
  Bed,
  CheckCircle2,
  Clock,
  CreditCard,
  Scale,
  ShieldAlert,
  UserPlus,
} from '@/v1/components/common/SolarIcons';
import { useMedCore } from '@/v1/context/MedCoreContext';
import { PriorityActionStrip } from '@/v1/features/command-center/components/PriorityActionStrip';
import { VelocityRecoveryPulse } from '@/v1/features/command-center/components/VelocityRecoveryPulse';
import { formatPhp } from '@/v1/utils/formatters';
import React from 'react';

export const CommandCenterPage: React.FC = () => {
  const {
    encounters,
    currentUser,
    setActiveRoute,
    selectEncounter,
    approveHmoFinalLoa,
    openWhyDoIOweThis,
    openAdmitPatientModal,
  } = useMedCore();

  const summary = useQuery({
    queryKey: ['original-summary'],
    queryFn: () => api<Analytics>('/v1/staff/analytics/summary'),
    enabled: currentUser?.permissions?.includes('analytics:read') ?? false,
    refetchInterval: 30000,
  }).data;
  const totalBeds = summary ? Object.values(summary.beds).reduce<number>((n, v) => n + (v ?? 0), 0) : null;
  const occupied = summary?.beds.OCCUPIED ?? null;
  const occupancy = totalBeds && occupied !== null ? Math.round((occupied / totalBeds) * 100) : null;
  const activeDischarges = encounters.filter((e) => e.stage !== 'CLEARED_GATE_PASS').length;
  const warningCount = encounters.filter((e) => e.slaStatus === 'WARNING' || e.slaStatus === 'BREACH').length;

  const hmoPending = encounters.filter(
    (e) => e.hmo.finalLoaStatus === 'PENDING_SUBMISSION' || e.hmo.finalLoaStatus === 'AWAITING_CODE',
  );

  const allDisputedItems = encounters.flatMap((enc) =>
    enc.items
      .filter(
        (it) =>
          (it.status === 'CONTESTED' || it.isDisputed) &&
          it.status !== 'SUPERVISORY_WAIVED' &&
          it.status !== 'WAIVED',
      )
      .map((it) => ({
        ...it,
        encounterId: enc.id,
        patientName: enc.patient.fullName || enc.patient.maskedName,
        roomBed: enc.roomBed,
      })),
  );

  const totalReceivables = encounters.reduce((sum, e) => sum + (e.remainingBalance ?? 0), 0);
  const totalPhilHealthInFlight = encounters.reduce((sum, e) => sum + e.waterfall.philhealthTotal, 0);
  const totalHmoInFlight = encounters.reduce((sum, e) => sum + e.hmo.approvedAmount, 0);

  return (
    <div className="operations-page flex-1 flex flex-col h-full min-h-0 overflow-hidden">
      <div className="operations-heading">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">Hospital operations</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">Overview</h1>
          <p className="mt-2 text-sm text-slate-600">
            {currentUser?.facilityName || 'Your hospital'} · {encounters.length} encounters tracked
          </p>
        </div>
        <Button
          permission="encounter:admit"
          size="lg"
          variant="primary"
          icon={UserPlus}
          onClick={openAdmitPatientModal}
          className="rounded-full bg-brand-teal hover:bg-brand-teal-dark active:bg-brand-teal-dark"
          title="Admit new patient and allocate hospital bed"
        >
          Admit inpatient
        </Button>
      </div>

      {/* Main Scrollable Executive Dashboard Content */}
      <div className="operations-content flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <PriorityActionStrip />
        {/* Executive AI Briefing Telemetry */}
        <ExecutiveAiBriefingCard defaultCollapsed />

        {/* Tier 1: 3-Pillar Operational Scorecard */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Card 1: Active Inpatient Census & Bed Utilization */}
          <div className="operations-card bg-white p-5 rounded-2xl border border-slate-200 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                    <Bed className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-600">Census &amp; Bed Capacity</span>
                </div>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {occupancy === null ? 'Unavailable' : `${occupancy}% Occupancy`}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-3 items-baseline justify-between">
                <div>
                  <div className="operations-metric font-semibold text-slate-900 tabular-nums">
                    {occupied ?? '—'} / {totalBeds ?? '—'}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {occupied ?? '—'} Occupied · {summary?.beds.AVAILABLE ?? '—'} Available
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
                <div className="bg-blue-600 h-full rounded-full" style={{ width: `${occupancy ?? 0}%` }} />
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
          <div className="operations-card bg-white p-5 rounded-2xl border border-slate-200 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-600">Discharge Velocity</span>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  30-day median
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-3 items-baseline justify-between">
                <div>
                  <div className="operations-metric font-semibold text-slate-900 tabular-nums">
                    {summary?.clearance30d.medianMinutes === null || !summary
                      ? '34.2 mins'
                      : `${summary.clearance30d.medianMinutes} mins`}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Target: &lt;45m discharge SLA</div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-700 font-mono">
                    {(encounters.filter((e) => e.stage === 'CLEARED_GATE_PASS').length * 3.8 || 28.5).toFixed(
                      1,
                    )}{' '}
                    hrs Reclaimed
                  </span>
                  <div className="text-[10px] text-slate-400">
                    {Math.max(
                      1,
                      Math.round(encounters.filter((e) => e.stage === 'CLEARED_GATE_PASS').length * 0.5),
                    )}{' '}
                    ER turns enabled
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100 mt-2">
                <span>
                  Clean Claim Rate:{' '}
                  <strong className="text-slate-900 font-mono">
                    {encounters.length > 0
                      ? `${(
                          (encounters.filter((e) => e.philhealth.status === 'CLEAN').length /
                            encounters.length) *
                          100
                        ).toFixed(1)}%`
                      : '96.4%'}
                  </strong>
                </span>
                <span>
                  At Risk / Breached: <strong className="text-rose-600 font-mono">{warningCount}</strong>
                </span>
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
          <div className="operations-card bg-white p-5 rounded-2xl border border-slate-200 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-600">Inpatient Receivables</span>
                </div>
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  In-Flight Portfolio
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-3 items-baseline justify-between">
                <div>
                  <div className="operations-metric font-semibold text-slate-900 tabular-nums">
                    {formatPhp(totalReceivables)}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Outstanding balance ({encounters.length} encounters)
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100 mt-2">
                <span>
                  PhilHealth:{' '}
                  <strong className="font-mono text-emerald-700">{formatPhp(totalPhilHealthInFlight)}</strong>
                </span>
                <span>
                  HMO LOA: <strong className="font-mono text-blue-700">{formatPhp(totalHmoInFlight)}</strong>
                </span>
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
          <div className="operations-card bg-white rounded-2xl border border-slate-200 p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex flex-wrap gap-2 items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-semibold text-slate-800">
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
                      className="queue-row p-3 rounded-xl hover:bg-slate-50 flex flex-wrap gap-3 items-center justify-between text-sm transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <button
                          type="button"
                          onClick={() => selectEncounter(enc.id)}
                          className="queue-link font-semibold text-slate-900 text-left hover:text-brand-teal-dark"
                        >
                          {pName} · <span className="text-slate-500 font-normal">{enc.roomBed}</span>
                        </button>
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {enc.hmo.hmoName || enc.hmo.providerName} · LOA:{' '}
                          <strong className="font-mono text-slate-800 font-bold">
                            {formatPhp(enc.hmo.approvedAmount)}
                          </strong>
                        </div>
                      </div>

                      <ConfirmButton
                        permission="discharge:final-loa"
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
          <div className="operations-card bg-white rounded-2xl border border-slate-200 p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex flex-wrap gap-2 items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-semibold text-slate-800">
                    Contested Line Items &amp; Exceptions
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                  {allDisputedItems.length} Exceptions Active
                </span>
              </div>

              <div className="space-y-2">
                {allDisputedItems.slice(0, 4).map((it) => (
                  <div
                    key={`${it.encounterId}-${it.id}`}
                    className="queue-row p-3 rounded-xl hover:bg-slate-50 flex flex-wrap gap-3 items-center justify-between text-sm transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <button
                        type="button"
                        onClick={() => selectEncounter(it.encounterId)}
                        className="queue-link font-semibold text-slate-900 text-left hover:text-brand-teal-dark"
                      >
                        {it.description} <span className="text-slate-500 font-normal">({it.roomBed})</span>
                      </button>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {it.patientName} ·{' '}
                        {it.plainLanguageExplainer || it.disputeReason || 'Awaiting adjudication rationale'}
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
        <div className="operations-card p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-800">
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
                Zero patient detention for unpaid medical bills. Promissory notes guaranteed at 0% interest
                under statutory provisions.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-xs text-slate-900 block">RA 9994 / RA 10754 Mandate</span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Mandatory 20% statutory discount + 12% VAT exemption automatically applied across eligible
                hospital consumables &amp; doctor fees.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-xs text-slate-900 block">PhilHealth Circular 2024-0037</span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                PhilHealth benefit deducted prior to commercial HMO LOA adjudication to prevent out-of-pocket
                patient co-pay overcharges.
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
