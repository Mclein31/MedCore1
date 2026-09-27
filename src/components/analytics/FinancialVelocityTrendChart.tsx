import React, { useState } from 'react';
import {
  TAT_30_DAYS_SERIES,
  FINANCIAL_INFLOW_RESOLUTION_SERIES,
  DischargeTatPoint
} from '../../utils/rcmAnalyticsCalculations';
import { formatPhp } from '../../utils/formatters';
import { TrendingDown, Activity, Calendar } from 'lucide-react';

interface FinancialVelocityTrendChartProps {
  currentTatMinutes?: number;
}

export const FinancialVelocityTrendChart: React.FC<FinancialVelocityTrendChartProps> = ({
  currentTatMinutes = 32.4
}) => {
  const [activeMode, setActiveMode] = useState<'TAT_DESCENT' | 'INFLOW_RESOLUTION'>('TAT_DESCENT');
  const [hoveredPoint, setHoveredPoint] = useState<DischargeTatPoint | null>(null);

  // Chart geometric bounds
  const svgWidth = 650;
  const svgHeight = 220;
  const padLeft = 45;
  const padRight = 25;
  const padTop = 25;
  const padBottom = 30;

  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;

  // Primary Mode: TAT Descent calculations
  const maxTat = 300;
  const tatData = TAT_30_DAYS_SERIES;

  const getX = (idx: number, total: number) => {
    return padLeft + (idx / (total - 1)) * chartWidth;
  };

  const getY = (val: number, maxVal: number) => {
    return padTop + (1 - val / maxVal) * chartHeight;
  };

  // Generate SVG path for TAT descent
  const tatPath = tatData
    .map((p, idx) => {
      const x = getX(idx, tatData.length);
      const y = getY(p.tatMinutes, maxTat);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  // Generate area fill path
  const tatAreaPath = `${tatPath} L ${padLeft + chartWidth} ${padTop + chartHeight} L ${padLeft} ${padTop + chartHeight} Z`;

  // Reference lines Y positions
  const legacyBaselineY = getY(288, maxTat);
  const slaCeilingY = getY(45, maxTat);
  const targetBandTopY = getY(30, maxTat);
  const targetBandBottomY = getY(15, maxTat);

  // Inflow vs Resolution calculations
  const inflowData = FINANCIAL_INFLOW_RESOLUTION_SERIES;
  const maxInflow = 2.2; // Millions PHP

  const billedPath = inflowData
    .map((p, idx) => {
      const x = getX(idx, inflowData.length);
      const y = getY(p.billed, maxInflow);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  const resolvedPath = inflowData
    .map((p, idx) => {
      const x = getX(idx, inflowData.length);
      const y = getY(p.resolved, maxInflow);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
      {/* Header and Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-slate-900">
              {activeMode === 'TAT_DESCENT'
                ? '30-Day Discharge Turnaround Time (TAT) Descent'
                : '30-Day Financial Inflow vs. Resolution Velocity'}
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Activity className="w-3 h-3 text-blue-600" />
              Real-Time Velocity
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeMode === 'TAT_DESCENT'
              ? 'Daily hospital average discharge duration following attending physician MGH declaration.'
              : 'Daily gross hospital billings vs point-of-sale collections & promissory note closures.'}
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
          <button
            type="button"
            onClick={() => setActiveMode('TAT_DESCENT')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
              activeMode === 'TAT_DESCENT'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Discharge TAT Descent
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('INFLOW_RESOLUTION')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
              activeMode === 'INFLOW_RESOLUTION'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Inflow vs. Resolution
          </button>
        </div>
      </div>

      {/* SVG Chart Container */}
      <div className="relative w-full overflow-hidden">
        {activeMode === 'TAT_DESCENT' ? (
          <div>
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto overflow-visible select-none"
            >
              <defs>
                <linearGradient id="tatGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                  <stop offset="80%" stopColor="#059669" stopOpacity="0.10" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Shaded Target Operating Zone (15m - 30m) */}
              <rect
                x={padLeft}
                y={targetBandTopY}
                width={chartWidth}
                height={targetBandBottomY - targetBandTopY}
                fill="#ecfdf5"
                opacity="0.8"
              />
              <text
                x={padLeft + chartWidth - 6}
                y={targetBandBottomY - 4}
                textAnchor="end"
                className="text-[9px] fill-emerald-700 font-semibold"
              >
                MedCore Digital Target Band (15–30m)
              </text>

              {/* Grid Lines & Y-Axis Labels */}
              {[300, 225, 150, 75, 0].map((v) => {
                const y = getY(v, maxTat);
                return (
                  <g key={v}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={padLeft + chartWidth}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                    />
                    <text
                      x={padLeft - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      className="text-[10px] fill-slate-400 font-mono"
                    >
                      {v}m
                    </text>
                  </g>
                );
              })}

              {/* Historical Baseline Line (288m) */}
              <line
                x1={padLeft}
                y1={legacyBaselineY}
                x2={padLeft + chartWidth}
                y2={legacyBaselineY}
                stroke="#f43f5e"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <text
                x={padLeft + 6}
                y={legacyBaselineY - 4}
                className="text-[9px] fill-rose-600 font-semibold"
              >
                Historical Baseline: 288 mins (4.8h legacy paper)
              </text>

              {/* Statutory SLA Ceiling Line (45m) */}
              <line
                x1={padLeft}
                y1={slaCeilingY}
                x2={padLeft + chartWidth}
                y2={slaCeilingY}
                stroke="#d97706"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <text
                x={padLeft + 6}
                y={slaCeilingY - 4}
                className="text-[9px] fill-amber-700 font-semibold"
              >
                Statutory SLA Ceiling: 45 mins
              </text>

              {/* Area Gradient */}
              <path d={tatAreaPath} fill="url(#tatGrad)" />

              {/* Curve Line */}
              <path
                d={tatPath}
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points */}
              {tatData.map((p, idx) => {
                const x = getX(idx, tatData.length);
                const y = getY(p.tatMinutes, maxTat);
                const isSelected = p.isToday;
                const isHovered = hoveredPoint?.day === p.day;

                return (
                  <circle
                    key={p.day}
                    cx={x}
                    cy={y}
                    r={isSelected || isHovered ? 4.5 : 2}
                    className={`transition-all cursor-pointer ${
                      isSelected
                        ? 'fill-emerald-600 stroke-white stroke-2 ring-2 ring-emerald-300'
                        : isHovered
                        ? 'fill-blue-700 stroke-white stroke-2'
                        : idx % 5 === 0 || idx === tatData.length - 1
                        ? 'fill-blue-600'
                        : 'fill-transparent hover:fill-blue-400'
                    }`}
                    onMouseEnter={() => setHoveredPoint(p)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                );
              })}

              {/* X-Axis Tick Labels */}
              <g className="text-[10px] fill-slate-400 font-mono">
                <text x={padLeft} y={padTop + chartHeight + 18} textAnchor="start">
                  Day 1 (274m)
                </text>
                <text x={getX(9, tatData.length)} y={padTop + chartHeight + 18} textAnchor="middle">
                  Day 10 (172m)
                </text>
                <text x={getX(19, tatData.length)} y={padTop + chartHeight + 18} textAnchor="middle">
                  Day 20 (75m)
                </text>
                <text x={padLeft + chartWidth} y={padTop + chartHeight + 18} textAnchor="end" className="fill-emerald-700 font-bold">
                  Today (32.4m)
                </text>
              </g>
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredPoint && (
              <div className="absolute top-2 right-4 bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-lg font-mono pointer-events-none z-10">
                <span className="text-slate-400">Day {hoveredPoint.day}:</span>{' '}
                <strong className="text-emerald-400">{hoveredPoint.tatMinutes} mins</strong>{' '}
                <span className="text-[10px] text-slate-300">
                  ({hoveredPoint.tatMinutes <= 45 ? 'SLA Compliant' : 'Breached Baseline'})
                </span>
              </div>
            )}
          </div>
        ) : (
          <div>
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto overflow-visible select-none"
            >
              {/* Grid Lines */}
              {[2.0, 1.5, 1.0, 0.5, 0.0].map((v) => {
                const y = getY(v, maxInflow);
                return (
                  <g key={v}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={padLeft + chartWidth}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                    />
                    <text
                      x={padLeft - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      className="text-[10px] fill-slate-400 font-mono"
                    >
                      ₱{v.toFixed(1)}M
                    </text>
                  </g>
                );
              })}

              {/* Billed Path (Slate Line) */}
              <path
                d={billedPath}
                fill="none"
                stroke="#64748b"
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* Resolved Path (Emerald Line) */}
              <path
                d={resolvedPath}
                fill="none"
                stroke="#059669"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Data points */}
              {inflowData.map((p, idx) => {
                const x = getX(idx, inflowData.length);
                const y1 = getY(p.billed, maxInflow);
                const y2 = getY(p.resolved, maxInflow);
                return (
                  <g key={p.day}>
                    <circle cx={x} cy={y1} r="3" fill="#64748b" />
                    <circle cx={x} cy={y2} r="3.5" fill="#059669" stroke="white" strokeWidth="1.5" />
                  </g>
                );
              })}

              {/* X-Axis labels */}
              <g className="text-[10px] fill-slate-400 font-mono">
                {inflowData.map((p, idx) => (
                  <text
                    key={p.day}
                    x={getX(idx, inflowData.length)}
                    y={padTop + chartHeight + 18}
                    textAnchor="middle"
                  >
                    Day {p.day}
                  </text>
                ))}
              </g>
            </svg>
          </div>
        )}
      </div>

      {/* Footer Metrics & Legend */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs gap-3">
        <div className="flex flex-wrap items-center gap-4">
          {activeMode === 'TAT_DESCENT' ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-rose-500 rounded-full" />
                <span className="text-slate-600">Historical Paper: <strong className="font-mono text-slate-800">288m (4.8h)</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-amber-500 rounded-full" />
                <span className="text-slate-600">Statutory SLA: <strong className="font-mono text-slate-800">45m</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-emerald-100 border border-emerald-300 rounded-xs" />
                <span className="text-slate-600">Target Band: <strong className="font-mono text-emerald-800">15–30m</strong></span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-slate-500 rounded-full" />
                <span className="text-slate-600">Gross Daily Billed: <strong className="font-mono text-slate-800">₱1.82M/d</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-emerald-600 rounded-full" />
                <span className="text-slate-600">Daily Cleared/Resolved: <strong className="font-mono text-emerald-700">₱1.81M/d (99.4%)</strong></span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 text-emerald-700 font-semibold">
          <TrendingDown className="w-4 h-4" />
          <span>Velocity: 88.7% TAT reduction verified</span>
        </div>
      </div>
    </div>
  );
};
