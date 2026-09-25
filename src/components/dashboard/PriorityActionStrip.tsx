import React from 'react';
import { useMedCore } from '../../context/MedCoreContext';
import { formatPhp } from '../../utils/formatters';
import { AlertCircle, Clock, ShieldAlert, Coins, ChevronRight, Zap } from 'lucide-react';

export const PriorityActionStrip: React.FC = () => {
  const { encounters, setActiveFilter, activeFilter, setActiveRoute, approveHmoFinalLoa } = useMedCore();

  const warningCount = encounters.filter((e) => e.slaStatus === 'WARNING').length;
  const breachCount = encounters.filter((e) => e.slaStatus === 'BREACH').length;

  const hmoPending = encounters.filter(
    (e) => e.hmo.finalLoaStatus === 'PENDING_SUBMISSION' || e.hmo.finalLoaStatus === 'AWAITING_CODE'
  );

  const highRiskClaims = encounters.filter(
    (e) => e.philhealth.rthRiskScore > 0.4 || !e.philhealth.cf4LabsConsistent || !e.philhealth.cf4CourseInWardRecorded
  );

  const trappedCapital = encounters.reduce((acc, enc) => {
    return acc + enc.waterfall.netPatientDue + enc.doctorExcessPf;
  }, 0);

  return (
    <section className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-[#0B1120]/70 backdrop-blur-xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: SLA Breach Risks */}
        <div
          onClick={() => setActiveFilter(activeFilter === 'BREACH' ? 'ALL' : 'BREACH')}
          className={`cursor-pointer rounded-lg p-3 transition-all border ${
            activeFilter === 'BREACH'
              ? 'bg-rose-500/10 border-rose-500 ring-1 ring-rose-500/30'
              : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-500/50 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5" />
              SLA Breach Risks
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/20">
              45m Ceiling
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <div>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {breachCount} <span className="text-xs font-normal text-slate-500">breached</span> / {warningCount} <span className="text-xs font-normal text-slate-500">warning</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {breachCount > 0 ? 'Exceeding statutory 45m target' : 'All cases tracking within SLA'}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </div>
        </div>

        {/* Card 2: HMO LOA Delays */}
        <div
          onClick={() => setActiveRoute('COVERAGE_APPROVALS')}
          className="cursor-pointer rounded-lg p-3 transition-all border bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500/50 shadow-xs group"
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider">
              <AlertCircle className="w-3.5 h-3.5" />
              HMO LOA Delays
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
              Avg 52m TAT
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <div>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {hmoPending.length} <span className="text-xs font-normal text-slate-500">pending</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Maxicare (2), Intellicare (1) in queue
              </div>
            </div>
            <span className="text-xs text-brand-blue dark:text-sky-400 font-medium group-hover:underline flex items-center">
              View <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Card 3: High-Risk Claims (RTH Risk) */}
        <div
          onClick={() => setActiveRoute('CLAIMS_ESOA')}
          className="cursor-pointer rounded-lg p-3 transition-all border bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/50 shadow-xs group"
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5" />
              High-Risk Claims
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-500/20">
              eClaims 3.0
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <div>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {highRiskClaims.length} <span className="text-xs font-normal text-slate-500">exceptions</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                CF4 missing vitals / ICD discrepancy
              </div>
            </div>
            <span className="text-xs text-brand-blue dark:text-sky-400 font-medium group-hover:underline flex items-center">
              Scrub <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Card 4: Trapped Capital */}
        <div
          onClick={() => setActiveRoute('ENCOUNTERS_LEDGER')}
          className="cursor-pointer rounded-lg p-3 transition-all border bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500/50 shadow-xs group"
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider">
              <Coins className="w-3.5 h-3.5" />
              Trapped Capital
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
              Active Wards
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <div>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {formatPhp(trappedCapital)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                ₱285k PF excess + ₱127k pending LOA
              </div>
            </div>
            <span className="text-xs text-brand-blue dark:text-sky-400 font-medium group-hover:underline flex items-center">
              Reconcile <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
