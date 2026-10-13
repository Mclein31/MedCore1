import React from 'react';
import { Filter, RotateCcw, FileText, CheckCircle2, ChevronDown, X } from '@/components/common/SolarIcons';
import { CLINICAL_WARDS, ALL_HMO_CARRIERS } from '@/utils/rcmAnalyticsCalculations';
import { Button, Select, SegmentedTabs, SegmentedTabItem } from '@/components/common';

export type TimeframeOption = '30D' | '90D' | 'YTD' | 'ALL';
export type SeverityOption = 'ALL' | 'CLEAN' | 'WARNINGS' | 'EXCEPTIONS';

const TIMEFRAME_TABS: SegmentedTabItem<TimeframeOption>[] = [
  { id: '30D', label: '30D' },
  { id: '90D', label: '90D' },
  { id: 'YTD', label: 'YTD' },
  { id: 'ALL', label: 'ALL' }
];

const SEVERITY_TABS: SegmentedTabItem<SeverityOption>[] = [
  { id: 'ALL', label: 'All Encounters' },
  { id: 'CLEAN', label: 'Clean (0 Risks)' },
  { id: 'WARNINGS', label: 'Warnings' },
  { id: 'EXCEPTIONS', label: 'High / Critical Exceptions' }
];

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
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              RCM Analytics &amp; Hospital Financial Intelligence
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
              Circular 2024-0037 (+50% ACR) Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            St. Jude Medical Center Manila (250-Bed Tertiary Facility) · Deterministic Inpatient Financial Ledger
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Audit Verification Trigger */}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            icon={CheckCircle2}
            onClick={onRunAudit}
            title="Verify 100% statutory waterfall and centavo reconciliation across all inpatient cases"
          >
            View Financial Report
          </Button>

          {/* Export Executive Report Trigger */}
          <Button
            type="button"
            size="sm"
            variant="primary"
            icon={FileText}
            onClick={onExportReport}
          >
            Export Executive Report
          </Button>
        </div>
      </div>

      {/* Filter Strip Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Timeframe Selector */}
          <SegmentedTabs
            size="sm"
            items={TIMEFRAME_TABS}
            activeId={filters.timeframe}
            onChange={(t) => onFilterChange({ timeframe: t })}
          />

          <div className="h-5 w-px bg-slate-200 mx-0.5 hidden sm:block" />

          {/* Clinical Department Dropdown */}
          <Select
            size="sm"
            aria-label="Ward"
            value={filters.department}
            onChange={(e) => onFilterChange({ department: e.target.value })}
            className="text-xs"
          >
            {CLINICAL_WARDS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </Select>

          {/* Payer & Commercial Carrier Dropdown */}
          <Select
            size="sm"
            aria-label="Payer"
            value={filters.payer}
            onChange={(e) => onFilterChange({ payer: e.target.value })}
            className="text-xs"
          >
            <option value="All Payers">All Payers &amp; Insurers</option>
            <option value="PhilHealth Only">PhilHealth Only (Social)</option>
            {ALL_HMO_CARRIERS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
            <option value="Self-Pay">Self-Pay / Non-Insured</option>
          </Select>

          {/* Claim Status Dropdown */}
          <Select
            size="sm"
            aria-label="Claim status"
            value={filters.claimStatus}
            onChange={(e) => onFilterChange({ claimStatus: e.target.value })}
            className="text-xs"
          >
            <option value="All Statuses">All Claim Statuses</option>
            <option value="CLEAN">Clean / Validated</option>
            <option value="WARNING">Warnings / Advisory</option>
            <option value="INTERCEPTED">Intercepted Pre-Flight</option>
            <option value="RETURNED">Returned (RTH)</option>
            <option value="APPROVED">Adjudicated &amp; Approved</option>
          </Select>

          {/* Problem Severity Quick Pills */}
          <SegmentedTabs
            size="sm"
            items={SEVERITY_TABS}
            activeId={filters.severity}
            onChange={(s) => onFilterChange({ severity: s })}
          />
        </div>

        {/* Encounter Census Callout & Reset Trigger */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-700">
            Showing <strong className="font-mono text-slate-900">{totalFilteredCount}</strong> of <span className="font-mono text-slate-500">{totalCount}</span> Cases
          </span>

          {hasActiveFilters && (
            <Button
              type="button"
              size="sm"
              variant="subtle"
              icon={RotateCcw}
              onClick={onResetFilters}
            >
              Reset
            </Button>
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
              <button type="button" aria-label={`Remove timeframe filter: ${filters.timeframe}`} className="inline-flex w-6 h-6 items-center justify-center rounded" onClick={() => onFilterChange({ timeframe: '30D' })}>
                <X className="w-3 h-3 hover:text-blue-900" />
              </button>
            </span>
          )}

          {filters.department !== 'All Wards' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-medium">
              Ward: {filters.department}
              <button type="button" aria-label={`Remove ward filter: ${filters.department}`} className="inline-flex w-6 h-6 items-center justify-center rounded" onClick={() => onFilterChange({ department: 'All Wards' })}>
                <X className="w-3 h-3 hover:text-blue-900" />
              </button>
            </span>
          )}

          {filters.payer !== 'All Payers' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-medium">
              Payer: {filters.payer}
              <button type="button" aria-label={`Remove payer filter: ${filters.payer}`} className="inline-flex w-6 h-6 items-center justify-center rounded" onClick={() => onFilterChange({ payer: 'All Payers' })}>
                <X className="w-3 h-3 hover:text-blue-900" />
              </button>
            </span>
          )}

          {filters.claimStatus !== 'All Statuses' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-medium">
              Claim: {filters.claimStatus}
              <button type="button" aria-label={`Remove claim status filter: ${filters.claimStatus}`} className="inline-flex w-6 h-6 items-center justify-center rounded" onClick={() => onFilterChange({ claimStatus: 'All Statuses' })}>
                <X className="w-3 h-3 hover:text-blue-900" />
              </button>
            </span>
          )}

          {filters.severity !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-medium">
              Severity: {filters.severity}
              <button type="button" aria-label={`Remove severity filter: ${filters.severity}`} className="inline-flex w-6 h-6 items-center justify-center rounded" onClick={() => onFilterChange({ severity: 'ALL' })}>
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

          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 px-1.5 text-xs text-slate-500 hover:text-slate-800"
            onClick={onResetFilters}
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
};
