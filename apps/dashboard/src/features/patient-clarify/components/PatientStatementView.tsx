import React, { useState } from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import { PatientBillStatement } from '../types/billing';
import { ChargemasterItem } from '@/types/domain';
import { formatPeso, maskName } from '../utils/billFormatters';
import { StatutoryWaterfallSummary } from './StatutoryWaterfallSummary';
import { ItemizedChargeRow } from './ItemizedChargeRow';
import { DisputeItemModal } from './DisputeItemModal';
import {
  ArrowLeft,
  CreditCard,
  Scale,
  ShieldCheck,
  AlertTriangle,
  Building2,
  Calendar,
  HelpCircle,
  FileCheck,
  Printer
} from '@/components/common/SolarIcons';

interface Props {
  bill: PatientBillStatement;
  isMasked: boolean;
  onBack: () => void;
  onOpenPaymentModal: () => void;
  onOpenPromissoryModal: () => void;
  onSubmitDispute: (itemId: string, reason: string) => Promise<void>;
}

export const PatientStatementView: React.FC<Props> = ({
  bill,
  isMasked,
  onBack,
  onOpenPaymentModal,
  onOpenPromissoryModal,
  onSubmitDispute
}) => {
  const { printDocument, encounters, selectedEncounter } = useMedCore();
  const [selectedDisputeItem, setSelectedDisputeItem] = useState<ChargemasterItem | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('ALL');

  const p = bill.patient;
  const f = bill.financials;
  const oop = bill.outOfPocketDrivers;
  const isSettled = f.remainingBalance <= 0 || bill.state === 'PAID';

  const displayName = isMasked ? maskName(p.fullName) : p.fullName;

  const handlePrint = () => {
    const enc = encounters.find((e) => e.encounterNumber === bill.billNumber || e.id === bill.id || e.patient.mrn === p.mrn) || selectedEncounter;
    printDocument({
      type: 'OFFICIAL_ESOA',
      title: `Official eSOA - ${bill.billNumber}`,
      data: { encounter: enc }
    });
  };

  const filteredItems = bill.items.filter((item) => {
    if (activeCategoryFilter === 'ALL') return true;
    return item.category === activeCategoryFilter;
  });

  const categories = [
    { key: 'ALL', label: 'All Items' },
    { key: 'ROOM_BOARD', label: 'Room & Board' },
    { key: 'PHARMACY', label: 'Pharmacy' },
    { key: 'LABORATORY', label: 'Diagnostics' },
    { key: 'CENTRAL_SUPPLIES', label: 'Supplies' },
    { key: 'PROFESSIONAL_FEE', label: 'Doctor PFs' }
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto font-sans pb-24">
      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Overview</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs hover:bg-slate-50 transition-colors"
            title="Print Official BIR & PhilHealth-compliant electronic Statement of Account (eSOA)"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Print Statement</span>
          </button>

          <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
            SOA: {bill.billNumber}
          </span>
        </div>
      </div>

      {/* Hospital Statement Header */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-sm shadow-xs shrink-0">
              SJ
            </div>
            <div className="min-w-0">
              <h2 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight truncate">
                {bill.facilityName}
              </h2>
              <p className="text-xs text-slate-500 truncate">{bill.facilityAddress}</p>
            </div>
          </div>
          <div className="text-left sm:text-right font-mono text-[11px] text-slate-400 shrink-0">
            <div>TIN: {bill.facilityTin}</div>
            <div>Tel: {bill.facilityPhone}</div>
          </div>
        </div>

        {/* Patient Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 block uppercase">Patient</span>
            <strong className="text-slate-900 truncate block">{displayName}</strong>
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 block uppercase">MRN / Room</span>
            <span className="font-mono text-slate-800 truncate block">{p.mrn} · {p.roomBed}</span>
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 block uppercase">Admission Date</span>
            <span className="text-slate-700 truncate block">{p.admissionDate.split('T')[0]}</span>
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 block uppercase">Primary Insurance</span>
            <span className="text-indigo-700 font-semibold truncate block">{p.hmoProviderName}</span>
          </div>
        </div>
      </div>

      {/* 5-Step Statutory Deduction Waterfall */}
      <StatutoryWaterfallSummary
        waterfall={{
          grossHospitalCharges: f.grossHospitalCharges,
          grossDoctorFee: f.grossDoctorFees,
          grossTotal: f.grossTotal,
          vatExemption: f.vatExemption,
          seniorPwdDiscount: f.seniorPwdDiscount,
          netVatDiscountedBase: f.grossTotal - f.vatExemption - f.seniorPwdDiscount,
          philhealthHci: Math.round(f.philhealthTotal * 0.7),
          philhealthPf: Math.round(f.philhealthTotal * 0.3),
          philhealthTotal: f.philhealthTotal,
          hmoApprovedAmount: f.hmoApprovedAmount,
          netPatientDue: f.netPatientDue,
          roomUpgradeExcess: oop.roomUpgradeExcess,
          excludedConsumables: oop.excludedConsumables,
          doctorExcessPf: oop.doctorExcessPf,
          patientPaid: f.amountPaid
        }}
        hmoName={p.hmoProviderName}
        isSeniorCitizen={p.isSeniorCitizen}
        isPwd={p.isPwd}
        isNbb={p.isNbb}
      />

      {/* Three Out-of-Pocket Cost Drivers Box */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Understanding Your Out-of-Pocket Drivers</span>
          </h3>
          <span className="text-[11px] text-slate-400">
            Why insurance didn't cover 100%
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">
              1. Room Differential
            </span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {formatPeso(oop.roomUpgradeExcess)}
            </span>
            <p className="text-[11px] text-slate-500 leading-tight">
              Charges above your contracted daily room allowance.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">
              2. Excluded Sundries
            </span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {formatPeso(oop.excludedConsumables)}
            </span>
            <p className="text-[11px] text-slate-500 leading-tight">
              Medical disposables disallowed under standard policy exclusions.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">
              3. Doctor Excess PF
            </span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {formatPeso(oop.doctorExcessPf)}
            </span>
            <p className="text-[11px] text-slate-500 leading-tight">
              Specialist fees declared above accredited fee ceilings.
            </p>
          </div>
        </div>
      </div>

      {/* Itemized Chargemaster Section */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              Itemized Chargemaster
            </h3>
            <p className="text-xs text-slate-500">
              Tap any item to see plain-language explanation or submit a dispute
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setActiveCategoryFilter(c.key)}
                className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors min-h-[34px] ${
                  activeCategoryFilter === c.key
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rows */}
        <div className="space-y-2">
          {filteredItems.map((item) => (
            <ItemizedChargeRow
              key={item.id}
              item={item}
              onDisputeClick={(it) => setSelectedDisputeItem(it)}
              isReadOnly={isSettled}
            />
          ))}
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3 px-3 sm:px-4 shadow-xl">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none">
              Balance to Settle
            </span>
            <div className="font-mono font-extrabold text-base sm:text-2xl text-slate-900 mt-0.5 truncate">
              {formatPeso(f.remainingBalance)}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {!isSettled && (
              <>
                <button
                  type="button"
                  onClick={onOpenPromissoryModal}
                  className="px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-bold text-xs transition-colors shadow-2xs flex items-center gap-1 sm:gap-1.5 min-h-[38px]"
                >
                  <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
                  <span className="hidden sm:inline">RA 9439 Note (0%)</span>
                  <span className="sm:hidden">Installments</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenPaymentModal}
                  className="px-3 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition-colors flex items-center gap-1.5 sm:gap-2 min-h-[38px]"
                >
                  <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span>Pay Now (Demo)</span>
                </button>
              </>
            )}

            {isSettled && (
              <span className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Account Fully Settled</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Dispute Modal */}
      <DisputeItemModal
        item={selectedDisputeItem}
        isOpen={Boolean(selectedDisputeItem)}
        onClose={() => setSelectedDisputeItem(null)}
        onSubmitDispute={onSubmitDispute}
      />
    </div>
  );
};
