import React, { useState, useRef } from 'react';
import { DemoPaymentRail, DemoPaymentRecord } from '../types/billing';
import { formatPeso } from '../utils/billFormatters';
import { QrPhPaymentRail } from './rails/QrPhPaymentRail';
import { GCashPaymentRail } from './rails/GCashPaymentRail';
import { MayaPaymentRail } from './rails/MayaPaymentRail';
import { CardPaymentRail } from './rails/CardPaymentRail';
import { BankTransferRail } from './rails/BankTransferRail';
import { PromissoryPaymentRail } from './rails/PromissoryPaymentRail';
import { PaymentProcessingOverlay } from './PaymentProcessingOverlay';
import {
  X,
  CreditCard,
  QrCode,
  Smartphone,
  Building,
  Scale,
  AlertTriangle,
  Zap,
  CheckCircle2
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  encounterId: string;
  patientName: string;
  totalDue: number;
  remainingBalance: number;
  onProcessPayment: (params: {
    encounterId: string;
    amount: number;
    paymentRail: DemoPaymentRail;
    payerName: string;
    payerContactMasked: string;
    failureSimulated?: boolean;
    promissoryMonths?: 3 | 6 | 12;
    borrowerIdType?: string;
    borrowerIdNumber?: string;
    bankName?: string;
  }) => Promise<{ success: boolean; paymentRecord?: DemoPaymentRecord; error?: string }>;
  onPaymentSuccess: (payment: DemoPaymentRecord) => void;
}

export const DemoPaymentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  encounterId,
  patientName,
  totalDue,
  remainingBalance,
  onProcessPayment,
  onPaymentSuccess
}) => {
  if (!isOpen) return null;

  const [activeRail, setActiveRail] = useState<DemoPaymentRail>('QR_PH');
  const [paymentMode, setPaymentMode] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [partialAmount, setPartialAmount] = useState<string>(
    String(Math.min(remainingBalance, Math.max(1000, Math.round(remainingBalance / 2))))
  );
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // In-flight submission lock to prevent duplicate clicks and double execution
  const isSubmittingRef = useRef(false);

  const effectiveAmount =
    paymentMode === 'FULL'
      ? remainingBalance
      : Math.min(remainingBalance, Math.max(1, parseFloat(partialAmount) || 1));

  const handlePayRail = async (params: {
    payerName: string;
    payerContact: string;
    promissoryMonths?: 3 | 6 | 12;
    borrowerIdType?: string;
    borrowerIdNumber?: string;
    bankName?: string;
    cardBrand?: 'VISA' | 'MASTERCARD';
    cardLast4?: string;
  }) => {
    if (isSubmittingRef.current || isProcessing) return;
    isSubmittingRef.current = true;
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const res = await onProcessPayment({
        encounterId,
        amount: effectiveAmount,
        paymentRail: activeRail,
        payerName: params.payerName,
        payerContactMasked: params.payerContact,
        failureSimulated: simulateFailure,
        promissoryMonths: params.promissoryMonths,
        borrowerIdType: params.borrowerIdType,
        borrowerIdNumber: params.borrowerIdNumber,
        bankName: params.bankName
      });

      if (res.success && res.paymentRecord) {
        onClose();
        onPaymentSuccess(res.paymentRecord);
      } else {
        setErrorMessage(
          res.error || 'Simulated Payment Timeout: Gateway returned temporary test decline.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Payment simulation error.');
    } finally {
      setIsProcessing(false);
      isSubmittingRef.current = false;
    }
  };

  const railsList: { id: DemoPaymentRail; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'QR_PH', label: 'QR Ph (P2M)', icon: QrCode },
    { id: 'GCASH', label: 'GCash', icon: Smartphone },
    { id: 'MAYA', label: 'Maya', icon: Smartphone },
    { id: 'CREDIT_DEBIT_CARD', label: 'Debit / Credit', icon: CreditCard },
    { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building },
    { id: 'PROMISSORY_NOTE', label: 'RA 9439 Note', icon: Scale }
  ];

  return (
    <>
      <div className="fixed inset-0 z-60 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
          {/* Demo Sandbox Watermark Banner */}
          <div className="bg-amber-500 text-slate-950 px-4 py-2 text-center text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 select-none shrink-0">
            <AlertTriangle className="w-4 h-4 text-slate-950 shrink-0" />
            <span>Demo Sandbox — Exhibition Only — No Real Money Will Be Charged</span>
          </div>

          {/* Modal Header */}
          <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
            <div>
              <h3 className="font-bold text-base text-slate-900 leading-tight">
                Simulated Patient Checkout
              </h3>
              <p className="text-xs text-slate-500">
                St. Jude Medical Center Manila · Discharge Desk
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body: Scrollable */}
          <div className="p-6 overflow-y-auto flex-1 space-y-5">
            {/* Amount Selection Section */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Remaining Patient Balance
                  </span>
                  <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 mt-0.5">
                    {formatPeso(remainingBalance)}
                  </div>
                </div>

                {/* Full vs Partial Toggle */}
                <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('FULL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      paymentMode === 'FULL'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Full Settlement
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode('PARTIAL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      paymentMode === 'PARTIAL'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Partial Amount
                  </button>
                </div>
              </div>

              {/* Partial Amount Input */}
              {paymentMode === 'PARTIAL' && (
                <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                    Amount to Pay (₱):
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={remainingBalance}
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    className="w-full sm:flex-1 px-3 py-1.5 rounded-xl border border-slate-300 font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Payment Rail Navigation Tabs */}
            <div>
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Select Simulated Payment Channel
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {railsList.map((r) => {
                  const Icon = r.icon;
                  const isActive = activeRail === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      disabled={isProcessing}
                      onClick={() => {
                        setActiveRail(r.id);
                        setErrorMessage(null);
                      }}
                      className={`p-2 sm:p-2.5 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all ${
                        isActive
                          ? 'bg-blue-50 border-blue-600 text-blue-900 font-bold shadow-2xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      } ${isProcessing ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span className="text-[10px] sm:text-[11px] leading-tight line-clamp-1">{r.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Rail Container */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {activeRail === 'QR_PH' && (
                <QrPhPaymentRail amount={effectiveAmount} onPay={handlePayRail} isProcessing={isProcessing} />
              )}
              {activeRail === 'GCASH' && (
                <GCashPaymentRail amount={effectiveAmount} onPay={handlePayRail} isProcessing={isProcessing} />
              )}
              {activeRail === 'MAYA' && (
                <MayaPaymentRail amount={effectiveAmount} onPay={handlePayRail} isProcessing={isProcessing} />
              )}
              {activeRail === 'CREDIT_DEBIT_CARD' && (
                <CardPaymentRail amount={effectiveAmount} onPay={handlePayRail} isProcessing={isProcessing} />
              )}
              {activeRail === 'BANK_TRANSFER' && (
                <BankTransferRail amount={effectiveAmount} onPay={handlePayRail} isProcessing={isProcessing} />
              )}
              {activeRail === 'PROMISSORY_NOTE' && (
                <PromissoryPaymentRail
                  amount={effectiveAmount}
                  patientName={patientName}
                  onPay={handlePayRail}
                  isProcessing={isProcessing}
                />
              )}
            </div>

            {/* Error Message Toast */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
                <span>{errorMessage}</span>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-rose-500 hover:text-rose-700 font-bold ml-2"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Demo Testing Toggles for Reviewers / Judges */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Presenter Control:</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={simulateFailure}
                  onChange={(e) => setSimulateFailure(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span className="text-slate-700 text-xs">
                  ⚡ Simulate Network Failure (Decline)
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Processing Latency Overlay */}
      <PaymentProcessingOverlay rail={activeRail} isOpen={isProcessing} />
    </>
  );
};
