import { Receipt } from '@/v1/components/common/SolarIcons';
import React, { useMemo } from 'react';
import type { DemoPaymentRecord } from '../types/billing';
import { formatPeso, formatPstDateTime } from '../utils/billFormatters';

interface Props {
  history: DemoPaymentRecord[];
  onSelectReceipt: (payment: DemoPaymentRecord) => void;
}

export const PaymentHistoryLedger: React.FC<Props> = ({ history, onSelectReceipt }) => {
  // Defensive deduplication by paymentId / id to ensure 1 payment = 1 row = 1 receipt
  const uniqueHistory = useMemo(() => {
    const seen = new Set<string>();
    return history.filter((tx) => {
      const key = tx.paymentId || tx.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [history]);

  if (uniqueHistory.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
        <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <h4 className="font-bold text-xs text-slate-700">No payment receipts yet</h4>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Simulated settlements and installment agreements will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
      <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
          Payment Transactions & Official Receipts
        </h3>
        <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full shrink-0">
          {uniqueHistory.length} {uniqueHistory.length === 1 ? 'Record' : 'Records'}
        </span>
      </div>

      <div className="divide-y divide-slate-100">
        {uniqueHistory.map((tx) => (
          <div
            key={tx.paymentId || tx.id}
            className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors text-xs"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-900 text-sm sm:text-base">{formatPeso(tx.amount)}</span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase shrink-0">
                  {tx.paymentRail.replace(/_/g, ' ')}
                </span>
                {tx.paymentId && (
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded shrink-0">
                    {tx.paymentId}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-1 break-all sm:break-normal flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span>
                  Ref: <strong className="text-slate-700">{tx.channelReference}</strong>
                </span>
                <span className="hidden sm:inline">·</span>
                <span>{formatPstDateTime(tx.timestamp)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
              <button
                type="button"
                onClick={() => onSelectReceipt(tx)}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs flex items-center gap-1.5 min-h-[36px]"
              >
                <Receipt className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">View Receipt ({tx.officialReceiptNumber})</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
