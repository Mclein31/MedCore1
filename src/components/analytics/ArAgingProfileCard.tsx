import React from 'react';
import { ArAgingSummary } from '../../types/domain';
import { formatPhp } from '../../utils/formatters';
import { Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ArAgingProfileCardProps {
  agingBuckets: ArAgingSummary[];
}

export const ArAgingProfileCard: React.FC<ArAgingProfileCardProps> = ({ agingBuckets }) => {
  const totalAr = agingBuckets.reduce((acc, b) => acc + b.amount, 0);

  return (
    <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-slate-900">
              Accounts Receivable (AR) Aging Profile
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              60-Day Statutory Filing Rule
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Outstanding inpatient receivables partitioned by statutory adjudication age.
          </p>
        </div>

        <div className="text-left font-mono">
          <div className="text-xs text-slate-400 font-sans">Total Net Active AR</div>
          <div className="text-lg font-bold text-slate-900">{formatPhp(totalAr)}</div>
        </div>
      </div>

      {/* Proportional Aging Bar */}
      <div className="space-y-1.5">
        <div className="h-3 w-full rounded-full bg-slate-100 flex overflow-hidden">
          {agingBuckets.map((b, idx) => {
            const colors = ['bg-emerald-600', 'bg-amber-500', 'bg-blue-600', 'bg-rose-500'];
            return (
              <div
                key={b.bucket}
                style={{ width: `${b.percentage}%` }}
                className={`h-full ${colors[idx % colors.length]}`}
                title={`${b.bucket}: ${formatPhp(b.amount)} (${b.percentage}%)`}
              />
            );
          })}
        </div>

        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
          <span>0 Days (Discharge)</span>
          <span className="text-amber-700 font-semibold">60-Day Cutoff Alert</span>
          <span>90+ Days</span>
        </div>
      </div>

      {/* Itemized Bucket List */}
      <div className="space-y-2 pt-1">
        {agingBuckets.map((b) => (
          <div
            key={b.bucket}
            className={`p-3 rounded-lg border flex items-center justify-between text-xs text-left ${
              b.isStatutoryRisk
                ? 'bg-amber-50/70 border-amber-300'
                : 'bg-slate-50/70 border-slate-200'
            }`}
          >
            <div className="space-y-0.5 text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-900">{b.bucket}</span>
                {b.isStatutoryRisk && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                    Statutory Cutoff
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500">{b.status}</div>
            </div>

            <div className="text-left shrink-0 pl-3">
              <div className="font-mono font-bold text-slate-900 text-xs">
                {formatPhp(b.amount)}
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                {b.percentage.toFixed(1)}% of total AR
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
