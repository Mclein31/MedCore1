import { BedDouble, FileText, ShieldCheck } from '@/v1/components/common/SolarIcons';
import { CUMULATIVE_IMPACT_SERIES } from '@/v1/utils/rcmAnalyticsCalculations';
import React, { useState } from 'react';

export const MedCoreCumulativeImpactChart: React.FC = () => {
  const [hoveredMonth, setHoveredMonth] = useState<(typeof CUMULATIVE_IMPACT_SERIES)[0] | null>(null);

  const data = CUMULATIVE_IMPACT_SERIES;
  const maxVal = 35; // Max 35M PHP

  const svgWidth = 520;
  const svgHeight = 220;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;

  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;

  const getX = (idx: number) => {
    return padLeft + (idx / (data.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    return padTop + (1 - val / maxVal) * chartHeight;
  };

  // Reclaimed Yield Area & Line
  const yieldLine = data
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx).toFixed(1)} ${getY(p.reclaimedYield).toFixed(1)}`)
    .join(' ');

  const yieldArea = `${yieldLine} L ${padLeft + chartWidth} ${padTop + chartHeight} L ${padLeft} ${padTop + chartHeight} Z`;

  // Historical Leakage Line
  const leakageLine = data
    .map(
      (p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx).toFixed(1)} ${getY(p.historicalLeakage).toFixed(1)}`,
    )
    .join(' ');

  return (
    <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-slate-900">
              MedCore Cumulative Economic Yield (12-Mo Horizon)
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Verified ROI
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Avoided PhilHealth RTH write-downs, reclaimed bed-hours, and statutory 0% promissory recovery.
          </p>
        </div>

        <div className="text-left font-mono">
          <div className="text-xs text-slate-400 font-sans">Annualized Economic Yield</div>
          <div className="text-lg font-bold text-emerald-700">+₱31.41M</div>
        </div>
      </div>

      {/* SVG Area Chart */}
      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible select-none">
          <defs>
            <linearGradient id="yieldAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.30" />
              <stop offset="85%" stopColor="#10b981" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[30, 20, 10, 0].map((v) => {
            const y = getY(v);
            return (
              <g key={v}>
                <line x1={padLeft} y1={y} x2={padLeft + chartWidth} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                <text
                  x={padLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 font-mono"
                >
                  ₱{v}M
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={yieldArea} fill="url(#yieldAreaGrad)" />

          {/* Historical Leakage Baseline Line (Rose Dashed) */}
          <path d={leakageLine} fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4 4" />

          {/* MedCore Reclaimed Yield Line (Emerald Solid) */}
          <path d={yieldLine} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />

          {/* Data Points */}
          {data.map((p, idx) => {
            const x = getX(idx);
            const yYield = getY(p.reclaimedYield);
            const isHovered = hoveredMonth?.month === p.month;

            return (
              <circle
                key={p.month}
                cx={x}
                cy={yYield}
                r={isHovered || idx === data.length - 1 ? 4.5 : 2.5}
                className={`transition-all cursor-pointer ${
                  idx === data.length - 1
                    ? 'fill-emerald-600 stroke-white stroke-2'
                    : isHovered
                      ? 'fill-emerald-700 stroke-white stroke-2'
                      : 'fill-emerald-600'
                }`}
                onMouseEnter={() => setHoveredMonth(p)}
                onMouseLeave={() => setHoveredMonth(null)}
              />
            );
          })}

          {/* X Axis Labels */}
          <g className="text-[10px] fill-slate-400 font-mono">
            {data.map((p, idx) => {
              if (idx % 2 !== 0 && idx !== data.length - 1) return null;
              return (
                <text key={p.month} x={getX(idx)} y={padTop + chartHeight + 16} textAnchor="middle">
                  {p.month}
                </text>
              );
            })}
          </g>
        </svg>

        {/* Hover Tooltip */}
        {hoveredMonth && (
          <div className="absolute top-2 right-4 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg font-mono z-10 pointer-events-none">
            <span className="text-slate-400">{hoveredMonth.month}:</span>{' '}
            <strong className="text-emerald-400">+{hoveredMonth.reclaimedYield}M PHP</strong>{' '}
            <span className="text-slate-400 text-[10px]">(vs {hoveredMonth.historicalLeakage}M leakage)</span>
          </div>
        )}
      </div>

      {/* Sub-Metrics Callout Strip */}
      <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200/80">
          <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
            <BedDouble className="w-3.5 h-3.5 text-emerald-600" />
            Reclaimed Bed Capacity
          </div>
          <div className="text-sm font-bold font-mono text-emerald-900 mt-1">+412 Bed-Hours/Day</div>
          <div className="text-[10px] text-emerald-700 mt-0.5">(288m baseline - 32.4m MedCore)</div>
        </div>

        <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-200/80">
          <div className="flex items-center gap-1.5 text-blue-800 font-bold">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            Statutory RA 9439 Promissory
          </div>
          <div className="text-sm font-bold font-mono text-blue-900 mt-1">88.2% Recovery Rate</div>
          <div className="text-[10px] text-blue-700 mt-0.5">vs &lt;20% historical paper default</div>
        </div>

        <div className="p-2.5 rounded-lg bg-purple-50/60 border border-purple-200/80">
          <div className="flex items-center gap-1.5 text-purple-800 font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            Intercepted Claims
          </div>
          <div className="text-sm font-bold font-mono text-purple-900 mt-1">118 Caught Pre-Flight</div>
          <div className="text-[10px] text-purple-700 mt-0.5">Prevented ₱2.86M 60-day write-offs</div>
        </div>
      </div>
    </div>
  );
};

export const AqromedCumulativeImpactChart = MedCoreCumulativeImpactChart;
