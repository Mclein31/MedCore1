import React from 'react';
import { Filter, RotateCcw, FileText, CheckCircle2, ChevronDown, X } from 'lucide-react';
import { CLINICAL_WARDS, ALL_HMO_CARRIERS } from '@/utils/rcmAnalyticsCalculations';

export type TimeframeOption = '30D' | '90D' | 'YTD' | 'ALL';
export type SeverityOption = 'ALL' | 'CLEAN' | 'WARNINGS' | 'EXCEPTIONS';

export interface AnalyticsFilterState {
  timeframe: TimeframeOption;
  department: string;
  payer: string;
  claimStatus: string;
  severity: SeverityOption;
  searchQuery: string;
}

interface AnalyticsFilterStripProps {
  filters: AnalyticsFilterState;
  onFilterChange: (newFilters: Partial<AnalyticsFilterState>) => void;
  onResetFilters: () => void;
  onExportReport: () => void;
  onRunAudit: () => void;
  totalFilteredCount: number;
  totalCount: number;
}

export const AnalyticsFilterStrip: React.FC<AnalyticsFilterStripProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  onExportReport,
  onRunAudit,
  totalFilteredCount,
  totalCount
}) => {
  const hasActiveFilters =
    filters.timeframe !== '30D' ||
    filters.department !== 'All Wards' ||
    filters.payer !== 'All Payers' ||
    filters.claimStatus !== 'All Statuses' ||
    filters.severity !== 'ALL' ||
    filters.searchQuery.trim().length > 0;

  return (
    <div className="space-y-3">
      {/* Top Row: Title, Facility Subtitle, and Primary Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              RCM Analytics &amp; Hospital Financial Intelligence
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Circular 2024-0037 (+50% ACR) Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            St. Jude Medical Center Manila (250-Bed Tertiary Facility) · Deterministic Inpatient Financial Ledger
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Audit Verification Trigger */}
          <button
            type="button"
            onClick={onRunAudit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
            title="Verify 100% statutory waterfall and centavo reconciliation across all inpatient cases"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Run Financial Audit</span>
          </button>

          {/* Export Executive Report Trigger */}
          <button
            type="button"
            onClick={onExportReport}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export Executive Report</span>
          </button>
        </div>
      </div>

      {/* Filter Strip Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Timeframe Selector */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            {(['30D', '90D', 'YTD', 'ALL'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onFilterChange({ timeframe: t })}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  filters.timeframe === t
                    ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t === 'ALL' ? 'All 250 Cases' : t}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-slate-200 mx-0.5 hidden sm:block" />

          {/* Clinical Department Dropdown */}
          <div className="relative inline-block">
            <select
              value={filters.department}
              onChange={(e) => onFilterChange({ department: e.target.value })}
              className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-xs font-medium text-slate-800 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs cursor-pointer"
            >
              {CLINICAL_WARDS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Payer & Commercial Carrier Dropdown */}
          <div className="relative inline-block">
            <select
              value={filters.payer}
              onChange={(e) => onFilterChange({ payer: e.target.value })}
              className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-xs font-medium text-slate-800 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs cursor-pointer"
            >
              <option value="All Payers">All Payers &amp; Insurers</option>
              <option value="PhilHealth Only">PhilHealth Only (Social)</option>
              {ALL_HMO_CARRIERS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
              <option value="Self-Pay">Self-Pay / Non-Insured</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Claim Status Dropdown */}
          <div className="relative inline-block">
            <select
              value={filters.claimStatus}
              onChange={(e) => onFilterChange({ claimStatus: e.target.value })}
              className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-xs font-medium text-slate-800 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs cursor-pointer"
            >
              <option value="All Statuses">All Claim Statuses</option>
              <option value="CLEAN">Clean / Validated</option>
              <option value="WARNING">Warnings / Advisory</option>
              <option value="INTERCEPTED">Intercepted Pre-Flight</option>
              <option value="RETURNED">Returned (RTH)</option>
              <option value="APPROVED">Adjudicated &amp; Approved</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Problem Severity Quick Pills */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            {(
              [
                { id: 'ALL', label: 'All Encounters' },
                { id: 'CLEAN', label: 'Clean (0 Risks)' },
                { id: 'WARNINGS', label: 'Warnings' },
                { id: 'EXCEPTIONS', label: 'High / Critical Exceptions' }
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onFilterChange({ severity: s.id })}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  filters.severity === s.id
                    ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Encounter Census Callout & Reset Trigger */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-700">
            Showing <strong className="font-mono text-slate-900">{totalFilteredCount}</strong> of <span className="font-mono text-slate-500">{totalCount}</span> Cases
          </span>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors font-semibold shadow-2xs"
            >
              <RotateCcw className="w-3 h-3 text-slate-400 group-hover:text-rose-600" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Tags Strip (Shown when any non-default filter is active) */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Active Filters:
          </span>

          {filters.timeframe !== '30D' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-medium">
              Timeframe: {filters.timeframe === 'ALL' ? 'All 250 Cases' : filters.timeframe}
              <button type="button" onClick={() => onFilterChange({ timeframe: '30D' })}>
                <X className="w-3 h-3 hover:text-blue-900" />
              </button>
            </span>
          )}

          {filters.department !== 'All Wards' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-medium">
              Ward: {filters.department}
              <button type="button" onClick={() => onFilterChange({ department: 'All Wards' })}>
                <X className="w-3 h-3 hover:text-blue-900" />
              </button>
            </span>
          )}

          {filters.payer !== 'All Payers' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-medium">
              Payer: {filters.payer}
              <button type="button" onClick={() => onFilterChange({ payer: 'All Payers' })}>
                <X className="w-3 h-3 hover:text-blue-900" />
              </button>
            </span>
          )}

          {filters.claimStatus !== 'All Statuses' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-medium">
              Claim: {filters.claimStatus}
              <button type="button" onClick={() => onFilterChange({ claimStatus: 'All Statuses' })}>
                <X className="w-3 h-3 hover:text-blue-900" />
              </button>
            </span>
          )}

          {filters.severity !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-medium">
              Severity: {filters.severity}
              <button type="button" onClick={() => onFilterChange({ severity: 'ALL' })}>
                <X className="w-3 h-3 hover:text-blue-900" />
              </button>
            </span>
          )}

          {filters.searchQuery.trim().length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-medium">
              Search: &quot;{filters.searchQuery}&quot;
              <button type="button" onClick={() => onFilterChange({ searchQuery: '' })}>
                <X className="w-3 h-3 hover:text-blue-900" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={onResetFilters}
            className="text-slate-500 hover:text-slate-800 underline text-[11px] ml-1"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};
