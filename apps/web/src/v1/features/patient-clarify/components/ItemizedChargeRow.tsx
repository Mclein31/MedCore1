import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from '@/v1/components/common/SolarIcons';
import type { ChargemasterItem } from '@/v1/types/domain';
import React, { useState } from 'react';
import { formatPeso } from '../utils/billFormatters';

interface Props {
  item: ChargemasterItem;
  onDisputeClick: (item: ChargemasterItem) => void;
  isReadOnly?: boolean;
}

export const ItemizedChargeRow: React.FC<Props> = ({ item, onDisputeClick, isReadOnly }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'ROOM_BOARD':
        return 'Room & Board';
      case 'PHARMACY':
        return 'Pharmacy';
      case 'LABORATORY':
        return 'Diagnostics';
      case 'CENTRAL_SUPPLIES':
        return 'Medical Supplies';
      case 'PROFESSIONAL_FEE':
        return 'Doctor Fee';
      default:
        return cat.replace(/_/g, ' ');
    }
  };

  const isDisputed = item.status === 'CONTESTED' || item.isDisputed;
  const isWaived = item.status === 'SUPERVISORY_WAIVED' || item.status === 'WAIVED';
  const _isFullyCovered = item.status === 'COVERED' || item.patientOop === 0;

  return (
    <div
      className={`border rounded-xl transition-all duration-150 overflow-hidden ${
        isDisputed
          ? 'bg-amber-50/40 border-amber-300'
          : isWaived
            ? 'bg-slate-50 border-slate-200 opacity-75'
            : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
    >
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 select-none"
      >
        {/* Left: Description & Tag */}
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
              {getCategoryLabel(item.category)}
            </span>
            <span className="font-mono text-[11px] text-slate-400">{item.code}</span>
            {isDisputed && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span>Under Review / Contested</span>
              </span>
            )}
            {isWaived && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Supervisory Waived</span>
              </span>
            )}
          </div>
          <div className="font-bold text-sm text-slate-900 leading-snug">{item.description}</div>
          {item.qty > 1 && (
            <div className="text-xs text-slate-500 mt-0.5">
              Quantity: {item.qty} × {formatPeso(item.unitPrice)}
            </div>
          )}
        </div>

        {/* Right: Amounts & Expand Button */}
        <div className="flex items-center justify-between md:justify-end gap-5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
          <div className="text-right">
            <div className="text-[11px] text-slate-400 font-medium">
              Billed: {formatPeso(item.grossAmount)}
            </div>
            <div className="font-mono font-bold text-slate-900 text-sm">
              {isWaived ? (
                <span className="text-slate-400 line-through">{formatPeso(item.grossAmount)}</span>
              ) : item.patientOop > 0 ? (
                <span className={isDisputed ? 'text-amber-700' : 'text-slate-900'}>
                  {formatPeso(item.patientOop)}
                </span>
              ) : (
                <span className="text-emerald-600 font-semibold">₱0.00 (Covered)</span>
              )}
            </div>
          </div>

          <div className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {/* Expanded Explanation Accordion */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/70 text-xs text-slate-700 space-y-3">
          <div className="flex items-start gap-2 bg-white p-3 rounded-lg border border-slate-200">
            <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-slate-900 block">Why do I owe this amount?</span>
              <p className="text-slate-600 leading-relaxed">
                {item.plainLanguageExplainer ||
                  (item.status === 'DISALLOWED_SUNDRY'
                    ? 'This medical consumable was disallowed under your HMO standard policy exclusion clause and redirected to personal out-of-pocket responsibility.'
                    : item.status === 'EXCESS_PF'
                      ? 'Attending specialist declared a professional fee exceeding the standard accredited insurance fee ceiling.'
                      : 'This charge represents your statutory co-share after applying PhilHealth and approved insurance allocations.')}
              </p>
              {item.exclusionReasonClause && (
                <p className="text-[11px] text-slate-500 font-mono">
                  Policy reference: {item.exclusionReasonClause}
                </p>
              )}
            </div>
          </div>

          {/* Insurance Breakdown for this item */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 font-mono">
            <div>
              <span className="text-slate-400 block">Gross:</span>
              <span className="font-bold text-slate-800">{formatPeso(item.grossAmount)}</span>
            </div>
            <div>
              <span className="text-slate-400 block">PhilHealth:</span>
              <span className="font-bold text-blue-700">
                {item.philhealthCovered > 0 ? formatPeso(item.philhealthCovered) : '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">HMO Covered:</span>
              <span className="font-bold text-indigo-700">
                {item.hmoCovered > 0 ? formatPeso(item.hmoCovered) : '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Patient Due:</span>
              <span className="font-bold text-slate-900">{formatPeso(item.patientOop)}</span>
            </div>
          </div>

          {/* Dispute Action Button */}
          {!isReadOnly && !isWaived && item.patientOop > 0 && !isDisputed && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDisputeClick(item);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors shadow-2xs"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Contest / Dispute this line item</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
