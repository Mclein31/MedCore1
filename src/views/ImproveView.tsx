import React from 'react';
import { useMedCore } from '../context/MedCoreContext';
import { formatPeso } from '../utils/formatters';
import {
  TrendingUp,
  ShieldAlert,
  CheckCircle2,
  FileCheck2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ExternalLink
} from 'lucide-react';

export const ImproveView: React.FC = () => {
  const rthCategories = [
    { reason: 'Missing CF4 Clinical Summary Elements', before: 34, after: 1, fix: 'Pre-flight AI clinical text audit' },
    { reason: 'Single Period of Confinement (SPC) Conflict', before: 28, after: 0, fix: 'Cir 2024-0021/2025-0015 Auto-Compiler' },
    { reason: 'PhilHealth PIN / Dependency Mismatch', before: 22, after: 0.2, fix: 'Upfront PEC Direct Validation' },
    { reason: 'Unbundled Secondary Procedure Codes', before: 16, after: 0.2, fix: 'All Case Rate Rule Engine' }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 dark:bg-[#0B1120]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
              PILLAR 5: IMPROVE — Denial & Revenue Optimization Engine
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Pre-flight claims auditing and retroactive SPC recovery compiler reducing PhilHealth RTH from 18% to 1.4%.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>PhilHealth eClaims XML: 98.6% Clean Pass</span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase">PhilHealth RTH Rate</span>
          <div className="text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            1.4%
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            vs 18.2% historical hospital baseline
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase">SPC Retroactive Pipeline</span>
          <div className="text-3xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
            ₱8,450,000
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block">
            Circ 2025-0015 re-claims (2019–2024)
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase">+50% Rate Hike Yield</span>
          <div className="text-3xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
            +₱14.8M
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Circ 2024-0037 case rate adjustments
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Audit SLA Verification</span>
          <div className="text-3xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
            420ms
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Pre-flight XML schema & CF4 validation
          </span>
        </div>
      </div>

      {/* RTH Root Cause Transformation Pareto */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 font-mono">
          PhilHealth Return-to-Hospital (RTH) Root Cause Elimination
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Comparison of claim rejection causes before MedCore pre-flight middleware vs active production performance.
        </p>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-400 uppercase">
              <tr>
                <th className="py-2 px-3">Primary Rejection Cause</th>
                <th className="py-2 px-2 text-right">Legacy RTH Share</th>
                <th className="py-2 px-2 text-right">Current MedCore Share</th>
                <th className="py-2 px-3">Automated Intercept Protocol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {rthCategories.map((r) => (
                <tr key={r.reason} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-3 px-3 font-sans font-medium text-slate-900 dark:text-slate-100">
                    {r.reason}
                  </td>
                  <td className="py-3 px-2 text-right text-rose-600 dark:text-rose-400 font-bold">
                    {r.before}%
                  </td>
                  <td className="py-3 px-2 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                    {r.after}%
                  </td>
                  <td className="py-3 px-3 font-sans text-slate-600 dark:text-slate-300">
                    <span className="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-brand-blue dark:text-sky-300 font-mono text-[10px]">
                      {r.fix}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
