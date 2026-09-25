import React, { useState } from 'react';
import { useMedCore } from '../context/MedCoreContext';
import { formatPeso } from '../utils/formatters';
import {
  Smartphone,
  Shield,
  HelpCircle,
  QrCode,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Lock,
  Building2,
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
    <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center bg-slate-100 dark:bg-[#070D18]">
      {/* Patient Switcher Header */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between">
        <div>
          <span className="text-xs font-mono font-semibold text-slate-500 uppercase tracking-wider block">
            Patient Clarify™ Simulator
          </span>
          <span className="text-xs text-slate-400">
            Previewing Mobile PWA for:
          </span>
        </div>
        <select
          value={enc.id}
          onChange={(e) => selectEncounter(e.target.value)}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200"
        >
          {encounters.map((e) => (
            <option key={e.id} value={e.id}>
              {e.patient.fullName || e.patient.maskedName} ({formatPeso(e.waterfall.netPatientDue)})
            </option>
          ))}
        </select>
      </div>

      {/* 375px Mobile Device Shell */}
      <div className="w-full max-w-[390px] bg-white dark:bg-slate-900 rounded-[36px] shadow-2xl border-4 border-slate-800 dark:border-slate-700 overflow-hidden flex flex-col min-h-[740px]">
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
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-brand-navy dark:bg-brand-blue flex items-center justify-center text-white font-bold text-xs">
              MC
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-slate-100 leading-tight">
                St. Jude Medical
              </div>
              <div className="text-[10px] text-slate-400">Patient Clarify™ SOA</div>
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
            <span className="text-[11px] text-slate-400 block">Statement of Account for:</span>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {pName}
            </h2>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
              <span>{rBed}</span>
              <span>•</span>
              <span>Admitted: {enc.admissionDate.split('T')[0]}</span>
            </div>
          </div>

          {/* Big Net Due Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-navy to-slate-900 text-white shadow-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-sky-200 font-medium">Your Final Amount Due</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white">
                {waterfall.netPatientDue > 0 ? 'Pending Settlement' : 'Paid & Cleared'}
              </span>
            </div>
            <div className="text-3xl font-extrabold font-mono tracking-tight tabular-nums">
              {formatPeso(waterfall.netPatientDue)}
            </div>
            <div className="text-[11px] text-slate-300 leading-tight">
              {waterfall.netPatientDue > 0
                ? 'All PhilHealth and insurance deductions have been verified.'
                : 'Your bill is fully settled. You are cleared for discharge.'}
            </div>
          </div>

          {/* Simple Visual Deduction Waterfall */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs font-mono">
            <div className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] font-sans">
              How Your Total Was Calculated:
            </div>

            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Total Hospital Charges:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatPeso(waterfall.grossTotal)}
              </span>
            </div>

            {waterfall.vatExemption > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>12% VAT Exemption (SC/PWD):</span>
                <span>-{formatPeso(waterfall.vatExemption)}</span>
              </div>
            )}

            {waterfall.seniorPwdDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>20% Senior / PWD Discount:</span>
                <span>-{formatPeso(waterfall.seniorPwdDiscount)}</span>
              </div>
            )}

            <div className="flex justify-between text-sky-600 dark:text-sky-400">
              <span>PhilHealth Case Rate:</span>
              <span>-{formatPeso(waterfall.philhealthTotal)}</span>
            </div>

            <div className="flex justify-between text-sky-600 dark:text-sky-400">
              <span>{hName} Insurance:</span>
              <span>-{formatPeso(waterfall.hmoApprovedAmount)}</span>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-sm text-slate-900 dark:text-slate-100">
              <span>Amount You Pay:</span>
              <span className="text-amber-600 dark:text-amber-400">
                {formatPeso(waterfall.netPatientDue)}
              </span>
            </div>
          </div>

          {/* "Why Do I Owe This?" Line-Item Explanations */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                Itemized Charges & Explanations
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Tap for plain explanation
              </span>
            </div>

            <div className="space-y-1.5">
              {items.map((item) => {
                const isExpanded = expandedItemId === item.id;
                return (
                  <div
                    key={item.id}
                    className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900"
                  >
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="w-full p-2.5 text-left flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-xs text-slate-800 dark:text-slate-200 truncate">
                          {item.description}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Gross: {formatPeso(item.grossAmount)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-bold font-mono text-xs text-slate-900 dark:text-slate-100">
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
                      <div className="p-3 bg-sky-50/60 dark:bg-sky-950/40 border-t border-slate-100 dark:border-slate-800 text-[11px] space-y-1.5">
                        <div className="flex items-center gap-1 font-semibold text-brand-blue dark:text-sky-400">
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Why do I owe this?</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
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
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          {paymentSuccess ? (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-center font-bold text-xs flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Payment Received! Digital Gate Pass Unlocked.</span>
            </div>
          ) : waterfall.netPatientDue > 0 ? (
            <>
              <button
                onClick={handleMobilePay}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
              >
                <QrCode className="w-4 h-4" />
                <span>Pay {formatPeso(waterfall.netPatientDue)} via QR Ph</span>
              </button>
              <button
                onClick={openPromissoryModal}
                className="w-full py-1.5 text-center text-slate-500 hover:text-slate-700 dark:text-slate-400 text-[11px] font-medium"
              >
                Need to pay in installments? Apply for RA 9439 Promissory Note
              </button>
            </>
          ) : (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-center font-bold text-xs flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Gate Pass Authorized • Present at Lobby Exit</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
