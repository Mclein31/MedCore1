import React from 'react';

export const VelocityRecoveryPulse: React.FC = () => {
  return (
    <footer className="h-12 border-t border-slate-200 bg-slate-50 px-6 flex items-center justify-between z-10 shrink-0 overflow-x-auto text-xs text-slate-600">
      <div className="flex items-center gap-6 min-w-max">
        <div className="flex items-baseline gap-1.5">
          <span className="text-slate-500 font-medium">24h average TAT:</span>
          <span className="font-bold text-slate-900">Unavailable</span>
          <span className="text-emerald-700 font-semibold text-[11px]">(history not available)</span>
        </div>

        <span className="text-slate-300">·</span>

        <div className="flex items-baseline gap-1.5">
          <span className="text-slate-500 font-medium">Bed-hours reclaimed:</span>
          <span className="font-bold text-slate-900">Unavailable</span>
          <span className="text-slate-500 text-[11px]"></span>
        </div>

        <span className="text-slate-300">·</span>

        <div className="flex items-baseline gap-1.5">
          <span className="text-slate-500 font-medium">Clean claim rate:</span>
          <span className="font-bold text-slate-900">Unavailable</span>
          <span className="text-blue-700 font-semibold text-[11px]"></span>
        </div>

        <span className="text-slate-300">·</span>

        <div className="flex items-baseline gap-1.5">
          <span className="text-slate-500 font-medium">Digital collections:</span>
          <span className="font-bold text-slate-900 font-mono">Unavailable</span>
          <span className="text-slate-500 text-[11px]">(QR Ph / e-Wallets)</span>
        </div>

        <span className="text-slate-300">·</span>

        <div className="flex items-baseline gap-1.5">
          <span className="text-slate-500 font-medium">RA 9439 promissory compliance:</span>
          <span className="font-bold text-emerald-700">Unavailable</span>
        </div>
      </div>
    </footer>
  );
};
