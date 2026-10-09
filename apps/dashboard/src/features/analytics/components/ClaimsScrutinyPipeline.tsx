import React, { useState } from 'react';
import { ClaimsPipelineMetrics } from '@/utils/rcmAnalyticsCalculations';
import { ShieldCheck, FileCheck, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';

interface ClaimsScrutinyPipelineProps {
  metrics: ClaimsPipelineMetrics;
  onSelectStatus?: (status: string) => void;
  selectedStatus?: string;
}

export const ClaimsScrutinyPipeline: React.FC<ClaimsScrutinyPipelineProps> = ({
  metrics,
  onSelectStatus,
  selectedStatus
}) => {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  const {
    totalClaims,
    cleanCount,
    cleanPercent,
    warningCount,
    warningPercent,
    interceptedCount,
    interceptedPercent,
    returnedCount,
    returnedPercent,
    underReviewCount,
    underReviewPercent,
    preFlightVerifiedPercent,
    auditChecklist
  } = metrics;

  // Donut geometry using SVG circle strokeDasharray
  const radius = 64;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;

  const rawSegments = [
    {
      id: 'CLEAN',
      label: 'Clean / XML Ready',
      count: cleanCount,
      percent: cleanPercent,
      color: '#059669', // Emerald
      textColor: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200'
    },
    {
      id: 'WARNING',
      label: 'Warnings / Aging',
      count: warningCount,
      percent: warningPercent,
      color: '#d97706', // Amber
      textColor: 'text-amber-800',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200'
    },
    {
      id: 'INTERCEPTED',
      label: 'Intercepted Pre-Flight',
      count: interceptedCount,
      percent: interceptedPercent,
      color: '#2563eb', // Blue
      textColor: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      id: 'RETURNED',
      label: 'Returned (RTH)',
      count: returnedCount,
      percent: returnedPercent,
      color: '#e11d48', // Rose
      textColor: 'text-rose-700',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200'
    },
    {
      id: 'UNDER_REVIEW',
      label: 'Under Adjudication',
      count: underReviewCount,
      percent: underReviewPercent,
      color: '#64748b', // Slate
      textColor: 'text-slate-700',
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-200'
    }
  ];

  // Calculate cumulative strokeDashoffset for donut slices
  let accumulatedPercent = 0;
  const donutSlices = rawSegments.map((seg) => {
    const dashLength = (seg.percent / 100) * circumference;
    const dashOffset = -(accumulatedPercent / 100) * circumference;
    accumulatedPercent += seg.percent;
    return {
      ...seg,
      dashLength,
      dashOffset
    };
  });

  return (
    <div className="h-full min-w-0 p-6 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col gap-5 print:block print:space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-slate-900">
              Pre-Flight Claims Scrutiny Pipeline
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Circular 2023-0026
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            PhilHealth eClaims 3.0 schema verification and pre-submission defect interception.
          </p>
        </div>

        <div className="text-left font-mono">
          <div className="text-xs text-slate-400 font-sans">Pre-Flight Pass Rate</div>
          <div className="text-xl font-bold text-emerald-700">{preFlightVerifiedPercent}%</div>
        </div>
      </div>

      {/* Donut Chart & Legend Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-stretch xl:flex-1">
        {/* SVG Donut */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center relative">
          <svg width="180" height="180" viewBox="0 0 180 180" className="w-[180px] h-[180px] xl:w-full xl:h-auto xl:max-w-[220px] print:w-[180px] print:h-[180px] transform -rotate-90">
            {/* Background circle track */}
            <circle
              cx="90"
              cy="90"
              r={radius}
              fill="transparent"
              stroke="#f1f5f9"
              strokeWidth={strokeWidth}
            />

            {donutSlices.map((slice) => {
              if (slice.percent <= 0) return null;
              const isSelected = selectedStatus === slice.id;
              const isDimmed = selectedStatus && !isSelected;

              return (
                <circle
                  key={slice.id}
                  cx="90"
                  cy="90"
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={isSelected ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={`${slice.dashLength} ${circumference - slice.dashLength}`}
                  strokeDashoffset={slice.dashOffset}
                  strokeLinecap="butt"
                  className="transition-all cursor-pointer"
                  opacity={isDimmed ? 0.35 : 1}
                  onMouseEnter={() => setHoveredSegment(slice.id)}
                  onMouseLeave={() => setHoveredSegment(null)}
                  onClick={() => onSelectStatus?.(selectedStatus === slice.id ? 'ALL' : slice.id)}
                />
              );
            })}
          </svg>

          {/* Central Metric Badge in Donut Hole */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-3xl font-bold font-mono text-slate-900 leading-tight">
              {totalClaims}
            </span>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Claims Total
            </span>
          </div>
        </div>

        {/* Donut Legend & Filterable Pills */}
        <div className="sm:col-span-7 grid gap-1.5 xl:auto-rows-fr print:block print:space-y-1.5">
          {rawSegments.map((s) => {
            const isSelected = selectedStatus === s.id;
            const isDimmed = selectedStatus && !isSelected;

            return (
              <div
                key={s.id}
                onClick={() => onSelectStatus?.(selectedStatus === s.id ? 'ALL' : s.id)}
                className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between text-xs ${
                  isSelected
                    ? `${s.bgColor} ${s.borderColor} ring-1 ring-blue-400`
                    : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                } ${isDimmed ? 'opacity-40' : 'opacity-100'}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="font-semibold text-slate-800">{s.label}</span>
                </div>

                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-base text-slate-900">{s.count}</span>
                  <span className="text-slate-400 text-[11px]">({s.percent}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pre-Flight Audit Checklist Strip (PhilHealth Circular 2023-0026 Standards) */}
      <div className="shrink-0 pt-3 border-t border-slate-100 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-blue-600" />
            PhilHealth Pre-Flight Audit Telemetry
          </span>
          <span className="text-slate-400 text-[11px] font-mono">XML eClaims 3.0</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <div className="p-2 rounded-md bg-slate-50 border border-slate-200">
            <div className="text-slate-500 font-medium">XML Schema Check</div>
            <div className="font-mono font-bold text-emerald-700 text-xs mt-0.5">
              {auditChecklist.xmlConformityPercent}% Verified
            </div>
          </div>

          <div className="p-2 rounded-md bg-slate-50 border border-slate-200">
            <div className="text-slate-500 font-medium">CF4 Notes Attached</div>
            <div className="font-mono font-bold text-blue-700 text-xs mt-0.5">
              {auditChecklist.cf4NotesPercent}% Complete
            </div>
          </div>

          <div className="p-2 rounded-md bg-slate-50 border border-slate-200">
            <div className="text-slate-500 font-medium">ICD-10 vs RVS Match</div>
            <div className="font-mono font-bold text-indigo-700 text-xs mt-0.5">
              {auditChecklist.codingConsistencyPercent}% Matched
            </div>
          </div>

          <div className="p-2 rounded-md bg-slate-50 border border-slate-200">
            <div className="text-slate-500 font-medium">Doctor PAN Verified</div>
            <div className="font-mono font-bold text-emerald-700 text-xs mt-0.5">
              {auditChecklist.doctorPanVerifiedPercent}% Valid
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
