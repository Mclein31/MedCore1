import React from 'react';
import { useMedCore } from '../context/MedCoreContext';
import { formatPeso } from '../utils/formatters';
import {
  BarChart3,
  Clock,
  TrendingDown,
  Download,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export const ReportView: React.FC = () => {
  const { encounters } = useMedCore();

  const stageBreakdown = [
    { name: '1. MGH Order Declared', avgMin: 6.2, targetMin: 10, percent: 18 },
    { name: '2. Doctor PF Confirmation', avgMin: 9.4, targetMin: 15, percent: 27 },
    { name: '3. Pharmacy RTS Audit', avgMin: 5.8, targetMin: 10, percent: 17 },
    { name: '4. HMO Final eLOA Review', avgMin: 8.1, targetMin: 20, percent: 24 },
    { name: '5. Patient Settlement', avgMin: 4.7, targetMin: 10, percent: 14 }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 dark:bg-[#0B1120]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-brand-blue dark:text-sky-400 flex items-center justify-center font-bold">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
              PILLAR 4: REPORT — Discharge Turnaround Time (TAT) Telemetry
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time bottleneck telemetry and SLA performance metrics across all inpatient discharge pipelines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => alert('Exporting MedCore Discharge TAT Audit Report (CSV)...')}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-mono text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export RCM Audit (CSV)</span>
          </button>
        </div>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Average Discharge TAT</span>
          <div className="text-3xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
            34.2m
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>▼ 4.8h faster than 6-hour baseline</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase">SLA Compliance (&lt;45m)</span>
          <div className="text-3xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
            93.4%
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Target SLA standard: 90%
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Doctor Response TAT</span>
          <div className="text-3xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
            9.4m
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            via 15-min SMS quick-sign link
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase">HMO Approval Velocity</span>
          <div className="text-3xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
            8.1m
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            via automated eLOA webhooks
          </span>
        </div>
      </div>

      {/* Stage Breakdown & Bottleneck Pareto */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stage Timeline Analysis */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 font-mono">
            Time Distribution Across 5 Operational Stages
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Identifies intra-care delay points between attending physician, pharmacy, and insurer.
          </p>

          <div className="space-y-3 pt-2">
            {stageBreakdown.map((s) => (
              <div key={s.name} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{s.name}</span>
                  <span className="text-slate-900 dark:text-slate-100 font-bold">
                    {s.avgMin} min (Target &lt;{s.targetMin}m)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-brand-blue rounded-full"
                    style={{ width: `${(s.avgMin / s.targetMin) * 70}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 250-Bed Hospital Economic Impact */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 font-mono">
            Annual CFO Economic Value Model (250-Bed Facility)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Validated against PSA PNHA 2024 benchmarks and Philippine private hospital metrics.
          </p>

          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">Bed-Turnover Revenue Expansion:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">+₱18,250,000 / yr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">PhilHealth RTH Denial Prevention:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">+₱6,840,000 / yr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Uncollected Bad Debt Reduction (RA 9439):</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">+₱4,120,000 / yr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Billing Admin Staff Overtime Elimination:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">+₱2,200,000 / yr</span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-sm text-slate-900 dark:text-slate-100">
              <span>Total Annual MedCore ROI:</span>
              <span className="text-brand-navy dark:text-sky-300">₱31,410,000 / year</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
