import React, { useState } from 'react';
import { CommercialCarrierMetric } from '@/types/domain';
import { formatPhp } from '@/utils/formatters';
import { ShieldCheck, ChevronLeft, ChevronRight, CheckCircle2, TrendingDown, ArrowDownRight } from 'lucide-react';
import { IconButton, SearchInput } from '@/components/common';

interface CommercialCarrierLedgerProps {
  carriers: CommercialCarrierMetric[];
  selectedCarrier?: string;
  onSelectCarrier?: (carrier: string) => void;
}

export const CommercialCarrierLedger: React.FC<CommercialCarrierLedgerProps> = ({
  carriers,
  selectedCarrier,
  onSelectCarrier
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const rthEliminationCategories = [
    {
      reason: 'Missing CF4 Clinical Summary Elements',
      before: 34.0,
      after: 1.2,
      fix: 'Pre-flight clinical schema validator (Cir 2023-0026)'
    },
    {
      reason: 'Single Period of Confinement (SPC) Conflict',
      before: 28.0,
      after: 0.0,
      fix: 'Circular 2024-0021 / 2025-0015 Auto-Refiling Compiler'
    },
    {
      reason: 'PhilHealth PIN / MDR Maiden Name Conflict',
      before: 22.0,
      after: 0.3,
      fix: 'Upfront PEC Direct Member Validation'
    },
    {
      reason: 'Unbundled Secondary Surgical Procedure Codes',
      before: 16.0,
      after: 0.2,
      fix: 'All-Case-Rate Multi-Specialty Bundling Engine'
    }
  ];

  // Filter carriers by search query
  const filteredCarriers = carriers.filter((c) =>
    c.carrier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredCarriers.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const visibleCarriers = filteredCarriers.slice(startIndex, startIndex + pageSize);

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setCurrentPage(1);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
      {/* Table Header & Search Strip */}
      <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-slate-900">
              Commercial HMO Carrier Performance Matrix
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              8 Licensed Carriers
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Turnaround times, first-pass approval rates, and disallowance ratios by private health plan.
          </p>
        </div>

        {/* Carrier Search */}
        <SearchInput
          size="sm"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search Carrier..."
          className="w-48"
        />
      </div>

      {/* Enterprise Left-Aligned Table (Strict text-left on all th and td) */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <th className="py-3 px-5 text-left">HMO Carrier</th>
              <th className="py-3 px-4 text-left">Active Cases</th>
              <th className="py-3 px-4 text-left">Avg eLOA TAT</th>
              <th className="py-3 px-4 text-left">Disallowed Rate</th>
              <th className="py-3 px-4 text-left">Clean Approval</th>
              <th className="py-3 px-5 text-left">Total Reconciled MTD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleCarriers.length > 0 ? (
              visibleCarriers.map((c) => {
                const isSelected = selectedCarrier?.toLowerCase() === c.carrier.toLowerCase();

                return (
                  <tr
                    key={c.carrier}
                    onClick={() => onSelectCarrier?.(isSelected ? 'All Payers' : c.carrier)}
                    className={`transition-colors cursor-pointer text-left ${
                      isSelected
                        ? 'bg-blue-50/80 font-medium'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3.5 px-5 font-semibold text-slate-900 text-left">
                      <div className="flex items-center gap-2 text-left">
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                        <span className="truncate">{c.carrier}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-left font-mono font-medium text-slate-700">
                      {c.activeCases} <span className="font-sans text-xs text-slate-400">cases</span>
                    </td>
                    <td className="py-3.5 px-4 text-left">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold text-left ${
                          c.avgTatMinutes <= 25
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : c.avgTatMinutes <= 35
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {c.avgTatFormatted}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-left font-mono font-semibold text-rose-700">
                      {c.disallowanceRate.toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-4 text-left font-mono font-bold text-emerald-700">
                      {c.cleanApprovalRate.toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-5 text-left font-mono font-bold text-slate-900">
                      {formatPhp(c.reconciledTotal)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-8 px-5 text-left text-slate-400 text-xs">
                  No HMO carriers matching &quot;{searchQuery}&quot;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Docked Table Pagination Footer */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
        <div className="text-left font-mono">
          Showing {filteredCarriers.length === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + pageSize, filteredCarriers.length)} of {filteredCarriers.length} Carriers
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

      {/* Denial / PhilHealth RTH Root Cause Elimination Sub-Panel */}
      <div className="p-5 border-t border-slate-200 bg-slate-50/50 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div>
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-emerald-600" />
              PhilHealth RTH Root-Cause Elimination Ledger
            </h4>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Historical claim denial baseline vs. active production performance with automated pre-flight scrubbing.
            </p>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
            96.4% Clean Claims Rate
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {rthEliminationCategories.map((r) => (
            <div
              key={r.reason}
              className="p-3 rounded-lg border border-slate-200 bg-white text-xs space-y-1 text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-slate-800 text-left">{r.reason}</span>
                <div className="flex items-center gap-1.5 font-mono shrink-0">
                  <span className="text-slate-400 line-through text-[11px]">{r.before.toFixed(1)}%</span>
                  <ArrowDownRight className="w-3 h-3 text-emerald-600" />
                  <span className="font-bold text-emerald-700 text-xs">{r.after.toFixed(1)}%</span>
                </div>
              </div>
              <div className="text-[10px] text-slate-500 text-left">{r.fix}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
