import React, { useState } from 'react';
import { formatPeso, maskMobile } from '../../utils/billFormatters';
import { validatePhilippineMobile } from '../../utils/paymentSimulator';
import { Zap, ShieldCheck, CheckCircle2 } from '@/components/common/SolarIcons';

interface Props {
  amount: number;
  onPay: (params: { payerName: string; payerContact: string }) => void;
  isProcessing?: boolean;
}

export const MayaPaymentRail: React.FC<Props> = ({ amount, onPay, isProcessing }) => {
  const [identifier, setIdentifier] = useState('0918-992-1049');
  const [password, setPassword] = useState('••••••••');
  const [error, setError] = useState<string | null>(null);

  const mockMayaBalance = 68500;

  const handleAutoFill = () => {
    setIdentifier('0918-992-1049');
    setPassword('DemoMayaPass123!');
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    if (!identifier.trim()) {
      setError('Enter your registered Maya mobile number or email.');
      return;
    }
    onPay({
      payerName: 'Maya Verified Account',
      payerContact: identifier
    });
  };

  return (
    <div className="p-4 space-y-4 font-sans text-xs">
      {/* Maya Branding Header */}
      <div className="p-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-between shadow-xs border-l-4 border-emerald-500">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-900 font-black flex items-center justify-center text-sm shadow-xs">
            M
          </div>
          <div>
            <div className="font-extrabold text-sm tracking-tight leading-tight text-white">Maya Checkout</div>
            <div className="text-[10px] text-emerald-400 font-medium">Digital Bank & E-Wallet</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-400">Total Billed</div>
          <div className="font-mono font-bold text-base text-emerald-400 leading-tight">
            {formatPeso(amount)}
          </div>
        </div>
      </div>

      {/* Preset Auto Fill */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleAutoFill}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
        >
          <Zap className="w-3 h-3 text-amber-500" />
          <span>⚡ Auto-Fill Valid Maya</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="font-bold text-slate-800 block mb-1">
            Registered Mobile Number or Email
          </label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="09XX-XXX-XXXX or name@domain.com"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="font-bold text-slate-800 block mb-1">
            Maya Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Balance Card */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 block">Available Maya Wallet Balance:</span>
            <span className="font-mono font-bold text-slate-800 text-sm">
              {formatPeso(mockMayaBalance)}
            </span>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            Sufficient Funds
          </span>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isProcessing}
          className={`w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2 border border-slate-700 ${
            isProcessing ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <span>{isProcessing ? 'Processing Maya Payment...' : `Pay ${formatPeso(amount)} with Maya Wallet →`}</span>
        </button>
      </form>
    </div>
  );
};
