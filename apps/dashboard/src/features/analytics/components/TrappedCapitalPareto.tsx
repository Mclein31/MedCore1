import React from 'react';
import { formatPhp } from '@/utils/formatters';
import { TrappedCapitalFriction } from '@/utils/rcmAnalyticsCalculations';
import { Lock, Clock, Filter, X } from 'lucide-react';

interface TrappedCapitalParetoProps {
  drivers: TrappedCapitalFriction[];
  selectedCategory?: string | null;
  onSelectCategory?: (category: string | null) => void;
}

export const TrappedCapitalPareto: React.FC<TrappedCapitalParetoProps> = ({
  drivers,
  selectedCategory,
  onSelectCategory
}) => {
  const totalTrapped = drivers.reduce((acc, d) => acc + d.amount, 0);

  return (
    <div className="h-full min-w-0 p-6 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col gap-4 print:block print:space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-slate-900">
              Trapped Capital by Friction Source (Pareto Distribution)
            </h3>
            {selectedCategory && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <Filter className="w-3 h-3 text-amber-600" />
                Filtered: {selectedCategory}
                <button
                  type="button"
                  onClick={() => onSelectCategory?.(null)}
                  className="hover:text-amber-950 ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Ranked root causes of delayed hospital receivables and average administrative friction minutes.
          </p>
        </div>

        <div className="text-left font-mono">
          <div className="text-xs text-slate-400 font-sans">Total Trapped Capital</div>
          <div className="text-xl font-bold text-amber-700">{formatPhp(totalTrapped)}</div>
        </div>
      </div>

      {/* Ranked Horizontal Bars */}
      <div className="grid gap-3 pt-1 xl:flex-1 xl:auto-rows-fr print:block print:space-y-3">
        {drivers.map((d, idx) => {
          const isSelected = selectedCategory === d.category;
          const isDimmed = selectedCategory && !isSelected;

          return (
            <div
              key={d.category}
              onClick={() => onSelectCategory?.(isSelected ? null : d.category)}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-center ${
                isSelected
                  ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-300'
                  : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
              } ${isDimmed ? 'opacity-35' : 'opacity-100'}`}
            >
              {/* Category label & metrics row */}
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-slate-800 truncate" title={d.category}>
                    {d.category}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                    <Clock className="w-2.5 h-2.5" />
                    {d.avgDelayFormatted}
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-base">
                    {formatPhp(d.amount)}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400 w-10 text-left">
                    ({d.share}%)
                  </span>
                </div>
              </div>

              {/* Progress Bar Track */}
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    idx === 0
                      ? 'bg-amber-500'
                      : idx === 1
                      ? 'bg-amber-400'
                      : 'bg-slate-400'
                  }`}
                  style={{ width: `${Math.max(d.share, 4)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Footer Callout */}
      <div className="shrink-0 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-amber-600" />
          Clicking any friction category filters the actionable worklist below.
        </span>
        <span className="font-medium text-slate-600">6 Audited Root Causes</span>
      </div>
    </div>
  );
};
