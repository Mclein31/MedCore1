import { ViewportOverlay } from '@/components/common/ViewportOverlay';
import React, { useState } from 'react';
import { formatPeso, maskCardNumber } from '../../utils/billFormatters';
import { validateLuhn, validateExpiry } from '../../utils/paymentSimulator';
import { CreditCard, Zap, ShieldCheck, Lock, CheckCircle2 } from '@/components/common/SolarIcons';

interface Props {
  amount: number;
  onPay: (params: {
    payerName: string;
    payerContact: string;
    cardBrand?: 'VISA' | 'MASTERCARD';
    cardLast4?: string;
  }) => void;
  isProcessing?: boolean;
}

export const CardPaymentRail: React.FC<Props> = ({ amount, onPay, isProcessing }) => {
  const [cardholderName, setCardholderName] = useState('Maria Santos');
  const [cardNumber, setCardNumber] = useState('4111 1111 1111 1111');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('123');
  const [is3DsModalOpen, setIs3DsModalOpen] = useState(false);
  const [bankOtp, setBankOtp] = useState('123456');
  const [error, setError] = useState<string | null>(null);

  const cleanNum = cardNumber.replace(/\D/g, '');
  const isVisa = cleanNum.startsWith('4');
  const isMastercard = cleanNum.startsWith('5');

  const handleAutoFillVisa = () => {
    setCardholderName('Maria Santos');
    setCardNumber('4111 1111 1111 1111');
    setExpiry('12/28');
    setCvv('123');
    setError(null);
  };

  const handleAutoFillMastercard = () => {
    setCardholderName('Juan Dela Cruz');
    setCardNumber('5500 0000 0000 0004');
    setExpiry('08/29');
    setCvv('789');
    setError(null);
  };

  const handleInitiateCardPay = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!cardholderName.trim()) {
      setError('Please enter the cardholder name.');
      return;
    }
    if (!validateLuhn(cardNumber)) {
      setError('Invalid card number format (must satisfy 16-digit Luhn check).');
      return;
    }
    if (!validateExpiry(expiry)) {
      setError('Invalid expiration date (must be in MM/YY format with future date).');
      return;
    }
    if (cvv.length < 3) {
      setError('Invalid CVV security code (3 digits).');
      return;
    }

    // Launch simulated 3D-Secure challenge
    setIs3DsModalOpen(true);
  };

  const handleAuthorize3Ds = () => {
    if (isProcessing) return;
    if (bankOtp.length !== 6) {
      setError('Enter the 6-digit bank verification code.');
      return;
    }
    setIs3DsModalOpen(false);
    onPay({
      payerName: cardholderName,
      payerContact: maskCardNumber(cardNumber),
      cardBrand: isVisa ? 'VISA' : isMastercard ? 'MASTERCARD' : 'VISA',
      cardLast4: cleanNum.slice(-4)
    });
  };

  return (
    <div className="p-4 space-y-4 font-sans text-xs">
      {/* Visual Credit Card Preview */}
      <div className="w-full h-36 rounded-2xl bg-gradient-to-tr from-slate-900 via-slate-800 to-blue-900 text-white p-4 shadow-lg flex flex-col justify-between relative overflow-hidden border border-slate-700">
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-blue-400" />
            <span className="font-bold tracking-wider text-xs uppercase text-slate-300">
              Demo Debit / Credit
            </span>
          </div>
          <div className="font-bold text-sm tracking-wider font-mono">
            {isVisa ? 'VISA' : isMastercard ? 'MASTERCARD' : 'CARD'}
          </div>
        </div>

        <div className="z-10 font-mono text-base tracking-widest text-slate-100 font-semibold">
          {cardNumber || '•••• •••• •••• ••••'}
        </div>

        <div className="flex items-end justify-between z-10 text-[10px] text-slate-300">
          <div>
            <div className="uppercase text-[9px] text-slate-400">Cardholder</div>
            <div className="font-semibold uppercase truncate max-w-[160px]">
              {cardholderName || 'CARDHOLDER NAME'}
            </div>
          </div>
          <div>
            <div className="uppercase text-[9px] text-slate-400">Expires</div>
            <div className="font-mono font-semibold">{expiry || 'MM/YY'}</div>
          </div>
        </div>
      </div>

      {/* Preset Auto-Fillers for Presenters */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-500 font-medium">Quick Demo Fill:</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleAutoFillVisa}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100"
          >
            <Zap className="w-3 h-3 text-amber-500" />
            <span>⚡ Visa</span>
          </button>
          <button
            type="button"
            onClick={handleAutoFillMastercard}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100"
          >
            <Zap className="w-3 h-3 text-amber-500" />
            <span>⚡ Mastercard</span>
          </button>
        </div>
      </div>

      {/* Card Form */}
      <form onSubmit={handleInitiateCardPay} className="space-y-3">
        <div>
          <label className="font-bold text-slate-800 block mb-1">Cardholder Name</label>
          <input
            type="text"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            placeholder="Name on card"
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="font-bold text-slate-800 block mb-1">Card Number (16 Digits)</label>
          <input
            type="text"
            maxLength={19}
            value={cardNumber}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
              const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
              setCardNumber(formatted);
            }}
            placeholder="4111 1111 1111 1111"
            className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-bold text-slate-800 block mb-1">Expiry (MM/YY)</label>
            <input
              type="text"
              maxLength={5}
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              placeholder="12/28"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
            />
          </div>
          <div>
            <label className="font-bold text-slate-800 block mb-1">CVV / CVC</label>
            <input
              type="password"
              maxLength={4}
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
              placeholder="123"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
            />
          </div>
        </div>

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
          <Lock className="w-4 h-4" />
          <span>{isProcessing ? 'Processing Card Payment...' : `Pay ${formatPeso(amount)} via Secure Card →`}</span>
        </button>
      </form>

      {/* Simulated 3D-Secure Challenge Modal */}
      {is3DsModalOpen && (
        <ViewportOverlay className="flex items-center justify-center p-4" backdropClassName="bg-slate-900/60 backdrop-blur-xs" motion="rise" layer="nested">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                  BPI
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900">BPI SecurePay 3DS 2.0</div>
                  <div className="text-[10px] text-slate-500">Verified by Visa / Mastercard ID</div>
                </div>
              </div>
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <div>Merchant: <strong>St. Jude Medical Center Manila</strong></div>
              <div>Amount: <strong className="font-mono text-slate-900">{formatPeso(amount)}</strong></div>
              <div>Card: <span className="font-mono text-slate-500">{maskCardNumber(cardNumber)}</span></div>
            </div>

            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 space-y-2">
              <label className="font-bold text-blue-900 block text-xs">
                Enter 6-Digit Bank One-Time Password (OTP)
              </label>
              <input
                type="text"
                maxLength={6}
                value={bankOtp}
                onChange={(e) => setBankOtp(e.target.value)}
                placeholder="123456"
                className="w-full text-center tracking-widest text-xl py-2 rounded-xl border border-blue-300 font-mono font-bold text-blue-900 bg-white"
              />
              <div className="text-[10px] text-center text-slate-500">
                Demo Code: <span className="font-mono font-bold">123456</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setIs3DsModalOpen(false)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleAuthorize3Ds}
                className={`flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs ${
                  isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isProcessing ? 'Authorizing...' : 'Confirm & Pay'}
              </button>
            </div>
          </div>
        </ViewportOverlay>
      )}
    </div>
  );
};
