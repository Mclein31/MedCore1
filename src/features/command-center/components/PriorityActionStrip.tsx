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
    <section className="bg-slate-50/80 border-b border-slate-200 px-3 sm:px-6 py-2 shrink-0">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {/* Metric 1: SLA Clearance Status Tile */}
        <div
          onClick={() => setActiveFilter(activeFilter === 'WARNING' ? 'ALL' : 'WARNING')}
          className="group bg-white rounded-lg border border-slate-200 hover:border-slate-300 p-2 sm:px-3 sm:py-2 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-2"
          title="Click to toggle SLA risk filter in discharge queue"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${
                breachCount > 0
                  ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-200'
                  : warningCount > 0
                  ? 'bg-amber-50 text-amber-600 ring-1 ring-amber-200'
                  : 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200'
              }`}
            >
              {breachCount > 0 ? (
                <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              ) : (
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-xs sm:text-sm font-bold tracking-tight truncate ${
                    breachCount > 0 ? 'text-rose-600' : warningCount > 0 ? 'text-amber-600' : 'text-emerald-700'
                  }`}
                >
                  {breachCount > 0 ? `${breachCount} Breached` : `${warningCount} At Risk`}
                </span>
                <span
                  className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                    breachCount > 0
                      ? 'bg-rose-100 text-rose-800'
                      : warningCount > 0
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  45m SLA
                </span>
              </div>
              <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 truncate">
                Discharge Queue
              </div>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0 transition-colors" />
        </div>

        {/* Metric 2: HMO Authorizations Status Tile */}
        <div
          onClick={() => setActiveRoute('COVERAGE_APPROVALS')}
          className="group bg-white rounded-lg border border-slate-200 hover:border-slate-300 p-2 sm:px-3 sm:py-2 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-2"
          title="Click to view HMO authorizations queue"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-50 text-amber-600 ring-1 ring-amber-200 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold tracking-tight text-amber-600 truncate">
                  {hmoPending.length} Pending
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 shrink-0">
                  Avg 52m TAT
                </span>
              </div>
              <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 truncate">
                HMO Final eLOA
              </div>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0 transition-colors" />
        </div>

        {/* Metric 3: Claims Pre-Flight Audit Tile */}
        <div
          onClick={() => setActiveRoute('CLAIMS_ESOA')}
          className="group bg-white rounded-lg border border-slate-200 hover:border-slate-300 p-2 sm:px-3 sm:py-2 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-2"
          title="Click to scrub PhilHealth eClaims pre-flight audit"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-50 text-rose-600 ring-1 ring-rose-200 flex items-center justify-center shrink-0">
              <FileCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold tracking-tight text-rose-600 truncate">
                  {highRiskClaims.length} Action Needed
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 shrink-0">
                  eClaims 3.0
                </span>
              </div>
              <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 truncate">
                Pre-Flight Audit
              </div>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0 transition-colors" />
        </div>

        {/* Metric 4: Active Inpatient Receivables Tile */}
        <div
          onClick={() => setActiveRoute('ENCOUNTERS_LEDGER')}
          className="group bg-white rounded-lg border border-slate-200 hover:border-slate-300 p-2 sm:px-3 sm:py-2 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-2"
          title="Click to inspect active inpatient encounter ledgers"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 flex items-center justify-center shrink-0">
              <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold tracking-tight font-mono text-slate-900 tabular-nums truncate">
                  {formatPhp(trappedCapital)}
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 font-mono shrink-0">
                  {encounters.length} Inpatients
                </span>
              </div>
              <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 truncate">
                Inpatient Receivables
              </div>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0 transition-colors" />
        </div>
      </div>
    </section>
  );
};
