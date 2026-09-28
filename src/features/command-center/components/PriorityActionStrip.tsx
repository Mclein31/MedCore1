import React from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import { formatPhp } from '@/utils/formatters';
import {
  Clock,
  ShieldAlert,
  FileCheck,
  CreditCard,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';

export const PriorityActionStrip: React.FC = () => {
  const { encounters, setActiveFilter, activeFilter, setActiveRoute } = useMedCore();

  const warningCount = encounters.filter((e) => e.slaStatus === 'WARNING').length;
  const breachCount = encounters.filter((e) => e.slaStatus === 'BREACH').length;

  const hmoPending = encounters.filter(
    (e) => e.hmo.finalLoaStatus === 'PENDING_SUBMISSION' || e.hmo.finalLoaStatus === 'AWAITING_CODE'
  );

  const highRiskClaims = encounters.filter(
    (e) => e.philhealth.rthRiskScore > 0.4 || !e.philhealth.cf4LabsConsistent || !e.philhealth.cf4CourseInWardRecorded
  );

  const trappedCapital = encounters.reduce((acc, enc) => {
    return acc + enc.waterfall.netPatientDue;
  }, 0);

  return (
    <section className="bg-slate-50/50 border-b border-slate-200 px-6 py-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: SLA Clearance Card (Inspo 2 style) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                breachCount > 0
                  ? 'bg-rose-50 text-rose-600 ring-4 ring-rose-50/50'
                  : warningCount > 0
                  ? 'bg-amber-50 text-amber-600 ring-4 ring-amber-50/50'
                  : 'bg-emerald-50 text-emerald-600 ring-4 ring-emerald-50/50'
              }`}>
                {breachCount > 0 ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Clock className="w-5 h-5" />
                )}
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                breachCount > 0
                  ? 'bg-rose-100 text-rose-800'
                  : warningCount > 0
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                45m Statutory SLA
              </span>
            </div>

            <div className="mt-3">
              <div className={`text-2xl font-bold tracking-tight ${
                breachCount > 0 ? 'text-rose-600' : warningCount > 0 ? 'text-amber-600' : 'text-emerald-700'
              }`}>
                {breachCount > 0 ? `${breachCount} Breached` : `${warningCount} At Risk`}
              </div>
              <div className="text-sm font-semibold text-slate-900 mt-0.5">
                Discharge Clearance Queue
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                45-min statutory window · {warningCount} cases approaching limit
              </p>
            </div>
          </div>

          <div className="pt-3 mt-2 border-t border-slate-100">
            <button
              onClick={() => setActiveFilter(activeFilter === 'WARNING' ? 'ALL' : 'WARNING')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              <span>Review clearance queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Metric 2: HMO Authorizations Card (Inspo 2 style) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 ring-4 ring-amber-50/50 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Avg 52m TAT
              </span>
            </div>

            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-amber-600">
                {hmoPending.length} Pending
              </div>
              <div className="text-sm font-semibold text-slate-900 mt-0.5">
                HMO Final eLOA Review
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Awaiting Maxicare, Medicard &amp; Intellicare coverage codes
              </p>
            </div>
          </div>

          <div className="pt-3 mt-2 border-t border-slate-100">
            <button
              onClick={() => setActiveRoute('COVERAGE_APPROVALS')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              <span>View authorizations</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Metric 3: Claims Pre-Flight Card (Inspo 2 style) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 ring-4 ring-rose-50/50 flex items-center justify-center">
                <FileCheck className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                eClaims 3.0
              </span>
            </div>

            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-rose-600">
                {highRiskClaims.length} Action Needed
              </div>
              <div className="text-sm font-semibold text-slate-900 mt-0.5">
                PhilHealth Pre-Flight Audit
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Missing CF4 clinical entries &amp; diagnostic attachments
              </p>
            </div>
          </div>

          <div className="pt-3 mt-2 border-t border-slate-100">
            <button
              onClick={() => setActiveRoute('CLAIMS_ESOA')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              <span>Scrub eClaims audit</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Metric 4: Active Inpatient Receivables Card (Inspo 2 style) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 ring-4 ring-emerald-50/50 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
                {encounters.length} Inpatients
              </span>
            </div>

            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight font-mono text-slate-900 tabular-nums">
                {formatPhp(trappedCapital)}
              </div>
              <div className="text-sm font-semibold text-slate-900 mt-0.5">
                Active Inpatient Receivables
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                ₱285k PF excess · ₱127k pending insurance coverage
              </p>
            </div>
          </div>

          <div className="pt-3 mt-2 border-t border-slate-100">
            <button
              onClick={() => setActiveRoute('ENCOUNTERS_LEDGER')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              <span>Inspect ledgers</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
