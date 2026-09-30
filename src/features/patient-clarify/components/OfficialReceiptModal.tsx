import React from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import { DemoPaymentRecord } from '../types/billing';
import { formatPeso, formatPstDateTime } from '../utils/billFormatters';
import { CheckCircle2, X, Printer, QrCode, ShieldCheck, Download } from 'lucide-react';

interface Props {
  payment: DemoPaymentRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onViewGatePass?: () => void;
  remainingBalance?: number;
  patientName?: string;
  roomBed?: string;
  encounterNumber?: string;
}

export const OfficialReceiptModal: React.FC<Props> = ({
  payment,
  isOpen,
  onClose,
  onViewGatePass,
  remainingBalance = 0,
  patientName = 'Patient',
  roomBed = 'Room 312',
  encounterNumber = 'ENC-8812'
}) => {
  const { printDocument } = useMedCore();

  if (!isOpen || !payment) return null;

  return (
    <div className="fixed inset-0 z-60 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Success Banner */}
        <div className="bg-emerald-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Payment Confirmed
              </h3>
              <p className="text-xs text-emerald-100">
                Official Electronic Hospital Receipt
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BIR Official Receipt Layout */}
        <div className="p-6 space-y-4 text-xs font-sans">
          {/* Facility Header */}
          <div className="text-center border-b border-slate-200 pb-4">
            <h4 className="font-bold text-sm text-slate-900 uppercase tracking-tight">
              St. Jude Medical Center Manila
            </h4>
            <p className="text-[11px] text-slate-500">
              Don Manuel Agregado St., Sampaloc, Manila 1008
            </p>
            <p className="text-[10px] font-mono text-slate-400 mt-0.5">
              VAT REG TIN: 004-819-201-000 · BIR ACCREDITED
            </p>
          </div>

          {/* Receipt Identifiers */}
          <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-sans">OR Number</span>
              <span className="font-bold text-slate-900 break-all">{payment.officialReceiptNumber}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-sans">Payment ID</span>
              <span className="font-bold text-blue-700 break-all">{payment.paymentId || payment.id}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-sans">Date & Time</span>
              <span className="font-medium text-slate-700">{formatPstDateTime(payment.timestamp)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-sans">Receipt Ref</span>
              <span className="font-bold text-slate-800 break-all">{payment.receiptId || payment.receipt?.id || `REC-${payment.officialReceiptNumber}`}</span>
            </div>
            <div className="col-span-2 pt-1 border-t border-slate-200 flex items-center justify-between text-[10px]">
              <div>
                <span className="text-slate-400 uppercase font-sans">Channel Ref: </span>
                <span className="font-bold text-slate-700 break-all">{payment.channelReference}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-sans">Auth: </span>
                <span className="font-bold text-slate-800">{payment.gatewayAuthCode}</span>
              </div>
            </div>
          </div>

          {/* Patient Details */}
          <div className="space-y-1.5 py-1 text-slate-600">
            <div className="flex justify-between">
              <span>Patient Name:</span>
              <strong className="text-slate-900">{patientName}</strong>
            </div>
            <div className="flex justify-between">
              <span>Encounter / Room:</span>
              <span className="font-mono text-slate-800">{encounterNumber} · {roomBed}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment Channel:</span>
              <span className="font-bold text-slate-800 uppercase">{payment.paymentRail.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span>Payer Account / Name:</span>
              <span className="text-slate-800">{payment.payerName} ({payment.payerContactMasked})</span>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="border-t border-b border-slate-200 py-3 space-y-2">
            <div className="flex justify-between text-slate-600">
              <span>Amount Tendered:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {formatPeso(payment.amount)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Remaining Out-of-Pocket Balance:</span>
              <span className={`font-mono font-bold text-sm ${remainingBalance === 0 ? 'text-emerald-700' : 'text-slate-900'}`}>
                {formatPeso(remainingBalance)}
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              <span>VAT Status:</span>
              <span>VAT Exempt Pursuant to RA 9994 / RA 10754</span>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 text-center font-mono">
            THIS DOCUMENT SERVES AS AN OFFICIAL ELECTRONIC RECEIPT.
          </div>

          {/* Action CTAs */}
          <div className="space-y-2 pt-1">
            {remainingBalance === 0 && onViewGatePass && (
              <button
                type="button"
                onClick={onViewGatePass}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <QrCode className="w-4 h-4" />
                <span>View Digital Discharge Gate Pass →</span>
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                printDocument({
                  type: 'OFFICIAL_RECEIPT',
                  title: `Official Receipt - ${payment.officialReceiptNumber || payment.id}`,
                  data: {
                    payment,
                    remainingBalance,
                    patientName,
                    roomBed,
                    encounterNumber
                  }
                })
              }
              className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
              title="Print BIR-compliant Official Receipt"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print Official Receipt</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
            >
              Close Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
