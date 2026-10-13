import React, { useState, useEffect } from 'react';
import { ActionableExceptionItem } from '@/utils/rcmAnalyticsCalculations';
import { formatPhp } from '@/utils/formatters';
import { useMedCore } from '@/context/MedCoreContext';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  FileSignature,
  FileText,
  Clock,
  ShieldAlert
} from '@/components/common/SolarIcons';
import { ConfirmButton, Button, IconButton } from '@/components/common';

interface ActionableExceptionsWorklistProps {
  exceptions: ActionableExceptionItem[];
  selectedCategory?: string | null;
  onClearCategoryFilter?: () => void;
}

export const ActionableExceptionsWorklist: React.FC<ActionableExceptionsWorklistProps> = ({
  exceptions,
  selectedCategory,
  onClearCategoryFilter
}) => {
  const { searchQuery,
    openDossierDrawer,
    openDoctorQuickSign,
    clearPharmacyRts,
    openPromissoryModal,
    selectEncounter
  } = useMedCore();

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  useEffect(()=>{ setCurrentPage(1); }, [searchQuery]);

  // Filter exceptions by search query
  const filteredExceptions = exceptions.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.patientName.toLowerCase().includes(q) ||
      item.mrn.toLowerCase().includes(q) ||
      item.wardBed.toLowerCase().includes(q) ||
      item.payerPolicy.toLowerCase().includes(q) ||
      item.problemType.toLowerCase().includes(q)
    );
  });

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, exceptions.length]);

  const totalPages = Math.ceil(filteredExceptions.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const visibleItems = filteredExceptions.slice(startIndex, startIndex + pageSize);

  const getSeverityBadge = (sev: ActionableExceptionItem['severity']) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'HIGH':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'MEDIUM':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'LOW':
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case 'MGH_DECLARED':
        return '1. MGH Declared';
      case 'DOCTOR_PF_PENDING':
        return '2. Doctor PF Pending';
      case 'PHARMACY_RTS_AUDIT':
        return '3. Pharmacy RTS Audit';
      case 'HMO_FINAL_LOA':
        return '4. HMO Final LOA';
      case 'PENDING_SETTLEMENT':
        return '5. Cashier Settlement';
      case 'CLEARED_GATE_PASS':
        return '6. Gate Pass Issued';
      default:
        return stage;
    }
  };

  const handleAction = (item: ActionableExceptionItem) => {
    selectEncounter(item.encounter.id);
    switch (item.actionType) {
      case 'QUICK_SIGN':
        openDoctorQuickSign();
        break;
      case 'RTS_CLEAR':
        void clearPharmacyRts(item.encounter.id).catch(() => { /* The provider reports the rejected mutation. */ });
        break;
      case 'PROMISSORY':
        openPromissoryModal(item.encounter.id);
        break;
      case 'LOA_FOLLOWUP':
      case 'OPEN_DOSSIER':
      default:
        openDossierDrawer(item.encounter);
        break;
    }
  };

  return (
    <div className="flex flex-col">
      {/* Header Strip */}
      <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-slate-900">
              Actionable Inpatient Billing Exceptions &amp; Worklist
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              {filteredExceptions.length} Active Records
            </span>
            {selectedCategory && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                Friction: {selectedCategory}
                <button
                  type="button"
                  onClick={onClearCategoryFilter}
                  className="hover:text-blue-900 ml-0.5"
                >
                  ✕
                </button>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time patient roster flagged with documentation, authorization, or settlement friction for floor expediters.
          </p>
        </div>

        {/* Search Input */}

      </div>

      {/* Universal Left-Aligned Table (Strict text-left on all th and td) */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <th className="py-3 px-5 text-left">Patient &amp; MRN</th>
              <th className="py-3 px-4 text-left">Ward &amp; Bed</th>
              <th className="py-3 px-4 text-left">Payer &amp; Policy</th>
              <th className="py-3 px-4 text-left">Billing Exception</th>
              <th className="py-3 px-4 text-left">Trapped Balance</th>
              <th className="py-3 px-4 text-left">Discharge Stage</th>
              <th className="py-3 px-3 text-left">Severity</th>
              <th className="py-3 px-5 text-left">Action Trigger</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleItems.length > 0 ? (
              visibleItems.map((item) => (
                <tr
                  key={item.encounter.id}
                  className="hover:bg-slate-50/80 transition-colors text-left"
                >
                  {/* 1. Patient & MRN */}
                  <td className="py-3.5 px-5 text-left">
                    <button
                      type="button"
                      onClick={() => openDossierDrawer(item.encounter)}
                      className="text-left font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                    >
                      <span className="truncate max-w-[150px]">{item.patientName}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                    </button>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5 text-left">
                      {item.mrn} · {item.ageGender}
                    </div>
                  </td>

                  {/* 2. Ward & Bed */}
                  <td className="py-3.5 px-4 text-left font-mono font-medium text-slate-800 text-xs">
                    {item.wardBed}
                  </td>

                  {/* 3. Payer & Policy */}
                  <td className="py-3.5 px-4 text-left text-xs text-slate-700">
                    <div className="font-semibold truncate max-w-[160px] text-left">
                      {item.payerPolicy.split('·')[0]}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono text-left">
                      {item.payerPolicy.split('·')[1] || 'Standard Plan'}
                    </div>
                  </td>

                  {/* 4. Billing Exception */}
                  <td className="py-3.5 px-4 text-left text-xs">
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-800 text-left">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span className="truncate max-w-[200px]" title={item.problemType}>
                        {item.problemType}
                      </span>
                    </span>
                  </td>

                  {/* 5. Trapped Balance */}
                  <td className="py-3.5 px-4 text-left font-mono font-bold text-slate-900 text-base">
                    {formatPhp(item.trappedAmount)}
                  </td>

                  {/* 6. Discharge Stage */}
                  <td className="py-3.5 px-4 text-left text-xs text-slate-600 font-medium">
                    {getStageLabel(item.dischargeStage)}
                  </td>

                  {/* 7. Severity */}
                  <td className="py-3.5 px-3 text-left">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border text-left ${getSeverityBadge(
                        item.severity
                      )}`}
                    >
                      {item.severity}
                    </span>
                  </td>

                  {/* 8. Action Trigger */}
                  <td className="py-3.5 px-5 text-left">
                    {item.actionType === 'RTS_CLEAR' ? (
                      <ConfirmButton
                        label={item.recommendedAction}
                        modalTitle="Clear Pharmacy Return-to-Stock Audit?"
                        modalDescription={`Certify that unreturned medications for ${item.patientName} (${item.wardBed}) have been reconciled with Central Pharmacy and credit slips applied.`}
                        confirmLabel="Clear RTS"
                        contextInfo={[
                          { label: 'Patient', value: item.patientName },
                          { label: 'Ward/Bed', value: item.wardBed },
                          { label: 'Trapped Amount', value: formatPhp(item.trappedAmount) },
                          { label: 'Exception', value: item.problemType }
                        ]}
                        variant="subtle"
                        confirmVariant="success"
                        size="sm"
                        onConfirm={() => {
                          selectEncounter(item.encounter.id);
                          return clearPharmacyRts(item.encounter.id);
                        }}
                      />
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleAction(item)}
                      >
                        {item.recommendedAction}
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-12 px-5 text-left text-slate-400 text-xs">
                  <div className="flex flex-col items-center justify-center text-center space-y-1">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-1" />
                    <p className="font-semibold text-slate-700 text-sm">
                      Zero Exceptions Matching Criteria
                    </p>
                    <p className="text-slate-400 text-xs max-w-sm">
                      All inpatient encounters in this scope are fully verified or settled with zero trapped capital.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Docked Table Pagination Footer */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
        <div className="text-left font-mono">
          Showing {filteredExceptions.length === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + pageSize, filteredExceptions.length)} of {filteredExceptions.length} Inpatient Records
        </div>

        <div className="flex items-center gap-1.5">
          <IconButton
            size="sm"
            variant="secondary"
            icon={ChevronLeft}
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            ariaLabel="Previous page"
          />
          <span className="px-2 font-mono text-xs">
            {currentPage} / {totalPages}
          </span>
          <IconButton
            size="sm"
            variant="secondary"
            icon={ChevronRight}
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            ariaLabel="Next page"
          />
        </div>
      </div>
    </div>
  );
};
