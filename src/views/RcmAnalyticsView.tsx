import React, { useState } from 'react';
import { formatPhp } from '../utils/formatters';
import { ArrowDownRight, ArrowUpRight, BarChart3, TrendingDown, Clock, ShieldCheck, DollarSign, AlertCircle } from 'lucide-react';

export const RcmAnalyticsView: React.FC = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'30D' | '90D' | 'YTD'>('30D');

  const rthCategories = [
    { reason: 'Missing CF4 Clinical Summary Elements', before: 34, after: 1.2, fix: 'Pre-flight clinical text validator' },
    { reason: 'Single Period of Confinement (SPC) Conflict', before: 28, after: 0.0, fix: 'Cir 2024-0021/2025-0015 Auto-Compiler' },
    { reason: 'PhilHealth PIN / Dependency Mismatch', before: 22, after: 0.3, fix: 'Upfront PEC Direct Validation' },
    { reason: 'Unbundled Secondary Procedure Codes', before: 16, after: 0.2, fix: 'All-Case-Rate Rule Engine' }
  ];

  const stageBreakdown = [
    { name: '1. MGH Order Declared', avgMin: 6.2, targetMin: 10, compliance: '98%' },
    { name: '2. Doctor PF Confirmation', avgMin: 9.4, targetMin: 15, compliance: '94%' },
    { name: '3. Pharmacy RTS Audit', avgMin: 5.8, targetMin: 10, compliance: '96%' },
    { name: '4. HMO Final eLOA Review', avgMin: 8.1, targetMin: 20, compliance: '91%' },
    { name: '5. Patient Settlement', avgMin: 4.7, targetMin: 10, compliance: '97%' },
    { name: '6. Digital Gate Pass Issued', avgMin: 1.2, targetMin: 5, compliance: '99%' }
  ];

  const payerPerformance = [
    { payer: 'Maxicare', volume: 248, avgTat: '32m', disallowanceRate: '2.1%', cleanApproval: '97.9%', mtdBilled: 14850000 },
    { payer: 'Intellicare', volume: 192, avgTat: '24m', disallowanceRate: '1.8%', cleanApproval: '98.2%', mtdBilled: 11240000 },
    { payer: 'Medicard', volume: 142, avgTat: '18m', disallowanceRate: '1.4%', cleanApproval: '98.6%', mtdBilled: 8410000 },
    { payer: 'Pacific Cross', volume: 88, avgTat: '44m', disallowanceRate: '4.2%', cleanApproval: '95.8%', mtdBilled: 5920000 },
    { payer: 'PhilCare', volume: 64, avgTat: '30m', disallowanceRate: '2.6%', cleanApproval: '97.4%', mtdBilled: 4100000 }
  ];

  const trappedCapitalDrivers = [
    { driver: 'HMO eLOA Code Delay', amount: 1840000, share: 38, avgDelay: '52m avg' },
    { driver: 'Doctor Excess PF Negotiation', amount: 1280000, share: 26, avgDelay: '34m avg' },
    { driver: 'Disallowed Consumables Clarification', amount: 890000, share: 18, avgDelay: '28m avg' },
    { driver: 'Pharmacy RTS Return Slip Processing', amount: 510000, share: 11, avgDelay: '18m avg' },
    { driver: 'Cashier In-Person Queue Friction', amount: 340000, share: 7, avgDelay: '22m avg' }
  ];

  const arAging = [
    { bucket: 'Current (0–30 Days)', amount: 28400000, percentage: 72.8, status: 'Healthy Inpatient Pipeline' },
    { bucket: '31–60 Days', amount: 7210000, percentage: 18.5, status: 'PhilHealth eClaims Adjudication' },
    { bucket: '61–90 Days', amount: 2420000, percentage: 6.2, status: 'HMO Reconsiderations & Appeals' },
    { bucket: '90+ Days', amount: 980000, percentage: 2.5, status: 'Circular 2025-0015 Retroactive' }
  ];

  // 30-Day Turnaround Descent Data Points (realistic noisy decline from 270m down to 32.4m)
  const tat30Days = [
    274, 268, 255, 240, 232, 215, 204, 198, 185, 172,
    160, 148, 138, 125, 118, 104, 96, 88, 82, 75,
    68, 62, 58, 52, 48, 44, 39, 36, 34, 32.4
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            RCM Analytics &amp; Revenue Intelligence
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            PhilHealth RTH root-cause Pareto, multi-payer LOA velocity, trapped capital distribution, and 250-bed economic yield.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-white shadow-2xs">
            {(['30D', '90D', 'YTD'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTimeframe(t)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  selectedTimeframe === t ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={() => alert('Generating Comprehensive Executive RCM Audit Report (PDF)...')}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs"
          >
            Export Executive Report
          </button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs grid grid-cols-2 md:grid-cols-4 gap-6 text-sm divide-y md:divide-y-0 md:divide-x divide-slate-200">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Discharge TAT</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">32.4 mins</div>
          <div className="text-xs text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Down from 4.8h historical baseline</span>
          </div>
        </div>

        <div className="md:pl-6 pt-3 md:pt-0">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">PhilHealth RTH Denial Rate</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">1.2%</div>
          <div className="text-xs text-slate-500 mt-0.5">vs. 18.2% national average</div>
        </div>

        <div className="md:pl-6 pt-3 md:pt-0">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Days in AR (DAR)</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">21.4 days</div>
          <div className="text-xs text-slate-500 mt-0.5">Down from 58.6 days (37.2d lift)</div>
        </div>

        <div className="md:pl-6 pt-3 md:pt-0">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Annualized Bottom-Line Yield</div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">+₱31.41M</div>
          <div className="text-xs text-slate-500 mt-0.5">Reclaimed bed capacity &amp; clean claims</div>
        </div>
      </div>

      {/* 30-Day Discharge Turnaround Trend Visualizer */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              30-Day Discharge Turnaround Time (TAT) Descent
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Daily hospital average discharge duration following Attending Physician MGH declaration (Target: &lt;45 mins).
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="text-slate-400">Baseline: 288 mins</span>
            <span className="text-amber-600">SLA Cap: 45 mins</span>
            <span className="text-emerald-700 font-bold">Current: 32.4 mins</span>
          </div>
        </div>

        {/* CSS Sparkline / Bar Graph */}
        <div className="pt-4">
          <div className="h-32 flex items-end gap-1.5 border-b border-slate-200 pb-2">
            {tat30Days.map((val, idx) => {
              const heightPct = Math.max(12, Math.round((val / 288) * 100));
              const isRecent = idx >= 25;
              const isToday = idx === 29;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center group relative">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-sm transition-all ${
                      isToday
                        ? 'bg-emerald-600 ring-2 ring-emerald-300'
                        : isRecent
                        ? 'bg-blue-600'
                        : 'bg-slate-300 group-hover:bg-slate-400'
                    }`}
                  />
                  {/* Tooltip on hover */}
                  <div className="absolute -top-8 hidden group-hover:block bg-slate-900 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-20">
                    Day {idx + 1}: {val}m
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 mt-2 font-mono">
            <span>Day 1 (274m)</span>
            <span>Day 10 (172m)</span>
            <span>Day 20 (75m)</span>
            <span className="font-bold text-emerald-700">Today (32.4m)</span>
          </div>
        </div>
      </div>

      {/* Trapped Capital Pareto & AR Aging Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trapped Capital Pareto */}
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">
                Trapped Capital by Friction Source
              </h3>
              <span className="text-xs font-mono font-bold text-slate-700">
                ₱4.86M Total
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Breakdown of receivables delayed by administrative and authorization friction.
            </p>
          </div>

          <div className="space-y-3 pt-1">
            {trappedCapitalDrivers.map((t) => (
              <div key={t.driver} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-800">{t.driver}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{formatPhp(t.amount)}</span>
                    <span className="text-[11px] text-slate-400 font-mono">({t.share}%)</span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${t.share}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AR Aging Buckets */}
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">
                Accounts Receivable (AR) Aging Profile
              </h3>
              <span className="text-xs font-mono font-bold text-slate-700">
                ₱39.01M Total
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Outstanding inpatient claims distribution across payer aging windows.
            </p>
          </div>

          <div className="space-y-3 pt-1">
            {arAging.map((b) => (
              <div key={b.bucket} className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-900">{b.bucket}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{b.status}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-slate-900 text-sm">
                    {formatPhp(b.amount)}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono font-semibold">
                    {b.percentage}% of total AR
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Multi-Payer Performance & Turnaround Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h3 className="font-bold text-base text-slate-900">
            Commercial HMO Carrier Performance Matrix
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Turnaround times, first-pass approval rates, and disallowance ratios by private health plan.
          </p>
        </div>

        <div className="max-h-[380px] overflow-y-auto overflow-x-auto overscroll-contain">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
              <tr className="text-xs font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3.5 px-6 text-left">HMO Carrier</th>
                <th className="py-3.5 px-4 text-left">Inpatient Cases</th>
                <th className="py-3.5 px-4 text-left">Avg eLOA TAT</th>
                <th className="py-3.5 px-4 text-left">Disallowance Rate</th>
                <th className="py-3.5 px-4 text-left">Clean Approval</th>
                <th className="py-3.5 px-6 text-left">Total Reconciled MTD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payerPerformance.map((p) => (
                <tr key={p.payer} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-6 font-semibold text-slate-900 text-sm text-left">
                    {p.payer}
                  </td>
                  <td className="py-3.5 px-4 text-left font-mono font-medium text-slate-700">
                    {p.volume}
                  </td>
                  <td className="py-3.5 px-4 text-left font-mono font-bold text-slate-800">
                    {p.avgTat}
                  </td>
                  <td className="py-3.5 px-4 text-left font-mono font-semibold text-rose-700">
                    {p.disallowanceRate}
                  </td>
                  <td className="py-3.5 px-4 text-left font-mono font-bold text-emerald-700">
                    {p.cleanApproval}
                  </td>
                  <td className="py-3.5 px-6 text-left font-mono font-bold text-slate-900">
                    {formatPhp(p.mtdBilled)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RTH Root Cause Elimination & 6-Stage Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RTH Pareto Elimination */}
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              PhilHealth RTH Root Cause Elimination
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Historical claim rejection rates compared with active production performance.
            </p>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {rthCategories.map((r) => (
              <div key={r.reason} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">{r.reason}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{r.fix}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-slate-400 line-through">{r.before}%</div>
                  <div className="font-mono font-bold text-emerald-700 text-sm">{r.after}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 6-Stage Discharge SLA Breakdown */}
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              Discharge Duration Across 6 Operational Milestones
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Average minutes per milestone vs. target statutory SLA ceilings.
            </p>
          </div>

          <div className="space-y-3 pt-1">
            {stageBreakdown.map((s) => (
              <div key={s.name} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-800">{s.name}</span>
                  <span className="font-mono text-slate-600">{s.avgMin}m of {s.targetMin}m target ({s.compliance})</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${(s.avgMin / s.targetMin) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
