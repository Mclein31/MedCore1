import { ViewportOverlay } from '@/components/common/ViewportOverlay';
import React, { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { DemoPaymentRail } from '../types/billing';

interface Props {
  rail: DemoPaymentRail;
  isOpen: boolean;
}

export const PaymentProcessingOverlay: React.FC<Props> = ({ rail, isOpen }) => {
  const [phase, setPhase] = useState(1);

  useEffect(() => {
    if (!isOpen) {
      setPhase(1);
      return;
    }
    const t1 = setTimeout(() => setPhase(2), 700);
    const t2 = setTimeout(() => setPhase(3), 1400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getRailTitle = () => {
    switch (rail) {
      case 'QR_PH':
        return 'Bangko Sentral QR Ph Switch';
      case 'GCASH':
        return 'GCash Payment Gateway';
      case 'MAYA':
        return 'Maya Digital Bank Switch';
      case 'CREDIT_DEBIT_CARD':
        return 'Visa / Mastercard 3DS Switch';
      case 'BANK_TRANSFER':
        return 'BancNet / InstaPay Network';
      case 'PROMISSORY_NOTE':
        return 'RA 9439 Statutory Registry';
      default:
        return 'Payment Switch';
    }
  };

  return (
    <ViewportOverlay className="flex items-center justify-center p-4" backdropClassName="bg-slate-900/60 backdrop-blur-sm" motion="fade" layer="processing">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full border border-slate-200 shadow-2xl flex flex-col items-center text-center space-y-5">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
        </div>

        <div>
          <h3 className="font-bold text-base text-slate-900">
            Processing Simulated Payment
          </h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {getRailTitle()}
          </p>
        </div>

        {/* Phase Telemetry Steps */}
        <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5 text-left text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                phase >= 1 ? 'bg-blue-600 animate-pulse' : 'bg-slate-300'
              }`}
            />
            <span
              className={
                phase >= 1
                  ? 'font-semibold text-slate-800'
                  : 'text-slate-400'
              }
            >
              1. Contacting simulated financial rail...
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                phase >= 2 ? 'bg-blue-600 animate-pulse' : 'bg-slate-300'
              }`}
            />
            <span
              className={
                phase >= 2
                  ? 'font-semibold text-slate-800'
                  : 'text-slate-400'
              }
            >
              2. Verifying ledger authorization & funds...
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                phase >= 3 ? 'bg-emerald-600 animate-pulse' : 'bg-slate-300'
              }`}
            />
            <span
              className={
                phase >= 3
                  ? 'font-semibold text-emerald-800'
                  : 'text-slate-400'
              }
            >
              3. Issuing BIR Official Receipt & Gate Pass...
            </span>
          </div>
        </div>

        <div className="text-[10px] text-slate-400 font-mono tracking-tight">
          TEST ENVIRONMENT · ZERO LIVE CHARGES
        </div>
      </div>
    </ViewportOverlay>
  );
};
