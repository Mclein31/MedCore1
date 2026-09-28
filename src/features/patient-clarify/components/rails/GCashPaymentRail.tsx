import React, { useState } from 'react';
import { formatPeso, maskMobile } from '../../utils/billFormatters';
import { validatePhilippineMobile } from '../../utils/paymentSimulator';
import { Smartphone, Zap, CheckCircle2, ShieldCheck, Lock } from 'lucide-react';

interface Props {
  amount: number;
  onPay: (params: { payerName: string; payerContact: string }) => void;
  isProcessing?: boolean;
}

export const GCashPaymentRail: React.FC<Props> = ({ amount, onPay, isProcessing }) => {
  const [mobileNumber, setMobileNumber] = useState('0917-882-9102');
  const [mpin, setMpin] = useState('1234');
  const [otp, setOtp] = useState('123456');
  const [step, setStep] = useState<'LOGIN' | 'OTP' | 'CONFIRM'>('LOGIN');
  const [error, setError] = useState<string | null>(null);

  const mockWalletBalance = 54200;

  const handleAutoFill = () => {
    setMobileNumber('0917-882-9102');
    setMpin('1234');
    setOtp('123456');
    setError(null);
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    setError(null);

    if (step === 'LOGIN') {
      if (!validatePhilippineMobile(mobileNumber)) {
        setError('Please enter a valid 11-digit Philippine mobile number starting with 09.');
        return;
      }
      if (mpin.length !== 4) {
        setError('MPIN must be 4 digits.');
        return;
      }
      setStep('OTP');
    } else if (step === 'OTP') {
      if (otp.length !== 6) {
        setError('Enter the 6-digit SMS OTP code (default: 123456).');
        return;
      }
      setStep('CONFIRM');
    } else if (step === 'CONFIRM') {
      onPay({
        payerName: 'GCash Verified User',
        payerContact: mobileNumber
      });
    }
  };

  return (
    <div className="p-4 space-y-4 font-sans text-xs">
      {/* GCash Header */}
      <div className="p-3.5 bg-blue-600 text-white rounded-xl flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white text-blue-600 font-black flex items-center justify-center text-sm shadow-xs">
            G
          </div>
          <div>
            <div className="font-extrabold text-sm tracking-tight leading-tight">GCash</div>
            <div className="text-[10px] text-blue-100 font-medium">BSP Supervised e-Money Issuer</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-blue-100">Amount Due</div>
          <div className="font-mono font-bold text-base leading-tight">{formatPeso(amount)}</div>
        </div>
      </div>

      {/* Auto-Fill Helper for Quick Demo Presentation */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleAutoFill}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
        >
          <Zap className="w-3 h-3 text-amber-500" />
          <span>⚡ Auto-Fill Valid GCash</span>
        </button>
      </div>

      <form onSubmit={handleNext} className="space-y-4">
        {step === 'LOGIN' && (
          <div className="space-y-3">
            <div>
              <label className="font-bold text-slate-800 block mb-1">
                GCash Registered Mobile Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="09XX-XXX-XXXX"
                  className="w-full pl-3 pr-3 py-2.5 rounded-xl border border-slate-300 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">
                4-Digit MPIN
              </label>
              <input
                type="password"
                maxLength={4}
                value={mpin}
                onChange={(e) => setMpin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full text-center tracking-widest text-lg py-2 rounded-xl border border-slate-300 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {step === 'OTP' && (
          <div className="space-y-3 bg-blue-50/50 p-4 rounded-xl border border-blue-200">
            <div className="flex items-center gap-2 text-blue-800 font-semibold text-xs">
              <Lock className="w-4 h-4 text-blue-600" />
              <span>Simulated 6-Digit SMS OTP Verification</span>
            </div>
            <p className="text-[11px] text-slate-600">
              A demo verification code has been sent to <strong>{maskMobile(mobileNumber)}</strong>.
            </p>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className="w-full text-center tracking-widest text-xl py-2.5 rounded-xl border border-blue-300 font-mono font-bold text-blue-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="text-[10px] text-center text-slate-500">
              Demo Code: <span className="font-mono font-bold text-slate-700">123456</span>
            </div>
          </div>
        )}

        {step === 'CONFIRM' && (
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Payer Account:</span>
              <span className="font-mono font-bold text-slate-800">{maskMobile(mobileNumber)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Simulated GCash Balance:</span>
              <span className="font-mono font-bold text-emerald-700">{formatPeso(mockWalletBalance)}</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
              <span className="font-bold text-slate-900">Total Deduction:</span>
              <span className="font-mono font-bold text-blue-700 text-sm">{formatPeso(amount)}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isProcessing}
          className={`w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2 ${
            isProcessing ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isProcessing
            ? 'Processing GCash Debit...'
            : step === 'LOGIN'
            ? 'Proceed to SMS OTP Verification →'
            : step === 'OTP'
            ? 'Verify OTP & Review →'
            : `Authorize GCash Debit (${formatPeso(amount)})`}
        </button>
      </form>
    </div>
  );
};
