import { Clock, Zap } from '@/v1/components/common/SolarIcons';
import React, { useEffect, useState } from 'react';
import { formatPeso } from '../../utils/billFormatters';

interface Props {
  amount: number;
  onPay: (params: { payerName: string; payerContact: string }) => void;
  isProcessing?: boolean;
}

export const QrPhPaymentRail: React.FC<Props> = ({ amount, onPay, isProcessing }) => {
  const [secondsRemaining, setSecondsRemaining] = useState(600); // 10 minutes

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const handleSimulatedScan = () => {
    if (isProcessing) return;
    onPay({
      payerName: 'QR Ph Account Holder',
      payerContact: '0917-***-8821',
    });
  };

  return (
    <div className="flex flex-col items-center text-center p-4 space-y-4">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
        <Clock className="w-3.5 h-3.5 text-blue-600" />
        <span>Valid for: {formattedTime}</span>
      </div>

      {/* QR Ph Graphic Frame */}
      <div className="p-4 bg-white rounded-2xl border-2 border-slate-900 shadow-md relative group">
        <div className="w-48 h-48 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center relative p-3">
          {/* Centered QR Graphic using SVG */}
          <svg className="w-full h-full text-slate-900" viewBox="0 0 100 100" fill="currentColor">
            {/* Corner Markers */}
            <rect
              x="5"
              y="5"
              width="28"
              height="28"
              rx="4"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
            />
            <rect x="11" y="11" width="16" height="16" rx="2" />

            <rect
              x="67"
              y="5"
              width="28"
              height="28"
              rx="4"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
            />
            <rect x="73" y="11" width="16" height="16" rx="2" />

            <rect
              x="5"
              y="67"
              width="28"
              height="28"
              rx="4"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
            />
            <rect x="11" y="73" width="16" height="16" rx="2" />

            {/* Simulated Data Pattern Matrix */}
            <rect x="40" y="8" width="6" height="6" />
            <rect x="50" y="8" width="6" height="6" />
            <rect x="40" y="20" width="6" height="6" />
            <rect x="48" y="24" width="6" height="6" />
            <rect x="56" y="18" width="6" height="6" />

            <rect x="10" y="42" width="6" height="6" />
            <rect x="22" y="42" width="6" height="6" />
            <rect x="16" y="52" width="6" height="6" />

            <rect x="40" y="40" width="20" height="20" rx="3" fill="#0284c7" />

            <rect x="70" y="42" width="8" height="8" />
            <rect x="84" y="42" width="8" height="8" />
            <rect x="76" y="54" width="8" height="8" />

            <rect x="42" y="70" width="8" height="8" />
            <rect x="54" y="70" width="8" height="8" />
            <rect x="48" y="82" width="8" height="8" />
            <rect x="70" y="70" width="10" height="10" />
            <rect x="84" y="80" width="8" height="8" />
          </svg>

          {/* QR Ph Badge in center */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="px-2 py-1 bg-white rounded border border-slate-300 shadow-xs text-[10px] font-black text-blue-700 tracking-tighter">
              QR Ph
            </div>
          </div>
        </div>

        <div className="mt-2 text-[11px] font-semibold text-slate-700">St. Jude Medical Center Manila</div>
        <div className="text-[10px] text-slate-400 font-mono">P2M National Standard (BSP Cir. 1055)</div>
      </div>

      <div className="space-y-1">
        <div className="text-xs text-slate-500">Amount to Settle</div>
        <div className="text-2xl font-bold font-mono text-slate-900">{formatPeso(amount)}</div>
        <div className="text-[11px] text-slate-500 max-w-xs">
          Open GCash, Maya, BPI, BDO, or any banking app supporting QR Ph to scan and pay.
        </div>
      </div>

      {/* 1-Click Simulation Button for Judges / Presenters */}
      <button
        type="button"
        disabled={isProcessing}
        onClick={handleSimulatedScan}
        className={`w-full max-w-xs py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2 ${
          isProcessing ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <Zap className="w-4 h-4 text-amber-300" />
        <span>{isProcessing ? 'Processing Payment...' : '⚡ Simulate Customer App Scan & Settle'}</span>
      </button>
    </div>
  );
};
