import React, { useState } from 'react';
import { DepartmentMetric } from '@/utils/rcmAnalyticsCalculations';
import { formatPhp } from '@/utils/formatters';
import { Building2, Filter, X } from 'lucide-react';

interface DepartmentExceptionMatrixProps {
  departments: DepartmentMetric[];
  selectedDepartment?: string;
  onSelectDepartment?: (dept: string) => void;
}

export const DepartmentExceptionMatrix: React.FC<DepartmentExceptionMatrixProps> = ({
  departments,
  selectedDepartment,
  onSelectDepartment
}) => {
  const [hoveredDept, setHoveredDept] = useState<DepartmentMetric | null>(null);

  const maxVal = Math.max(...departments.map((d) => d.totalCensus), 80);

  // SVG chart dimensions
  const svgWidth = 600;
  const svgHeight = 240;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 25;
  const padBottom = 55;

  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;
  const numGroups = departments.length;
  const groupWidth = chartWidth / numGroups;
  const barWidth = 14;

  const getY = (val: number) => {
    return padTop + (1 - val / maxVal) * chartHeight;
  };

  const isAnySelected = selectedDepartment && selectedDepartment !== 'All Wards';

  return (
    <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-slate-900">
              Departmental Exception Density &amp; Bed Friction
            </h3>
            {isAnySelected && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                <Filter className="w-3 h-3 text-blue-600" />
                Filtered: {selectedDepartment}
                <button
                  type="button"
                  onClick={() => onSelectDepartment?.('All Wards')}
                  className="hover:text-blue-950 ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-tabulation of inpatient census volume against active billing exceptions and trapped capital per unit.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-slate-300" />
            <span className="text-slate-600 font-medium">Total Inpatient Census</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-amber-500" />
            <span className="text-slate-700 font-bold">Billing Exceptions</span>
          </div>
        </div>
      </div>

      {/* Grouped Clustered Bar Chart SVG */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible select-none"
        >
          {/* Horizontal Grid lines */}
          {[80, 60, 40, 20, 0].map((v) => {
            const y = getY(v);
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
                  {v}
                </text>
              </g>
            );
          })}

          {/* Department Bars */}
          {departments.map((dept, idx) => {
            const groupX = padLeft + idx * groupWidth;
            const bar1X = groupX + groupWidth / 2 - barWidth - 1.5;
            const bar2X = groupX + groupWidth / 2 + 1.5;

            const yTotal = getY(dept.totalCensus);
            const heightTotal = padTop + chartHeight - yTotal;

            const yExc = getY(dept.exceptionsCount);
            const heightExc = padTop + chartHeight - yExc;

            const isSelected = selectedDepartment === dept.department;
            const isDimmed = isAnySelected && !isSelected;

            // Short label for X axis
            const shortName = dept.department
              .replace('Surgical Ward & OB-GYN (3rd Flr)', 'Surg 3F')
              .replace('Internal Medicine & Cardiology (5th Flr)', 'Med 5F')
              .replace('Orthopedics & Pediatrics (6th Flr)', 'Ortho 6F')
              .replace('Telemetry & Step-Down (2nd Flr)', 'Telem 2F')
              .replace('Executive Suites & Deluxe (4th Flr)', 'Suites 4F')
              .replace('Intensive Care Units (ICU / NICU / PICU)', 'ICU/NICU')
              .replace('Emergency Dept Short-Stay (1st Flr)', 'ED 1F')
              .replace('Day Hemodialysis Unit', 'Dialysis');

            return (
              <g
                key={dept.department}
                className="cursor-pointer transition-all"
                opacity={isDimmed ? 0.35 : 1}
                onClick={() =>
                  onSelectDepartment?.(isSelected ? 'All Wards' : dept.department)
                }
                onMouseEnter={() => setHoveredDept(dept)}
                onMouseLeave={() => setHoveredDept(null)}
              >
                {/* Bar 1: Total Census */}
                <rect
                  x={bar1X}
                  y={yTotal}
                  width={barWidth}
                  height={Math.max(heightTotal, 2)}
                  rx="2"
                  className={`transition-colors ${
                    isSelected ? 'fill-blue-600' : 'fill-slate-300 hover:fill-slate-400'
                  }`}
                />

                {/* Bar 2: Exceptions */}
                <rect
                  x={bar2X}
                  y={yExc}
                  width={barWidth}
                  height={Math.max(heightExc, 2)}
                  rx="2"
                  className={`transition-colors ${
                    isSelected ? 'fill-amber-600' : 'fill-amber-500 hover:fill-amber-600'
                  }`}
                />

                {/* X Axis Label */}
                <text
                  x={groupX + groupWidth / 2}
                  y={padTop + chartHeight + 16}
                  textAnchor="middle"
                  className={`text-[10px] font-semibold ${
                    isSelected ? 'fill-blue-700 font-bold' : 'fill-slate-600'
                  }`}
                >
                  {shortName}
                </text>

                {/* Exception Count Label on top of bar */}
                <text
                  x={bar2X + barWidth / 2}
                  y={yExc - 4}
                  textAnchor="middle"
                  className="text-[9px] fill-amber-800 font-mono font-bold"
                >
                  {dept.exceptionsCount}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Card */}
        {hoveredDept && (
          <div className="absolute top-2 right-4 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg font-sans z-10 pointer-events-none space-y-1">
            <div className="font-bold text-slate-100">{hoveredDept.department}</div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-slate-300">Total: {hoveredDept.totalCensus} cases</span>
              <span className="text-amber-400 font-bold">Exceptions: {hoveredDept.exceptionsCount}</span>
              <span className="text-emerald-400">{hoveredDept.cleanPercent}% Clean</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono border-t border-slate-700 pt-1">
              Trapped Capital: {formatPhp(hoveredDept.trappedAmount)}
            </div>
          </div>
        )}
      </div>

      {/* Action Footer Callout */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-blue-600" />
          Clicking any ward bar filters the entire dashboard to that clinical department.
        </span>
        <span className="font-mono text-slate-600">8 Inpatient Units</span>
      </div>
    </div>
  );
};
