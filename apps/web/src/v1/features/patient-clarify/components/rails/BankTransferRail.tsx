import { Check, Copy, Zap } from '@/v1/components/common/SolarIcons';
import React, { useState } from 'react';
import { formatPeso } from '../../utils/billFormatters';

interface Props {
  amount: number;
  onPay: (params: { payerName: string; payerContact: string; bankName?: string }) => void;
  isProcessing?: boolean;
}

export const BankTransferRail: React.FC<Props> = ({ amount, onPay, isProcessing }) => {
  const [selectedBank, setSelectedBank] = useState<'BPI' | 'BDO' | 'UBP' | 'MBT'>('BPI');
  const [copied, setCopied] = useState(false);

  const bankDetails = {
    BPI: {
      name: 'Bank of the Philippine Islands (BPI)',
      account: '0012-8819-24',
      holder: 'St. Jude Medical Center Manila',
    },
    BDO: { name: 'BDO Unibank', account: '0041-0029-9481', holder: 'St. Jude Medical Center Manila Inc.' },
    UBP: {
      name: 'UnionBank of the Philippines',
      account: '1094-8821-0042',
      holder: 'St. Jude Medical Center',
    },
    MBT: { name: 'Metrobank', account: '0482-9910-4491', holder: 'St. Jude Medical Center Manila' },
  };

  const current = bankDetails[selectedBank];

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(current.account);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateTransfer = () => {
    if (isProcessing) return;
    onPay({
      payerName: `Online Banking (${selectedBank})`,
      payerContact: current.account,
      bankName: current.name,
    });
  };

  return (
    <div className="p-4 space-y-4 font-sans text-xs">
      <div>
        <label className="font-bold text-slate-800 block mb-1.5">Select Beneficiary Hospital Bank</label>
        <div className="grid grid-cols-2 gap-2">
          {(['BPI', 'BDO', 'UBP', 'MBT'] as const).map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setSelectedBank(b)}
              className={`p-2.5 rounded-xl border text-left font-semibold text-xs transition-colors flex items-center justify-between ${
                selectedBank === b
                  ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-2xs'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <span>{b}</span>
              {selectedBank === b && <span className="w-2 h-2 rounded-full bg-blue-600" />}
            </button>
          ))}
        </div>
      </div>

      {/* Account Info Box */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-400">Account Name</div>
          <div className="font-bold text-slate-900 text-xs">{current.holder}</div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Account Number</div>
            <div className="font-mono font-bold text-slate-900 text-sm">{current.account}</div>
          </div>
          <button
            type="button"
            onClick={handleCopyAccount}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">Amount to Transfer:</span>
          <span className="font-mono font-bold text-slate-900 text-sm">{formatPeso(amount)}</span>
        </div>
      </div>

      <div className="text-[11px] text-slate-500 leading-relaxed bg-blue-50/50 p-3 rounded-xl border border-blue-100">
        💡 <strong>Instant Settlement:</strong> Transfers via InstaPay are credited in real-time. For this
        live demonstration, click the simulation button below to trigger automated reference reconciliation.
      </div>

      <button
        type="button"
        disabled={isProcessing}
        onClick={handleSimulateTransfer}
        className={`w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2 ${
          isProcessing ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <Zap className="w-4 h-4 text-amber-300" />
        <span>{isProcessing ? 'Processing Transfer...' : '⚡ Simulate Instant InstaPay Transfer'}</span>
      </button>
    </div>
  );
};
