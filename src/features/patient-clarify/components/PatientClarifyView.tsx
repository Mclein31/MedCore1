import React, { useState } from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import { formatPeso, maskName } from '../utils/billFormatters';
import { StatutoryWaterfallSummary } from './StatutoryWaterfallSummary';
import { ItemizedChargeRow } from './ItemizedChargeRow';
import { DisputeItemModal } from './DisputeItemModal';
import { DemoPaymentModal } from './DemoPaymentModal';
import { OfficialReceiptModal } from './OfficialReceiptModal';
import { PatientGatePassView } from './PatientGatePassView';
import { DemoPaymentRecord } from '../types/billing';
import { ChargemasterItem } from '@/types/domain';
import {
  HelpCircle,
  QrCode,
  CheckCircle2,
  Share2,
  CreditCard,
  Scale,
  ShieldCheck,
  AlertTriangle,
  Receipt
} from 'lucide-react';

export const PatientClarifyView: React.FC = () => {
  const {
    encounters,
    selectedEncounter,
    selectEncounter,
    fileBillingDispute,
    processDemoPayment,
    openPromissoryModal
  } = useMedCore();

  const [selectedDisputeItem, setSelectedDisputeItem] = useState<ChargemasterItem | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<DemoPaymentRecord | null>(null);
  const [mobileTab, setMobileTab] = useState<'BILL' | 'GATE_PASS'>('BILL');

  const enc = selectedEncounter;
  const waterfall = enc.waterfall;
  const pName = enc.patient.fullName || enc.patient.maskedName;
  const rBed = enc.bedNumber || enc.roomBed;
  const hName = enc.hmo.hmoName || enc.hmo.providerName;
  const items = enc.items;

  const remainingBalance =
    enc.remainingBalance !== undefined
      ? enc.remainingBalance
      : enc.stage === 'CLEARED_GATE_PASS'
      ? 0
      : waterfall.netPatientDue;

  const isSettled = remainingBalance <= 0 || enc.stage === 'CLEARED_GATE_PASS';

  const handlePaymentSuccess = (payment: DemoPaymentRecord) => {
    setActiveReceipt(payment);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center bg-slate-100">
      {/* Patient Switcher Header */}
      <div className="w-full max-w-md mb-3 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-slate-800 block">
            Patient Clarify Portal Preview
          </span>
          <span className="text-[11px] text-slate-500">
            Previewing mobile web view for:
          </span>
        </div>
        <select
          value={enc.id}
          onChange={(e) => selectEncounter(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 shadow-2xs max-w-[200px] truncate"
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
        <div className="h-6 bg-slate-900 text-white flex items-center justify-between px-6 text-[10px] font-mono shrink-0">
          <span>9:41</span>
          <div className="w-16 h-3 bg-black rounded-b-lg mx-auto" />
          <div className="flex items-center gap-1">
            <span>5G</span>
            <span>100%</span>
          </div>
        </div>

        {/* Hospital Brand Nav */}
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              SJ
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 leading-tight">
                St. Jude Medical Center
              </div>
              <div className="text-[10px] text-slate-500 font-medium">Patient Billing & Discharge</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isSettled && (
              <button
                type="button"
                onClick={() => setMobileTab(mobileTab === 'BILL' ? 'GATE_PASS' : 'BILL')}
                className="px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300"
              >
                {mobileTab === 'BILL' ? 'Gate Pass →' : '← Bill'}
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Bill Content */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs font-sans">
          {mobileTab === 'GATE_PASS' && isSettled ? (
            <PatientGatePassView
              gatePass={enc.dischargePass}
              patientName={pName}
              roomBed={rBed}
              attendingDoctor={enc.attendingDoctor}
              onBack={() => setMobileTab('BILL')}
            />
          ) : (
            <>
              {/* Welcome Patient */}
              <div>
                <span className="text-[11px] text-slate-500 font-medium block">Statement of Account for</span>
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
              <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-md space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-blue-300 font-semibold uppercase tracking-wider">
                    {isSettled ? 'Net Liability' : 'Balance Due'}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isSettled ? 'bg-emerald-900 text-emerald-200' : 'bg-blue-800 text-blue-200'
                  }`}>
                    {isSettled ? '✓ Fully Cleared' : '● Pending Settlement'}
                  </span>
                </div>
                <div className="text-3xl font-black font-mono tracking-tight tabular-nums text-white">
                  {formatPeso(remainingBalance)}
                </div>
                <div className="text-[11px] text-slate-300 leading-relaxed font-normal">
                  {isSettled
                    ? 'Your bill is fully settled. You are cleared for hospital exit.'
                    : 'PhilHealth and accredited insurance deductions have been verified.'}
                </div>
              </div>

              {/* Statutory Waterfall Component */}
              <StatutoryWaterfallSummary
                waterfall={waterfall}
                hmoName={hName}
                isSeniorCitizen={enc.patient.isSeniorCitizen}
                isPwd={enc.patient.isPwd}
                isNbb={enc.philhealth.isNbb}
              />

              {/* Itemized Chargemaster Accordions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">
                    Itemized Charges & Explanations
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Tap to explain
                  </span>
                </div>

                <div className="space-y-2">
                  {items.map((item) => (
                    <ItemizedChargeRow
                      key={item.id}
                      item={item}
                      onDisputeClick={(it) => setSelectedDisputeItem(it)}
                      isReadOnly={isSettled}
                    />
                  ))}
                </div>
              </div>

              {/* Action Buttons in Mobile View */}
              {!isSettled ? (
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Pay {formatPeso(remainingBalance)} (Demo)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openPromissoryModal(enc.id, remainingBalance)}
                    className="w-full py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Scale className="w-3.5 h-3.5 text-amber-600" />
                    <span>Apply for RA 9439 0% Promissory Note</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setMobileTab('GATE_PASS')}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <QrCode className="w-4 h-4" />
                  <span>View Digital Gate Pass →</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Dispute Modal */}
      <DisputeItemModal
        item={selectedDisputeItem}
        isOpen={Boolean(selectedDisputeItem)}
        onClose={() => setSelectedDisputeItem(null)}
        onSubmitDispute={(itemId, reason) => fileBillingDispute(enc.id, itemId, reason)}
      />

      {/* Demo Multi-Rail Payment Modal */}
      <DemoPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        encounterId={enc.id}
        patientName={pName}
        totalDue={waterfall.netPatientDue}
        remainingBalance={remainingBalance}
        onProcessPayment={processDemoPayment}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Official Receipt Modal */}
      <OfficialReceiptModal
        payment={activeReceipt}
        isOpen={Boolean(activeReceipt)}
        onClose={() => setActiveReceipt(null)}
        onViewGatePass={() => {
          setActiveReceipt(null);
          setMobileTab('GATE_PASS');
        }}
        remainingBalance={remainingBalance}
        patientName={pName}
        roomBed={rBed}
        encounterNumber={enc.encounterNumber}
      />
    </div>
  );
};
