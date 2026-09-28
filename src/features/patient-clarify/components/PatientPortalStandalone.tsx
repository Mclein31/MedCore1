import React, { useState, useEffect } from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import { PatientBillStatement, DemoPaymentRecord, DemoPaymentRail } from '../types/billing';
import { PatientBillingInbox } from './PatientBillingInbox';
import { PatientStatementView } from './PatientStatementView';
import { PatientGatePassView } from './PatientGatePassView';
import { PaymentHistoryLedger } from './PaymentHistoryLedger';
import { DemoPaymentModal } from './DemoPaymentModal';
import { OfficialReceiptModal } from './OfficialReceiptModal';
import { formatPeso, maskName } from '../utils/billFormatters';
import { createOrGetReceipt } from '../utils/paymentSimulator';
import {
  Building2,
  Eye,
  EyeOff,
  Receipt,
  QrCode,
  FileText,
  ArrowLeft,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

export const PatientPortalStandalone: React.FC = () => {
  const {
    encounters,
    selectedEncounter,
    selectEncounter,
    setActiveRole,
    setActiveRoute,
    fileBillingDispute,
    processDemoPayment,
    recordPatientViewed,
    openPromissoryModal
  } = useMedCore();

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'STATEMENT' | 'GATE_PASS' | 'RECEIPTS'>('OVERVIEW');
  const [isMasked, setIsMasked] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<DemoPaymentRecord | null>(null);

  const enc = selectedEncounter;

  // Build the patient bill statement for the active encounter
  const buildBill = (): PatientBillStatement => {
    const w = enc.waterfall;
    const netDue = w.netPatientDue;
    const amountPaid = enc.amountPaid !== undefined ? enc.amountPaid : (enc.stage === 'CLEARED_GATE_PASS' ? (w.patientPaid || netDue) : 0);
    const remainingBalance = enc.remainingBalance !== undefined ? enc.remainingBalance : (enc.stage === 'CLEARED_GATE_PASS' ? 0 : netDue);
    const existingReceipts = enc.receipts || [];
    const paymentReceipts = (enc.paymentHistory as DemoPaymentRecord[])?.map((p) => p.receipt || createOrGetReceipt(p, existingReceipts)) || [];
    const mergedReceipts = existingReceipts.length > 0 ? existingReceipts : paymentReceipts;

    return {
      id: `BILL-2026-${enc.id.replace(/\D/g, '') || '8812'}`,
      encounterId: enc.id,
      billNumber: enc.billNumber || `SOA-SJMC-26-${enc.encounterNumber.replace(/\D/g, '') || '8812'}`,
      version: 1,
      state: enc.billState || (enc.stage === 'CLEARED_GATE_PASS' ? 'PAID' : 'SENT_TO_PATIENT'),
      finalizedAt: enc.billFinalizedAt || enc.mghOrderTimestamp,
      sentAt: enc.billSentAt,
      firstViewedAt: enc.billFirstViewedAt,
      settledAt: enc.dischargePass?.issuedAt,
      facilityName: 'St. Jude Medical Center Manila',
      facilityAddress: 'Don Manuel Agregado St., Sampaloc, Manila 1008',
      facilityTin: '004-819-201-000',
      facilityPhone: '(02) 8888-SJMC / (02) 8731-5000',
      attendingSpecialist: enc.attendingDoctor,
      patient: {
        id: enc.patient.id,
        fullName: enc.patient.fullName || enc.patient.maskedName,
        mrn: enc.patient.mrn,
        roomBed: enc.roomBed,
        admissionDate: enc.admissionDate,
        dischargeDate: enc.mghOrderTimestamp,
        primaryDiagnosis: enc.primaryDiagnosis,
        icd10: enc.primaryIcd10,
        isSeniorCitizen: enc.patient.isSeniorCitizen,
        isPwd: enc.patient.isPwd,
        seniorOrPwdId: enc.patient.seniorCitizenId || enc.patient.pwdId,
        philhealthPinMasked: enc.patient.philhealthPin,
        hmoCardMasked: enc.hmo.cardMasked,
        hmoProviderName: enc.hmo.hmoName || enc.hmo.providerName,
        isNbb: enc.philhealth.isNbb || false
      },
      financials: {
        grossHospitalCharges: w.grossHospitalCharges,
        grossDoctorFees: w.grossDoctorFee,
        grossTotal: w.grossTotal,
        vatExemption: w.vatExemption,
        seniorPwdDiscount: w.seniorPwdDiscount,
        philhealthTotal: w.philhealthTotal,
        hmoApprovedAmount: w.hmoApprovedAmount,
        netPatientDue: netDue,
        amountPaid: amountPaid,
        remainingBalance: remainingBalance
      },
      outOfPocketDrivers: {
        roomUpgradeExcess: w.roomUpgradeExcess,
        excludedConsumables: w.excludedConsumables,
        doctorExcessPf: w.doctorExcessPf,
        coverageShortfall: Math.max(0, netDue - (w.roomUpgradeExcess + w.excludedConsumables + w.doctorExcessPf))
      },
      items: enc.items,
      disputes: enc.disputes || [],
      paymentHistory: (enc.paymentHistory as DemoPaymentRecord[]) || [],
      receipts: mergedReceipts,
      dischargePass: enc.dischargePass,
      promissoryNote: enc.promissoryNote
    };
  };

  const bill = buildBill();

  // Record patient view event on load
  useEffect(() => {
    if (recordPatientViewed) {
      recordPatientViewed(enc.id);
    }
  }, [enc.id]);

  const handleReturnToHospital = () => {
    setActiveRole('BILLING_SPECIALIST');
    setActiveRoute('COMMAND_CENTER');
  };

  const handlePaymentSuccess = (payment: DemoPaymentRecord) => {
    setActiveReceipt(payment);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans select-none antialiased">
      {/* Top Patient Portal Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        {/* Brand & Identity */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-xs sm:text-sm shadow-xs shrink-0">
            SJ
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-extrabold text-sm sm:text-base text-slate-900 leading-none truncate">
                St. Jude Patient Clarify
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 sm:px-2 py-0.5 rounded-full shrink-0">
                Demo Portal
              </span>
            </div>
            <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-none truncate">
              Hospital Statement & Settlement Desk
            </div>
          </div>
        </div>

        {/* Center / Right Tools */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Patient Selector for Demonstrators (Desktop/Tablet) */}
          <div className="hidden md:flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-medium">Select Bill Demo:</span>
            <select
              value={enc.id}
              onChange={(e) => selectEncounter(e.target.value)}
              aria-label="Select Bill Demo"
              className="py-1.5 px-3 rounded-xl border border-slate-300 bg-slate-50 font-semibold text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs max-w-[200px] truncate"
            >
              {encounters.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.roomBed} · {e.patient.fullName || e.patient.maskedName} ({formatPeso(e.waterfall.netPatientDue)})
                </option>
              ))}
            </select>
          </div>

          {/* Privacy Mask Toggle (RA 10173) */}
          <button
            type="button"
            onClick={() => setIsMasked(!isMasked)}
            className="p-1.5 sm:p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs"
            title={isMasked ? 'Reveal full name' : 'Mask name for privacy'}
          >
            {isMasked ? <EyeOff className="w-4 h-4 text-blue-600" /> : <Eye className="w-4 h-4" />}
          </button>

          {/* Return to Hospital Dashboard Button */}
          <button
            type="button"
            onClick={handleReturnToHospital}
            className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Return to Hospital Console</span>
            <span className="sm:hidden text-[11px]">Staff Desk</span>
          </button>
        </div>
      </header>

      {/* Mobile Demonstrator Bill Selector Bar */}
      <div className="md:hidden bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center justify-between gap-2 shrink-0">
        <span className="text-[11px] font-semibold text-slate-500 shrink-0">Demo Bill:</span>
        <select
          value={enc.id}
          onChange={(e) => selectEncounter(e.target.value)}
          aria-label="Select Bill Demo Mobile"
          className="flex-1 py-1 px-2.5 rounded-lg border border-slate-300 bg-white font-semibold text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 truncate"
        >
          {encounters.map((e) => (
            <option key={e.id} value={e.id}>
              {e.roomBed} · {e.patient.fullName || e.patient.maskedName} ({formatPeso(e.waterfall.netPatientDue)})
            </option>
          ))}
        </select>
      </div>

      {/* Navigation Sub-Bar */}
      <div className="bg-white border-b border-slate-200 px-3 sm:px-8">
        <div className="max-w-3xl mx-auto flex items-center gap-1 sm:gap-2 overflow-x-auto py-2 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('OVERVIEW')}
            className={`shrink-0 min-h-[38px] px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'OVERVIEW'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Overview & Balance</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('STATEMENT')}
            className={`shrink-0 min-h-[38px] px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'STATEMENT'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Deduction Waterfall</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('RECEIPTS')}
            className={`shrink-0 min-h-[38px] px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'RECEIPTS'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Payment Receipts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('GATE_PASS')}
            className={`shrink-0 min-h-[38px] px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'GATE_PASS'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Discharge Gate Pass</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
        {activeTab === 'OVERVIEW' && (
          <PatientBillingInbox
            bill={bill}
            isMasked={isMasked}
            onOpenStatement={() => setActiveTab('STATEMENT')}
            onOpenPaymentModal={() => setIsPaymentModalOpen(true)}
            onOpenGatePass={() => setActiveTab('GATE_PASS')}
            onOpenReceipts={() => setActiveTab('RECEIPTS')}
          />
        )}

        {activeTab === 'STATEMENT' && (
          <PatientStatementView
            bill={bill}
            isMasked={isMasked}
            onBack={() => setActiveTab('OVERVIEW')}
            onOpenPaymentModal={() => setIsPaymentModalOpen(true)}
            onOpenPromissoryModal={() => openPromissoryModal(enc.id, bill.financials.remainingBalance)}
            onSubmitDispute={(itemId, reason) => fileBillingDispute(enc.id, itemId, reason)}
          />
        )}

        {activeTab === 'RECEIPTS' && (
          <div className="space-y-4 max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab('OVERVIEW')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Overview</span>
              </button>
            </div>
            <PaymentHistoryLedger
              history={bill.paymentHistory}
              onSelectReceipt={(tx) => setActiveReceipt(tx)}
            />
          </div>
        )}

        {activeTab === 'GATE_PASS' && (
          <div className="space-y-4 max-w-md mx-auto">
            <PatientGatePassView
              gatePass={enc.dischargePass}
              patientName={isMasked ? maskName(bill.patient.fullName) : bill.patient.fullName}
              roomBed={bill.patient.roomBed}
              attendingDoctor={bill.attendingSpecialist}
              onBack={() => setActiveTab('OVERVIEW')}
            />
          </div>
        )}
      </main>

      {/* Demo Multi-Rail Payment Modal */}
      <DemoPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        encounterId={enc.id}
        patientName={bill.patient.fullName}
        totalDue={bill.financials.netPatientDue}
        remainingBalance={bill.financials.remainingBalance}
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
          setActiveTab('GATE_PASS');
        }}
        remainingBalance={bill.financials.remainingBalance}
        patientName={bill.patient.fullName}
        roomBed={bill.patient.roomBed}
        encounterNumber={enc.encounterNumber}
      />
    </div>
  );
};
