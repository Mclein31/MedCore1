import { ViewportOverlay } from '@/components/common/ViewportOverlay';
import React from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import { DemoPaymentRecord } from '../types/billing';
import { formatPeso, formatPstDateTime } from '../utils/billFormatters';
import { CheckCircle2, X, Printer, QrCode, ShieldCheck, Download } from '@/components/common/SolarIcons';
import { Button, IconButton } from '@/components/common';

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
    <ViewportOverlay className="overflow-y-auto flex items-center justify-center p-4" backdropClassName="bg-slate-900/60 backdrop-blur-xs" motion="rise" layer="nested">
      <div className="bg-white rounded-xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
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
          <IconButton
            size="sm"
            variant="ghost"
            icon={X}
            onClick={onClose}
            ariaLabel="Close modal"
            className="text-emerald-200 hover:text-white hover:bg-emerald-700/50"
          />
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
              <Button
                type="button"
                fullWidth
                size="md"
                variant="primary"
                icon={QrCode}
                onClick={onViewGatePass}
              >
                View Digital Discharge Gate Pass →
              </Button>
            )}

            <Button
              type="button"
              fullWidth
              size="md"
              variant="secondary"
              icon={Printer}
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
              title="Print BIR-compliant Official Receipt"
            >
              Print Official Receipt
            </Button>

            <Button
              type="button"
              fullWidth
              size="md"
              variant="subtle"
              onClick={onClose}
            >
              Close Receipt
            </Button>
          </div>
        </div>
      </div>
    </ViewportOverlay>
  );
};
