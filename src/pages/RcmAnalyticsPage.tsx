import React, { useState, useMemo } from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import {
  AnalyticsFilterStrip,
  AnalyticsFilterState
} from '@/features/analytics/components/AnalyticsFilterStrip';
import { MacroRevenueScorecard } from '@/features/analytics/components/MacroRevenueScorecard';
import { HospitalFinancingWaterfall } from '@/features/analytics/components/HospitalFinancingWaterfall';
import { FinancialVelocityTrendChart } from '@/features/analytics/components/FinancialVelocityTrendChart';
import { ClaimsScrutinyPipeline } from '@/features/analytics/components/ClaimsScrutinyPipeline';
import { TrappedCapitalPareto } from '@/features/analytics/components/TrappedCapitalPareto';
import { CommercialCarrierLedger } from '@/features/analytics/components/CommercialCarrierLedger';
import { DepartmentExceptionMatrix } from '@/features/analytics/components/DepartmentExceptionMatrix';
import { MedCoreCumulativeImpactChart } from '@/features/analytics/components/MedCoreCumulativeImpactChart';
import { PatientOopDriverCard } from '@/features/analytics/components/PatientOopDriverCard';
import { ArAgingProfileCard } from '@/features/analytics/components/ArAgingProfileCard';
import { ActionableExceptionsWorklist } from '@/features/analytics/components/ActionableExceptionsWorklist';
import { ExecutiveReportModal } from '@/features/analytics/components/ExecutiveReportModal';
import {
  getEncounterWard,
  isEncounterProblem,
  getEncounterFrictionCategory,
  computeWaterfallAggregate,
  computeMacroKpiMetrics,
  computeCommercialCarrierMetrics,
  computeTrappedCapitalPareto,
  computeDepartmentMetrics,
  computeClaimsScrutinyMetrics,
  computePatientOopDrivers,
  computeArAgingSummary,
  extractActionableExceptions
} from '@/utils/rcmAnalyticsCalculations';
import { SearchX, RotateCcw } from 'lucide-react';

export const RcmAnalyticsPage: React.FC = () => {
  const { encounters } = useMedCore();

  // Primary Filter State
  const [filters, setFilters] = useState<AnalyticsFilterState>({
    timeframe: '30D',
    department: 'All Wards',
    payer: 'All Payers',
    claimStatus: 'All Statuses',
    severity: 'ALL',
    searchQuery: ''
  });

  // Cross-filtering focus states
  const [selectedFrictionCategory, setSelectedFrictionCategory] = useState<string | null>(null);
  const [activeMetricFocus, setActiveMetricFocus] = useState<string | undefined>(undefined);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const handleFilterChange = (newFilters: Partial<AnalyticsFilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleResetFilters = () => {
    setFilters({
      timeframe: '30D',
      department: 'All Wards',
      payer: 'All Payers',
      claimStatus: 'All Statuses',
      severity: 'ALL',
      searchQuery: ''
    });
    setSelectedFrictionCategory(null);
    setActiveMetricFocus(undefined);
  };

  // Filter encounters dynamically
  const filteredEncounters = useMemo(() => {
    return encounters.filter((enc) => {
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
          // Specific HMO Carrier
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
  }, [encounters, filters, selectedFrictionCategory]);

  // Derived Analytics Datasets based on active filtered encounters
  const waterfall = useMemo(() => computeWaterfallAggregate(filteredEncounters), [filteredEncounters]);
  const kpis = useMemo(() => computeMacroKpiMetrics(filteredEncounters, encounters), [filteredEncounters, encounters]);
  const carrierMetrics = useMemo(() => computeCommercialCarrierMetrics(filteredEncounters), [filteredEncounters]);
  const trappedPareto = useMemo(() => computeTrappedCapitalPareto(filteredEncounters), [filteredEncounters]);
  const deptMetrics = useMemo(() => computeDepartmentMetrics(filteredEncounters), [filteredEncounters]);
  const claimMetrics = useMemo(() => computeClaimsScrutinyMetrics(filteredEncounters), [filteredEncounters]);
  const oopDrivers = useMemo(() => computePatientOopDrivers(filteredEncounters), [filteredEncounters]);
  const arAging = useMemo(() => computeArAgingSummary(), []);
  const actionableExceptions = useMemo(() => extractActionableExceptions(filteredEncounters), [filteredEncounters]);

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
              No billing exceptions, claims, or active receivables match the selected combination of department, payer, and severity filters.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Filters to Hospital Default</span>
            </button>
          </div>
        ) : (
          <>
            {/* Level 1: Macro Revenue Scorecard (Bento Grid) */}
            <MacroRevenueScorecard
              metrics={kpis}
              activeMetricFocus={activeMetricFocus}
              onSelectMetric={(key) => {
                if (key === 'TRAPPED_CAPITAL') {
                  handleFilterChange({ severity: 'EXCEPTIONS' });
                } else if (key === 'CLEAN_CLAIMS') {
                  handleFilterChange({ claimStatus: 'CLEAN' });
                } else if (key === 'PROBLEM_CENSUS') {
                  handleFilterChange({ severity: 'EXCEPTIONS' });
                } else {
                  setActiveMetricFocus((prev) => (prev === key ? undefined : key));
                }
              }}
            />

            {/* Level 2: Multi-Payer Financing Waterfall & Pre-Flight Claims Radar (7 cols / 5 cols) */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              <div className="xl:col-span-7">
                <HospitalFinancingWaterfall waterfall={waterfall} />
              </div>
              <div className="xl:col-span-5">
                <ClaimsScrutinyPipeline
                  metrics={claimMetrics}
                  selectedStatus={filters.claimStatus}
                  onSelectStatus={(status) =>
                    handleFilterChange({
                      claimStatus: status === 'ALL' ? 'All Statuses' : status
                    })
                  }
                />
              </div>
            </div>

            {/* Level 3: TAT Descent & MedCore Cumulative Yield (7 cols / 5 cols) */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              <div className="xl:col-span-7">
                <FinancialVelocityTrendChart />
              </div>
              <div className="xl:col-span-5">
                <MedCoreCumulativeImpactChart />
              </div>
            </div>

            {/* Level 4: Operational Friction Pareto & Department Matrix (6 cols / 6 cols) */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              <div className="xl:col-span-6">
                <TrappedCapitalPareto
                  drivers={trappedPareto}
                  selectedCategory={selectedFrictionCategory}
                  onSelectCategory={setSelectedFrictionCategory}
                />
              </div>
              <div className="xl:col-span-6">
                <DepartmentExceptionMatrix
                  departments={deptMetrics}
                  selectedDepartment={filters.department}
                  onSelectDepartment={(dept) => handleFilterChange({ department: dept })}
                />
              </div>
            </div>

            {/* Level 5: Commercial HMO Carrier Ledger & Patient OOP / AR (7 cols / 5 cols) */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              <div className="xl:col-span-7">
                <CommercialCarrierLedger
                  carriers={carrierMetrics}
                  selectedCarrier={filters.payer}
                  onSelectCarrier={(carrier) => handleFilterChange({ payer: carrier })}
                />
              </div>
              <div className="xl:col-span-5 space-y-4">
                <PatientOopDriverCard oopData={oopDrivers} />
                <ArAgingProfileCard agingBuckets={arAging} />
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
