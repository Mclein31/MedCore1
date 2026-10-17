import { ExecutiveAiBriefingCard } from '@/v1/components/ai/ExecutiveAiBriefingCard';
import { Button } from '@/v1/components/common';
import { RotateCcw, SearchX } from '@/v1/components/common/SolarIcons';
import { useMedCore } from '@/v1/context/MedCoreContext';
import { ActionableExceptionsWorklist } from '@/v1/features/analytics/components/ActionableExceptionsWorklist';
import type { AnalyticsFilterState } from '@/v1/features/analytics/components/AnalyticsFilterStrip';
import { AnalyticsFilterStrip } from '@/v1/features/analytics/components/AnalyticsFilterStrip';
import { ExecutiveReportModal } from '@/v1/features/analytics/components/ExecutiveReportModal';
import { HospitalFinancingWaterfall } from '@/v1/features/analytics/components/HospitalFinancingWaterfall';
import { matchesEncounterSearch } from '@/v1/utils/encounterSearch';
import {
  computeArAgingSummary,
  computeClaimsScrutinyMetrics,
  computeCommercialCarrierMetrics,
  computeDepartmentMetrics,
  computeMacroKpiMetrics,
  computePatientOopDrivers,
  computeTrappedCapitalPareto,
  computeWaterfallAggregate,
  extractActionableExceptions,
  getEncounterFrictionCategory,
  getEncounterWard,
  isEncounterProblem,
} from '@/v1/utils/rcmAnalyticsCalculations';
import React, { useMemo, useState } from 'react';

export const RcmAnalyticsPage: React.FC = () => {
  const { encounters, searchQuery, setSearchQuery } = useMedCore();

  // Primary Filter State
  const [filters, setFilters] = useState<AnalyticsFilterState>({
    timeframe: '30D',
    department: 'All Wards',
    payer: 'All Payers',
    claimStatus: 'All Statuses',
    severity: 'ALL',
    searchQuery: '',
  });

  // Cross-filtering focus states
  const [selectedFrictionCategory, setSelectedFrictionCategory] = useState<string | null>(null);
  const [_activeMetricFocus, setActiveMetricFocus] = useState<string | undefined>(undefined);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const handleFilterChange = (newFilters: Partial<AnalyticsFilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilters({
      timeframe: '30D',
      department: 'All Wards',
      payer: 'All Payers',
      claimStatus: 'All Statuses',
      severity: 'ALL',
      searchQuery: '',
    });
    setSelectedFrictionCategory(null);
    setActiveMetricFocus(undefined);
  };

  // Filter encounters dynamically
  const filteredEncounters = useMemo(() => {
    return encounters.filter((enc) => {
      const admitted = Date.parse(enc.admissionDate);
      const cutoff =
        filters.timeframe === 'YTD'
          ? new Date(new Date().getFullYear(), 0, 1).getTime()
          : Date.now() - (filters.timeframe === '90D' ? 90 : 30) * 86400000;
      if (filters.timeframe !== 'ALL' && (!Number.isFinite(admitted) || admitted < cutoff)) return false;
      if (!matchesEncounterSearch(enc, searchQuery)) return false;
      // 1. Department / Ward Filter
      if (filters.department !== 'All Wards') {
        const w = getEncounterWard(enc);
        if (w !== filters.department) return false;
      }

      // 2. Payer Filter
      if (filters.payer !== 'All Payers') {
        if (filters.payer === 'PhilHealth Only') {
          if (enc.waterfall.philhealthTotal <= 0) return false;
        } else if (filters.payer === 'Self-Pay') {
          if (enc.hmo?.providerName && enc.hmo.providerName !== 'None') return false;
        } else {
          const p = enc.hmo?.providerName || '';
          if (p.toLowerCase() !== filters.payer.toLowerCase()) {
            return false;
          }
        }
      }

      // 3. Claim Status Filter
      if (filters.claimStatus !== 'All Statuses') {
        if (enc.philhealth?.status !== filters.claimStatus) return false;
      }

      // 4. Problem Severity Filter
      if (filters.severity !== 'ALL') {
        const isProb = isEncounterProblem(enc);
        if (filters.severity === 'CLEAN') {
          if (isProb || enc.stage !== 'CLEARED_GATE_PASS') return false;
        } else if (filters.severity === 'WARNINGS') {
          if (enc.slaStatus !== 'WARNING' && enc.philhealth?.status !== 'WARNING') return false;
        } else if (filters.severity === 'EXCEPTIONS') {
          if (!isProb) return false;
        }
      }

      // 5. Friction Category Cross-Filter
      if (selectedFrictionCategory) {
        const cat = getEncounterFrictionCategory(enc);
        if (cat !== selectedFrictionCategory) return false;
      }

      // 6. Search Query Filter
      if (filters.searchQuery.trim().length > 0) {
        const q = filters.searchQuery.toLowerCase();
        const pName = (enc.patient.fullName || enc.patient.maskedName).toLowerCase();
        const mrn = enc.patient.mrn.toLowerCase();
        const bed = enc.roomBed.toLowerCase();
        const diag = enc.primaryDiagnosis.toLowerCase();
        if (!pName.includes(q) && !mrn.includes(q) && !bed.includes(q) && !diag.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [encounters, filters, selectedFrictionCategory, searchQuery]);

  // Derived Analytics Datasets based on active filtered encounters
  const waterfall = useMemo(() => computeWaterfallAggregate(filteredEncounters), [filteredEncounters]);
  const kpis = useMemo(
    () => computeMacroKpiMetrics(filteredEncounters, encounters),
    [filteredEncounters, encounters],
  );
  const carrierMetrics = useMemo(
    () => computeCommercialCarrierMetrics(filteredEncounters),
    [filteredEncounters],
  );
  const _trappedPareto = useMemo(() => computeTrappedCapitalPareto(filteredEncounters), [filteredEncounters]);
  const _deptMetrics = useMemo(() => computeDepartmentMetrics(filteredEncounters), [filteredEncounters]);
  const _claimMetrics = useMemo(() => computeClaimsScrutinyMetrics(filteredEncounters), [filteredEncounters]);
  const _oopDrivers = useMemo(() => computePatientOopDrivers(filteredEncounters), [filteredEncounters]);
  const _arAging = useMemo(() => computeArAgingSummary(), []);
  const actionableExceptions = useMemo(
    () => extractActionableExceptions(filteredEncounters),
    [filteredEncounters],
  );

  const isEmpty = filteredEncounters.length === 0;

  return (
    <div className="h-[calc(100vh-var(--header-height,3rem))] max-h-[calc(100vh-var(--header-height,3rem))] overflow-hidden flex flex-col bg-slate-50 text-slate-900">
      {/* SECTION 1: Sticky Top Context & Filter Strip */}
      <header className="flex-none bg-white border-b border-slate-200 px-4 py-2 z-10 shadow-2xs">
        <AnalyticsFilterStrip
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          onExportReport={() => setIsReportModalOpen(true)}
          onRunAudit={() => setIsReportModalOpen(true)}
          totalFilteredCount={filteredEncounters.length}
          totalCount={encounters.length}
        />
      </header>

      {/* SECTION 2: Scrollable Dashboard Body */}
      <main className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4">
        {isEmpty ? (
          /* Empty State */
          <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col items-center justify-center text-center space-y-2.5 my-6">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <SearchX className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900">
              No Inpatient Encounters Match Selected Filter Criteria
            </h3>
            <p className="text-xs text-slate-500 max-w-md">
              No billing exceptions, claims, or active receivables match the selected combination of
              department, payer, and severity filters.
            </p>
            <Button size="sm" variant="primary" icon={RotateCcw} onClick={handleResetFilters}>
              Reset All Filters to Hospital Default
            </Button>
          </div>
        ) : (
          <>
            {/* AI Executive RCM Telemetry Briefing */}
            <ExecutiveAiBriefingCard />

            {/* Level 1: Macro Revenue Scorecard (Bento Grid) */}
            <UnavailablePanel title="Revenue performance metrics" />

            {/* Level 2: Multi-Payer Financing Waterfall & Elevated AR Aging Profile (7 cols / 5 cols) */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              <div className="xl:col-span-7">
                <HospitalFinancingWaterfall waterfall={waterfall} />
              </div>
              <div className="xl:col-span-5">
                <UnavailablePanel title="Accounts receivable aging" />
              </div>
            </div>

            {/* Level 3: Department Discharge Bottleneck Radar & Pre-Flight Claims (7 cols / 5 cols) */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              <div className="xl:col-span-7">
                <UnavailablePanel title="Department turnaround" />
              </div>
              <div className="xl:col-span-5">
                <UnavailablePanel title="Claims preflight scrutiny" />
              </div>
            </div>

            {/* Level 4: Operational Friction Pareto & Department Matrix (6 cols / 6 cols) */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              <div className="xl:col-span-6">
                <UnavailablePanel title="Trapped capital analysis" />
              </div>
              <div className="xl:col-span-6">
                <UnavailablePanel title="Department exceptions" />
              </div>
            </div>

            {/* Level 5: Commercial HMO Carrier Ledger & Patient Out-of-Pocket Breakdown (7 cols / 5 cols) */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              <div className="xl:col-span-7">
                <UnavailablePanel title="Commercial carrier performance" />
              </div>
              <div className="xl:col-span-5">
                <UnavailablePanel title="Patient out-of-pocket allocation" />
              </div>
            </div>

            {/* Level 6: Full-Width Actionable Inpatient Worklist */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <ActionableExceptionsWorklist
                exceptions={actionableExceptions}
                selectedCategory={selectedFrictionCategory}
                onClearCategoryFilter={() => setSelectedFrictionCategory(null)}
              />
            </section>
          </>
        )}
      </main>

      {/* Executive Report & Financial Audit Modal */}
      <ExecutiveReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        waterfall={waterfall}
        kpis={kpis}
        carriers={carrierMetrics}
      />
    </div>
  );
};

export const RcmAnalyticsView = RcmAnalyticsPage;

function UnavailablePanel({ title }: { title: string }) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 min-h-32">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500 mt-3">
        Not available yet. The v2 API does not provide the history and source metrics required for this
        analysis.
      </p>
    </section>
  );
}
