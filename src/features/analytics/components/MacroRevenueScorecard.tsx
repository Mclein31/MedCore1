import React from 'react';
import { formatPhp } from '@/utils/formatters';
import { MacroKpiMetrics } from '@/utils/rcmAnalyticsCalculations';
import {
  TrendingDown,
  DollarSign,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Users,
  CheckCircle2
} from 'lucide-react';

interface MacroRevenueScorecardProps {
  metrics: MacroKpiMetrics;
  onSelectMetric?: (metricKey: string) => void;
  activeMetricFocus?: string;
}

export const MacroRevenueScorecard: React.FC<MacroRevenueScorecardProps> = ({
  metrics,
  onSelectMetric,
  activeMetricFocus
}) => {
  return (
    <div className="space-y-4">
      {/* Tier 1: 4 Executive Macro KPI Bento Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Gross Billings */}
        <div
          onClick={() => onSelectMetric?.('GROSS_BILLINGS')}
          className={`p-5 rounded-xl bg-white border transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
            activeMetricFocus === 'GROSS_BILLINGS'
              ? 'border-blue-500 ring-2 ring-blue-100'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Gross Billings
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono tracking-tight text-slate-900">
              {formatPhp(metrics.totalGrossBillings)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-1.5 pt-1.5 border-t border-slate-100">
              <span>Daily Run-Rate:</span>
              <span className="font-mono font-semibold text-slate-700">
                {formatPhp(metrics.grossDailyRunRate)}/d
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Across <span className="font-mono font-medium text-slate-600">{metrics.totalEncountersCount}</span> active inpatient cases
            </div>
          </div>
        </div>

        {/* 2. Days in Accounts Receivable (DAR) */}
        <div
          onClick={() => onSelectMetric?.('DAR')}
          className={`p-5 rounded-xl bg-white border transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
            activeMetricFocus === 'DAR'
              ? 'border-blue-500 ring-2 ring-blue-100'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Days in AR (DAR)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono tracking-tight text-slate-900">
              {metrics.daysInAr.toFixed(1)} <span className="text-sm font-sans font-semibold text-slate-500">Days</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-emerald-700 font-semibold mt-1.5 pt-1.5 border-t border-slate-100">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>▼ {metrics.darBaselineReduction.toFixed(1)}d vs 58.6d baseline</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Target: &lt; 25.0 days (Top-decile hospital speed)
            </div>
          </div>
        </div>

        {/* 3. Pre-Flight Clean Claims Compliance */}
        <div
          onClick={() => onSelectMetric?.('CLEAN_CLAIMS')}
          className={`p-5 rounded-xl bg-white border transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
            activeMetricFocus === 'CLEAN_CLAIMS'
              ? 'border-blue-500 ring-2 ring-blue-100'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pre-Flight Clean Claims
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono tracking-tight text-emerald-700">
              {metrics.cleanClaimRate.toFixed(1)}%
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-1.5 pt-1.5 border-t border-slate-100">
              <span>National Average:</span>
              <span className="font-semibold text-slate-600">81.8%</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Initial first-pass: <span className="font-mono text-slate-600">{metrics.cleanFirstPassRate.toFixed(1)}%</span> (eClaims 3.0 verified)
            </div>
          </div>
        </div>

        {/* 4. Annualized MedCore Economic Yield */}
        <div
          onClick={() => onSelectMetric?.('ECONOMIC_YIELD')}
          className={`p-5 rounded-xl bg-white border transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
            activeMetricFocus === 'ECONOMIC_YIELD'
              ? 'border-blue-500 ring-2 ring-blue-100'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              MedCore Annual Yield
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono tracking-tight text-emerald-700">
              +{formatPhp(metrics.annualEconomicYield)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-1.5 pt-1.5 border-t border-slate-100">
              <span>Reclaimed Capacity:</span>
              <span className="font-mono font-semibold text-emerald-700">+412 bed-hrs/day</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Salvaged via rapid clearance &amp; 0% promissory
            </div>
          </div>
        </div>
      </div>

      {/* Tier 2: 4 Secondary Operational & Liquidity Bento Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 5. Trapped Working Capital */}
        <div
          onClick={() => onSelectMetric?.('TRAPPED_CAPITAL')}
          className={`p-4 rounded-xl bg-white border transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
            activeMetricFocus === 'TRAPPED_CAPITAL'
              ? 'border-amber-500 ring-2 ring-amber-100'
              : 'border-amber-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              Trapped Capital
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
              In Wards
            </span>
          </div>
          <div className="mt-1.5">
            <div className="text-xl font-bold font-mono text-slate-900">
              {formatPhp(metrics.trappedWorkingCapital)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Active patient balances pending discharge clearance or eLOA
            </p>
          </div>
        </div>

        {/* 6. Immediate Revenue at Risk */}
        <div
          onClick={() => onSelectMetric?.('REVENUE_AT_RISK')}
          className={`p-4 rounded-xl bg-white border transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
            activeMetricFocus === 'REVENUE_AT_RISK'
              ? 'border-rose-500 ring-2 ring-rose-100'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              Revenue at Risk
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
              {metrics.revenueAtRiskCases} Cases
            </span>
          </div>
          <div className="mt-1.5">
            <div className="text-xl font-bold font-mono text-rose-700">
              {formatPhp(metrics.revenueAtRiskAmount)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Claims with RTH risk ≥ 0.70 or disallowed items &gt; 30m
            </p>
          </div>
        </div>

        {/* 7. Problem Inpatient Census */}
        <div
          onClick={() => onSelectMetric?.('PROBLEM_CENSUS')}
          className={`p-4 rounded-xl bg-white border transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
            activeMetricFocus === 'PROBLEM_CENSUS'
              ? 'border-blue-500 ring-2 ring-blue-100'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              Problem Census
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
              {metrics.problemCensusPercent}%
            </span>
          </div>
          <div className="mt-1.5">
            <div className="text-xl font-bold font-mono text-slate-900">
              {metrics.problemCensusCount} <span className="text-sm font-sans font-normal text-slate-500">Cases</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Inpatients with documentation, coding, or HMO clearance friction
            </p>
          </div>
        </div>

        {/* 8. Post-Triage Revenue Recovered */}
        <div
          onClick={() => onSelectMetric?.('REVENUE_RECOVERED')}
          className={`p-4 rounded-xl bg-white border transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
            activeMetricFocus === 'REVENUE_RECOVERED'
              ? 'border-emerald-500 ring-2 ring-emerald-100'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Revenue Recovered
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              RA 9439 Protected
            </span>
          </div>
          <div className="mt-1.5">
            <div className="text-xl font-bold font-mono text-emerald-700">
              {formatPhp(metrics.revenueRecoveredAmount)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Zero-interest promissory agreements + resolved disputes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
