import React, { useState } from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import { formatPeso } from '@/utils/formatters';
import {
  HelpCircle,
  QrCode,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Share2
} from 'lucide-react';

export const PatientClarifyView: React.FC = () => {
  const {
    encounters,
    selectedEncounter,
    selectEncounter,
    settlePatientBalance,
    openPromissoryModal
  } = useMedCore();

  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const enc = selectedEncounter;
  const waterfall = enc.waterfall;
  const pName = enc.patient.fullName || enc.patient.maskedName;
  const rBed = enc.bedNumber || enc.roomBed;
  const hName = enc.hmo.hmoName || enc.hmo.providerName;
  const items = enc.items;

  const toggleExpand = (id: string) => {
    setExpandedItemId((prev) => (prev === id ? null : id));
  };

  const handleMobilePay = () => {
    settlePatientBalance(enc.id, 'QR_PH');
    setPaymentSuccess(true);
    setTimeout(() => setPaymentSuccess(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center bg-slate-100">
      {/* Patient Switcher Header */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-slate-700 block">
            Patient Clarify Portal Preview
          </span>
          <span className="text-xs text-slate-500">
            Previewing mobile web view for:
          </span>
        </div>
        <select
          value={enc.id}
          onChange={(e) => selectEncounter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 shadow-xs"
        >
          {encounters.map((e) => (
            <option key={e.id} value={e.id}>
              {e.roomBed} · {e.patient.fullName || e.patient.maskedName} ({formatPeso(e.waterfall.netPatientDue)})
            </option>
          ))}
        </select>
      </div>

      {/* 375px Mobile Device Shell */}
      <div className="w-full max-w-[390px] bg-white rounded-[36px] shadow-2xl border-4 border-slate-800 overflow-hidden flex flex-col min-h-[740px]">
        {/* Mobile Top Bar (Speaker & Camera Notch) */}
        <div className="h-6 bg-slate-900 text-white flex items-center justify-between px-6 text-[10px] font-mono">
          <span>9:41</span>
          <div className="w-16 h-3 bg-black rounded-b-lg mx-auto" />
          <div className="flex items-center gap-1">
            <span>5G</span>
            <span>100%</span>
          </div>
        </div>

        {/* Hospital Brand Nav */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              SJ
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 leading-tight">
                St. Jude Medical Center
              </div>
              <div className="text-[11px] text-slate-500 font-medium">Patient Billing & Discharge</div>
            </div>
          </div>
          <button className="text-slate-400 hover:text-slate-600">
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Bill Content */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs font-sans">
          {/* Welcome Patient */}
          <div>
            <span className="text-xs text-slate-500 font-medium block">Statement of Account for</span>
            <h2 className="text-base font-bold text-slate-900">
              {pName}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-600 mt-0.5">
              <span className="font-mono font-medium">{rBed}</span>
              <span>·</span>
              <span>Admitted: {enc.admissionDate.split('T')[0]}</span>
            </div>
          </div>

          {/* Big Net Due Card */}
          <div className="p-4 rounded-xl bg-blue-900 text-white shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-blue-200 font-semibold uppercase tracking-wider">Your Final Amount Due</span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-800 text-blue-100">
                {waterfall.netPatientDue > 0 ? '● Pending Settlement' : '✓ Paid & Cleared'}
              </span>
            </div>
            <div className="text-3xl font-bold font-mono tracking-tight tabular-nums">
              {formatPeso(waterfall.netPatientDue)}
            </div>
            <div className="text-xs text-blue-100 leading-relaxed font-normal">
              {waterfall.netPatientDue > 0
                ? 'All PhilHealth and insurance deductions have been verified.'
                : 'Your bill is fully settled. You are cleared for discharge.'}
            </div>
          </div>

          {/* Simple Visual Deduction Waterfall */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs shadow-xs">
            <div className="font-bold text-slate-800 text-xs">
              How Your Total Was Calculated
            </div>

            <div className="flex justify-between text-slate-600">
              <span>Total Hospital Charges:</span>
              <span className="font-medium font-mono text-slate-900">
                {formatPeso(waterfall.grossTotal)}
              </span>
            </div>

            {waterfall.vatExemption > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>12% VAT Exemption (SC/PWD):</span>
                <span className="font-mono font-semibold">-{formatPeso(waterfall.vatExemption)}</span>
              </div>
            )}

            {waterfall.seniorPwdDiscount > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>20% Senior / PWD Discount:</span>
                <span className="font-mono font-semibold">-{formatPeso(waterfall.seniorPwdDiscount)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-700">
              <span>PhilHealth Case Rate:</span>
              <span className="font-mono font-medium">-{formatPeso(waterfall.philhealthTotal)}</span>
            </div>

            <div className="flex justify-between text-slate-700">
              <span>{hName} Insurance:</span>
              <span className="font-mono font-medium">-{formatPeso(waterfall.hmoApprovedAmount)}</span>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
              <span>Amount You Pay:</span>
              <span className="font-mono tabular-nums text-base">
                {formatPeso(waterfall.netPatientDue)}
              </span>
            </div>
          </div>

          {/* "Why Do I Owe This?" Line-Item Explanations */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900">
                Itemized Charges & Explanations
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Tap for explanation
              </span>
            </div>

            <div className="space-y-2">
              {items.map((item) => {
                const isExpanded = expandedItemId === item.id;
                return (
                  <div
                    key={item.id}
                    className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs"
                  >
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="w-full p-3 text-left flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-slate-900 truncate">
                          {item.description}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Gross: {formatPeso(item.grossAmount)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold font-mono text-xs text-slate-900">
                          {item.patientOop > 0 ? formatPeso(item.patientOop) : '₱0.00'}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-3 bg-slate-50 border-t border-slate-100 text-xs space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                          <span>Why do I owe this?</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed text-[11px]">
                          {item.plainLanguageExplainer}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile Sticky Pay Bar */}
        <div className="p-3 border-t border-slate-200 bg-white space-y-2">
          {paymentSuccess ? (
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-center font-bold text-xs flex items-center justify-center gap-2 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Payment Received! Digital Gate Pass Unlocked.</span>
            </div>
          ) : waterfall.netPatientDue > 0 ? (
            <>
              <button
                onClick={handleMobilePay}
                className="w-full py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <QrCode className="w-4 h-4" />
                <span>Pay {formatPeso(waterfall.netPatientDue)} via QR Ph</span>
              </button>
              <button
                onClick={() => openPromissoryModal(enc.id)}
                className="w-full py-1.5 text-center text-purple-700 hover:text-purple-800 font-semibold text-xs"
              >
                Pay in installments via RA 9439 Promissory Note
              </button>
            </>
          ) : (
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-center font-bold text-xs flex items-center justify-center gap-2 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Gate Pass Authorized • Present at Lobby Exit</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
