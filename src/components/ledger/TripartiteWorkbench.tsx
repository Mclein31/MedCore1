import React, { useState } from 'react';
import { useMedCore } from '../../context/MedCoreContext';
import { formatPeso, formatPstTimestamp } from '../../utils/formatters';
import { ChargemasterItem } from '../../types/domain';
import {
  HelpCircle,
  Shield,
  FileText,
  AlertTriangle,
  Lock,
  CheckCircle2,
  ArrowRight,
  TrendingDown,
  Sparkles,
  QrCode,
  DollarSign,
  UserCheck,
  ChevronRight,
  Clock,
  ExternalLink
} from 'lucide-react';

export const TripartiteWorkbench: React.FC = () => {
  const {
    selectedEncounter,
    openWhyDoIOweThis,
    openActionDrawer,
    openPromissoryModal,
    openGatePassModal,
    openDoctorQuickSign,
    settlePatientBalance,
    setActiveRoute
  } = useMedCore();

  const enc = selectedEncounter;
  const waterfall = enc.waterfall;
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const pName = enc.patient.fullName || enc.patient.maskedName;
  const rBed = enc.bedNumber || enc.roomBed;
  const rType = enc.roomType || enc.roomCategory.replace(/_/g, ' ');
  const hName = enc.hmo.hmoName || enc.hmo.providerName;
  const lNum = enc.hmo.loaNumber || enc.hmo.cardMasked;
  const doctorName = enc.attendingDoctor;

  const items = enc.items;

  const filteredItems = items.filter((item) => {
    if (filterCategory === 'ALL') return true;
    return item.category === filterCategory;
  });

  const categories = [
    { key: 'ALL', label: 'All Items' },
    { key: 'ROOM_BOARD', label: 'Room & Board' },
    { key: 'PHARMACY', label: 'Pharmacy' },
    { key: 'LABORATORY', label: 'Laboratory' },
    { key: 'CENTRAL_SUPPLIES', label: 'Supplies' },
    { key: 'PROFESSIONAL_FEE', label: 'Doctor PF' }
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0F172A] overflow-hidden">
      {/* 1. Encounter Summary Header */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {pName}
            </h2>
            <span className="text-xs font-mono text-slate-500">
              {enc.encounterNumber}
            </span>
            {enc.patient.isSeniorCitizen && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
                SC: {enc.patient.seniorCitizenId || 'ACTIVE'}
              </span>
            )}
            {enc.patient.isPwd && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-bold">
                PWD: {enc.patient.pwdId || 'ACTIVE'}
              </span>
            )}
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-brand-blue dark:text-sky-400 border border-sky-500/20">
              {enc.stage.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            <span>Bed: <strong className="text-slate-700 dark:text-slate-300">{rBed} ({rType})</strong></span>
            <span>PhilHealth: <strong className="text-slate-700 dark:text-slate-300">{enc.patient.philhealthPin}</strong></span>
            <span>HMO: <strong className="text-slate-700 dark:text-slate-300">{hName} (#{lNum})</strong></span>
            <span>Doctor: <strong className="text-slate-700 dark:text-slate-300">{doctorName}</strong></span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveRoute('PATIENT_CLARIFY')}
            className="px-2.5 py-1.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
            title="Preview Patient Clarify Mobile Web SOA"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Clarify View</span>
          </button>
          <button
            onClick={openActionDrawer}
            className="px-3 py-1.5 rounded bg-brand-navy hover:bg-slate-800 dark:bg-brand-blue dark:hover:bg-sky-600 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <span>Actions Drawer</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Visual Statutory Deduction Waterfall Banner */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/40 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">
            Interactive Statutory Deduction Waterfall (Exact Centavo Adjudication)
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            RA 9994/10754 • PhilHealth ACR • HMO Tier
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
          {/* Step 1: Gross Charges */}
          <div className="p-2 rounded bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <div className="text-[10px] font-mono text-slate-400 uppercase">1. Gross Charges</div>
            <div className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5 tabular-nums">
              {formatPeso(waterfall.grossTotal)}
            </div>
            <div className="text-[10px] text-slate-400 truncate">Hospital Chargemaster</div>
          </div>

          {/* Step 2: VAT Exemption */}
          <div className="p-2 rounded bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 uppercase">
              2. 12% VAT Exempt
            </div>
            <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
              -{formatPeso(waterfall.vatExemption)}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {waterfall.vatExemption > 0 ? 'RA 9994/10754 Applied' : 'Standard Rate (No SC)'}
            </div>
          </div>

          {/* Step 3: SC/PWD 20% Discount */}
          <div className="p-2 rounded bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 uppercase">
              3. 20% SC / PWD
            </div>
            <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
              -{formatPeso(waterfall.seniorPwdDiscount)}
            </div>
            <div className="text-[10px] text-slate-400 truncate">On Net of VAT Base</div>
          </div>

          {/* Step 4: PhilHealth ACR */}
          <div className="p-2 rounded bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <div className="text-[10px] font-mono text-sky-600 dark:text-sky-400 uppercase">
              4. PhilHealth ACR
            </div>
            <div className="text-sm font-bold font-mono text-sky-600 dark:text-sky-400 mt-0.5 tabular-nums">
              -{formatPeso(waterfall.philhealthTotal)}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              HCI: {formatPeso(waterfall.philhealthHci)} | PF: {formatPeso(waterfall.philhealthPf)}
            </div>
          </div>

          {/* Step 5: HMO Approved LOA */}
          <div className="p-2 rounded bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <div className="text-[10px] font-mono text-sky-600 dark:text-sky-400 uppercase">
              5. HMO Approved LOA
            </div>
            <div className="text-sm font-bold font-mono text-sky-600 dark:text-sky-400 mt-0.5 tabular-nums">
              -{formatPeso(waterfall.hmoApprovedAmount)}
            </div>
            <div className="text-[10px] text-slate-400 truncate">{hName} Max Covered</div>
          </div>

          {/* Step 6: Net Patient Due */}
          <div className={`p-2 rounded border ${
            waterfall.netPatientDue > 0
              ? 'bg-amber-500/10 border-amber-500/30'
              : 'bg-emerald-500/10 border-emerald-500/30'
          }`}>
            <div className={`text-[10px] font-mono uppercase font-bold ${
              waterfall.netPatientDue > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              6. Net Patient Due
            </div>
            <div className={`text-sm font-bold font-mono mt-0.5 tabular-nums ${
              waterfall.netPatientDue > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'
            }`}>
              {formatPeso(waterfall.netPatientDue)}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              {waterfall.netPatientDue > 0 ? 'Collect at Discharge' : 'Fully Settled / Cleared'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Category Filter & Line Item Table */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Table Filters */}
        <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            {categories.map((c) => (
              <button
                key={c.key}
                onClick={() => setFilterCategory(c.key)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors whitespace-nowrap ${
                  filterCategory === c.key
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-slate-400 font-mono hidden md:block">
            {filteredItems.length} of {items.length} line items
          </div>
        </div>

        {/* Table Contents */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-400 uppercase tracking-wider z-10">
              <tr>
                <th className="py-2 px-3">Item / Service</th>
                <th className="py-2 px-2 text-right">Qty</th>
                <th className="py-2 px-2 text-right">Gross Price</th>
                <th className="py-2 px-2 text-right">PhilHealth</th>
                <th className="py-2 px-2 text-right">HMO LOA</th>
                <th className="py-2 px-2 text-right">Patient Due</th>
                <th className="py-2 px-2 text-center">Status</th>
                <th className="py-2 px-3 text-right">Explainer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {filteredItems.map((item) => {
                const isDisputed = item.status === 'CONTESTED' || item.isDisputed;

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-850/60 transition-colors ${
                      isDisputed ? 'bg-purple-500/5 dark:bg-purple-950/20' : ''
                    }`}
                  >
                    {/* Item Description */}
                    <td className="py-2.5 px-3 font-sans max-w-[220px]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs truncate">
                          {item.description}
                        </span>
                        {isDisputed && (
                          <span className="p-0.5 rounded bg-purple-500/20 text-purple-600 dark:text-purple-400 shrink-0" title="Item Locked Under Dispute">
                            <Lock className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>{item.code}</span>
                        <span>•</span>
                        <span>{item.category.replace(/_/g, ' ')}</span>
                      </div>
                    </td>

                    {/* Qty */}
                    <td className="py-2.5 px-2 text-right text-slate-600 dark:text-slate-400 tabular-nums">
                      {item.qty}
                    </td>

                    {/* Gross */}
                    <td className="py-2.5 px-2 text-right font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                      {formatPeso(item.grossAmount)}
                    </td>

                    {/* PhilHealth */}
                    <td className="py-2.5 px-2 text-right text-sky-600 dark:text-sky-400 tabular-nums">
                      {item.philhealthCovered > 0 ? formatPeso(item.philhealthCovered) : '—'}
                    </td>

                    {/* HMO */}
                    <td className="py-2.5 px-2 text-right text-sky-600 dark:text-sky-400 tabular-nums">
                      {item.hmoCovered > 0 ? formatPeso(item.hmoCovered) : '—'}
                    </td>

                    {/* Patient OOP */}
                    <td className="py-2.5 px-2 text-right font-bold tabular-nums">
                      <span
                        className={
                          item.patientOop > 0
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }
                      >
                        {formatPeso(item.patientOop)}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-2.5 px-2 text-center">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-semibold ${
                          item.status === 'COVERED'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : item.status === 'PARTIAL'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : item.status === 'CONTESTED' || item.status === 'DISPUTED'
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                            : item.status === 'SUPERVISORY_WAIVED' || item.status === 'WAIVED'
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    {/* Why Do I Owe This Button */}
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => openWhyDoIOweThis(item)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-medium text-slate-700 dark:text-slate-300 transition-colors"
                        title="Plain English line-item explanation"
                      >
                        <HelpCircle className="w-3 h-3 text-brand-blue dark:text-sky-400" />
                        <span>Why?</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 4. Bottom Exclusion Triage & Quick Discharge Settlement Bar */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-400 text-[10px] block">Room Differential:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {formatPeso(waterfall.roomUpgradeExcess)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Consumable Exclusions:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {formatPeso(waterfall.excludedConsumables)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Doctor Excess PF:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {formatPeso(waterfall.doctorExcessPf)}
              </span>
            </div>
            <div className="pl-2 border-l border-slate-200 dark:border-slate-700">
              <span className="text-slate-400 text-[10px] block font-bold">Total Patient Net Due:</span>
              <span className="text-base font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {formatPeso(waterfall.netPatientDue)}
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2">
            {waterfall.netPatientDue > 0 ? (
              <>
                <button
                  onClick={() => settlePatientBalance(enc.id, 'QR_PH')}
                  className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Collect via QR Ph</span>
                </button>
                <button
                  onClick={openPromissoryModal}
                  className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors"
                >
                  RA 9439 Note
                </button>
              </>
            ) : (
              <button
                onClick={openGatePassModal}
                className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs font-mono"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>View Digital Gate Pass</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
