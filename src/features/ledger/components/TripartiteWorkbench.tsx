import React, { useState, useRef, useEffect } from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import { formatPhp } from '@/utils/formatters';
import { BillLifecycleState } from '@/types/domain';
import {
  Smartphone,
  ExternalLink,
  HelpCircle,
  ShieldCheck,
  AlertCircle,
  Search,
  CheckCircle2,
  FileCheck2,
  Send,
  Copy,
  Check,
  Sparkles
} from 'lucide-react';

export const TripartiteWorkbench: React.FC = () => {
  const {
    encounters,
    selectedEncounter,
    selectEncounter,
    openWhyDoIOweThis,
    openDossierDrawer,
    openPatientClarifyDrawer,
    finalizeBill,
    sendBillToPatient,
    setActiveRoute,
    setActiveRole
  } = useMedCore();

  const enc = selectedEncounter;
  const waterfall = enc.waterfall;
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const handleSendEsoa = () => {
    const { magicLink } = sendBillToPatient(enc.id);
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(magicLink).catch(() => {});
    }
    setCopiedNotification(`eSOA dispatched for ${enc.patient.fullName || enc.patient.maskedName}! Magic link copied to clipboard.`);
    setTimeout(() => {
      setCopiedNotification(null);
    }, 4500);
  };

  const renderBillBadge = (state?: BillLifecycleState) => {
    if (enc.promissoryNote && enc.promissoryNote.status === 'ACTIVE') {
      return (
        <span className="inline-flex items-center gap-1 font-bold text-teal-800 bg-teal-100/70 border border-teal-300 px-2 py-0.5 rounded-full text-xs">
          <span>⚖ RA 9439 Note Active</span>
        </span>
      );
    }
    switch (state) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 rounded-full text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>✓ Settled &amp; Cleared</span>
          </span>
        );
      case 'PARTIALLY_PAID':
        return (
          <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded-full text-xs">
            <span>◐ Partially Paid</span>
          </span>
        );
      case 'DISPUTED':
        return (
          <span className="inline-flex items-center gap-1 font-bold text-rose-800 bg-rose-100/70 border border-rose-300 px-2 py-0.5 rounded-full text-xs">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>! Contested Item</span>
          </span>
        );
      case 'VIEWED':
        return (
          <span className="inline-flex items-center gap-1 font-bold text-purple-800 bg-purple-100/70 border border-purple-300 px-2 py-0.5 rounded-full text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
            <span>● Viewed by Patient</span>
          </span>
        );
      case 'SENT_TO_PATIENT':
        return (
          <span className="inline-flex items-center gap-1 font-bold text-blue-800 bg-blue-100/70 border border-blue-300 px-2 py-0.5 rounded-full text-xs">
            <Send className="w-3 h-3 text-blue-600" />
            <span>↗ eSOA Sent</span>
          </span>
        );
      case 'FINALIZED':
        return (
          <span className="inline-flex items-center gap-1 font-semibold text-indigo-800 bg-indigo-100/70 border border-indigo-300 px-2 py-0.5 rounded-full text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Bill Finalized</span>
          </span>
        );
      case 'DRAFT':
      default:
        return (
          <span className="inline-flex items-center gap-1 font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full text-xs">
            <span>Draft</span>
          </span>
        );
    }
  };

  const currentIndex = encounters.findIndex((e) => e.id === enc.id);

  const matchingEncounters = encounters.filter((e) => {
    if (!patientSearchQuery.trim()) return false;
    const q = patientSearchQuery.toLowerCase();
    const name = (e.patient.fullName || e.patient.maskedName || '').toLowerCase();
    const bed = (e.bedNumber || e.roomBed || '').toLowerCase();
    const encNum = (e.encounterNumber || '').toLowerCase();
    return name.includes(q) || bed.includes(q) || encNum.includes(q);
  });

  useEffect(() => {
    const handleClickOutside = (ev: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(ev.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pName = enc.patient.fullName || enc.patient.maskedName;
  const rBed = enc.bedNumber || enc.roomBed;
  const rType = enc.roomType || enc.roomCategory.replace(/_/g, ' ');
  const hName = enc.hmo.hmoName || enc.hmo.providerName;
  const doctorName = enc.attendingDoctor;

  const items = enc.items;

  const filteredItems = items.filter((item) => {
    if (filterCategory === 'ALL') return true;
    return item.category === filterCategory;
  });

  const categories = [
    { key: 'ALL', label: 'All charges' },
    { key: 'ROOM_BOARD', label: 'Room & board' },
    { key: 'PHARMACY', label: 'Pharmacy' },
    { key: 'LABORATORY', label: 'Laboratory' },
    { key: 'CENTRAL_SUPPLIES', label: 'Medical supplies' },
    { key: 'PROFESSIONAL_FEE', label: 'Professional fees' }
  ];

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* 1. Encounter Summary Header (Inspo 1 Comlogik Style) */}
      <div className="px-6 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0 bg-white">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-base shadow-xs">
            {pName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {pName}
              </h2>
              <span className="text-xs font-mono text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded">
                {enc.encounterNumber}
              </span>
              {enc.patient.isSeniorCitizen && (
                <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                  Senior Citizen (RA 9994)
                </span>
              )}
              {enc.patient.isPwd && (
                <span className="text-xs font-bold text-indigo-800 bg-indigo-100 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  PWD (RA 10754)
                </span>
              )}
            </div>

            <div className="text-xs text-slate-600 mt-1">
              <span className="font-semibold text-slate-900">{rBed} ({rType})</span> · PhilHealth: <span className="font-mono">{enc.patient.philhealthPin}</span> · {hName} · Attending: <strong>{doctorName}</strong>
            </div>
          </div>
        </div>

        {/* Header Actions: Patient Switcher + Search Bar + Preview Patient View + Open Dossier */}
        <div className="flex items-center gap-3">
          {/* Direct Select Switcher (Moved to right side with enlarged sizing) */}
          <select
            value={enc.id}
            onChange={(e) => selectEncounter(e.target.value)}
            className="text-sm bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg py-2 px-3 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[210px] truncate shadow-2xs transition-colors cursor-pointer"
            title="Switch to specific patient"
          >
            {encounters.map((e, idx) => (
              <option key={e.id} value={e.id}>
                #{idx + 1} {e.roomBed} · {e.patient.fullName || e.patient.maskedName}
              </option>
            ))}
          </select>

          {/* Search Bar (Enlarged size) */}
          <div ref={searchRef} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search patient, bed, MRN..."
              value={patientSearchQuery}
              onChange={(e) => {
                setPatientSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              className="pl-9 pr-3.5 py-2 text-sm rounded-lg bg-slate-50 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-60 text-slate-800 placeholder-slate-400 shadow-2xs"
            />
            {isSearchOpen && patientSearchQuery.trim() && (
              <div className="absolute right-0 top-full mt-1.5 w-80 bg-white rounded-xl border border-slate-200 shadow-lg z-50 max-h-64 overflow-y-auto divide-y divide-slate-100 overscroll-contain">
                {matchingEncounters.length === 0 ? (
                  <div className="p-3 text-xs text-slate-400 text-center">No patients found</div>
                ) : (
                  matchingEncounters.slice(0, 10).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        selectEncounter(m.id);
                        setPatientSearchQuery('');
                        setIsSearchOpen(false);
                      }}
                      className="w-full text-left p-2.5 hover:bg-slate-50 flex items-center justify-between text-xs transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{m.patient.fullName || m.patient.maskedName}</div>
                        <div className="text-[10px] text-slate-400">{m.roomBed} · {m.encounterNumber}</div>
                      </div>
                      <span className="font-mono font-bold text-slate-700 text-xs">
                        {formatPhp(m.waterfall.netPatientDue)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => openPatientClarifyDrawer(enc)}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span>Preview patient view</span>
          </button>
          <button
            onClick={() => openDossierDrawer(enc)}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors shadow-xs flex items-center gap-1.5"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open dossier</span>
          </button>
        </div>
      </div>

      {/* 1.5 Billing Lifecycle & eSOA Dispatch Strip */}
      <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
            Billing Lifecycle:
          </span>
          {renderBillBadge(enc.billState)}

          <span className="text-slate-300">·</span>
          <span className="text-slate-600 font-medium">
            Bill No: <span className="font-mono font-bold text-slate-900">{enc.billNumber || `SOA-SJMC-26-${enc.encounterNumber}`}</span>
          </span>

          {enc.amountPaid !== undefined && enc.amountPaid > 0 && (
            <>
              <span className="text-slate-300">·</span>
              <span className="text-slate-600 font-medium">
                Paid: <span className="font-mono font-bold text-emerald-700">{formatPhp(enc.amountPaid)}</span>
              </span>
            </>
          )}

          {enc.remainingBalance !== undefined && enc.remainingBalance > 0 && (
            <>
              <span className="text-slate-300">·</span>
              <span className="text-slate-600 font-medium">
                Remaining: <span className="font-mono font-bold text-rose-700">{formatPhp(enc.remainingBalance)}</span>
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Finalize Bill Action */}
          {enc.billState === 'DRAFT' ? (
            <button
              type="button"
              onClick={() => finalizeBill(enc.id)}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs transition-colors flex items-center gap-1.5"
              title="Lock hospital chargemaster lines and prepare official statement"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Finalize Bill</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Bill Finalized</span>
            </span>
          )}

          {/* Send eSOA Action */}
          <button
            type="button"
            onClick={handleSendEsoa}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-2xs transition-colors flex items-center gap-1.5"
            title="Dispatch plain-language eSOA magic link to patient mobile via SMS"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{enc.billState === 'SENT_TO_PATIENT' || enc.billState === 'VIEWED' ? 'Resend eSOA' : 'Send eSOA (SMS/Link)'}</span>
          </button>

          {/* Direct Switcher into Full Patient Experience */}
          <button
            type="button"
            onClick={() => {
              setActiveRole('PATIENT_GUARANTOR');
              setActiveRoute('PATIENT_PORTAL');
            }}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-2xs transition-colors flex items-center gap-1.5"
            title="Switch to Patient Guarantor view in standalone portal"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Open Patient Portal</span>
          </button>
        </div>
      </div>

      {/* Copy Notification Banner */}
      {copiedNotification && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-2 flex items-center justify-between text-xs text-blue-900 animate-in fade-in duration-200 shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-semibold">{copiedNotification}</span>
            <span className="text-blue-600 font-mono text-[11px] hidden md:inline">
              (magic link active)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveRole('PATIENT_GUARANTOR');
                setActiveRoute('PATIENT_PORTAL');
              }}
              className="text-xs font-bold text-blue-700 underline hover:text-blue-900"
            >
              Test Patient Experience &rarr;
            </button>
            <button
              type="button"
              onClick={() => setCopiedNotification(null)}
              className="text-slate-400 hover:text-slate-600 ml-2 font-bold"
            >
              &#10005;
            </button>
          </div>
        </div>
      )}

      {/* 2. Unified Statutory Deduction Waterfall Strip (Centavo-precision Comlogik) */}
      <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50 shrink-0">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
          Statutory deduction waterfall (centavo precision)
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm divide-y md:divide-y-0 md:divide-x divide-slate-200">
          <div>
            <div className="text-xs text-slate-500 font-medium">1. Gross charges</div>
            <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
              {formatPhp(waterfall.grossTotal)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Hospital billed</div>
          </div>

          <div className="md:pl-4 pt-2 md:pt-0">
            <div className="text-xs text-slate-500 font-medium">2. VAT exemption</div>
            <div className="text-base font-bold font-mono text-emerald-700 mt-0.5">
              -{formatPhp(waterfall.vatExemption)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {waterfall.vatExemption > 0 ? '12% VAT exempt' : 'Standard rate'}
            </div>
          </div>

          <div className="md:pl-4 pt-2 md:pt-0">
            <div className="text-xs text-slate-500 font-medium">3. SC / PWD discount</div>
            <div className="text-base font-bold font-mono text-emerald-700 mt-0.5">
              -{formatPhp(waterfall.seniorPwdDiscount)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {waterfall.seniorPwdDiscount > 0 ? '20% statutory' : 'Not applicable'}
            </div>
          </div>

          <div className="md:pl-4 pt-2 md:pt-0">
            <div className="text-xs text-slate-500 font-medium">4. PhilHealth ACR</div>
            <div className="text-base font-bold font-mono text-blue-700 mt-0.5">
              -{formatPhp(waterfall.philhealthTotal)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Case rates</div>
          </div>

          <div className="md:pl-4 pt-2 md:pt-0">
            <div className="text-xs text-slate-500 font-medium">5. HMO LOA</div>
            <div className="text-base font-bold font-mono text-blue-700 mt-0.5">
              -{formatPhp(waterfall.hmoApprovedAmount)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{hName} approved</div>
          </div>

          <div className="md:pl-4 pt-2 md:pt-0">
            <div className="text-xs font-bold text-slate-800">6. Net patient due</div>
            <div className="text-lg font-black font-mono text-slate-900 mt-0.5 tabular-nums">
              {formatPhp(waterfall.netPatientDue)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {waterfall.netPatientDue > 0 ? 'Collect at cashier' : 'Zero balance'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Category Filter & Line Item Table */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Table Filters */}
        <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0 bg-white">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            {categories.map((c) => (
              <button
                key={c.key}
                onClick={() => setFilterCategory(c.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  filterCategory === c.key
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-500 font-semibold">
            {filteredItems.length} of {items.length} line items
          </div>
        </div>

        {/* Table Contents (Comlogik Inspo 1 Style) */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
              <tr className="text-xs font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3.5 px-6 text-left">Item / Service Description</th>
                <th className="py-3.5 px-3 text-left">Qty</th>
                <th className="py-3.5 px-4 text-left">Gross Total</th>
                <th className="py-3.5 px-4 text-left">PhilHealth</th>
                <th className="py-3.5 px-4 text-left">HMO Coverage</th>
                <th className="py-3.5 px-4 text-left">Patient Balance</th>
                <th className="py-3.5 px-4 text-left">Coverage Status</th>
                <th className="py-3.5 px-6 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="py-3.5 px-6 text-left">
                    <div className="font-semibold text-slate-900 text-sm">
                      {item.description}
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      {item.code} · {item.category.replace(/_/g, ' ')}
                    </div>
                  </td>

                  <td className="py-3.5 px-3 text-left font-mono text-slate-600 font-semibold">
                    {item.qty}
                  </td>

                  <td className="py-3.5 px-4 text-left font-mono font-bold text-slate-900 tabular-nums">
                    {formatPhp(item.grossAmount)}
                  </td>

                  <td className="py-3.5 px-4 text-left font-mono text-slate-600 tabular-nums">
                    {item.philhealthCovered > 0 ? formatPhp(item.philhealthCovered) : '—'}
                  </td>

                  <td className="py-3.5 px-4 text-left font-mono text-slate-600 tabular-nums">
                    {item.hmoCovered > 0 ? formatPhp(item.hmoCovered) : '—'}
                  </td>

                  <td className="py-3.5 px-4 text-left font-mono font-bold text-slate-900 tabular-nums">
                    {(() => {
                      const isSeniorOrPwd = Boolean(
                        selectedEncounter.patient.seniorCitizenId ||
                        selectedEncounter.patient.isSeniorCitizen ||
                        selectedEncounter.patient.pwdId ||
                        selectedEncounter.patient.isPwd
                      );
                      const vat = isSeniorOrPwd && item.isVatable ? Number((item.grossAmount - item.grossAmount / 1.12).toFixed(2)) : 0;
                      const sc = isSeniorOrPwd && item.isVatable ? Number(((item.grossAmount - vat) * 0.20).toFixed(2)) : 0;
                      const maxLegalOop = Math.max(0, Number((item.grossAmount - vat - sc - item.philhealthCovered - item.hmoCovered).toFixed(2)));
                      const patientOopResolved = item.patientOop !== undefined && item.patientOop < maxLegalOop ? item.patientOop : maxLegalOop;

                      return patientOopResolved > 0 ? (
                        <span className="text-rose-700 font-bold">{formatPhp(patientOopResolved)}</span>
                      ) : (
                        <span className="text-slate-400">₱0.00</span>
                      );
                    })()}
                  </td>

                  <td className="py-3.5 px-4 text-left text-xs">
                    {item.status === 'CONTESTED' || item.isDisputed ? (
                      <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full text-xs">
                        <AlertCircle className="w-3 h-3 text-rose-600" />
                        <span>Contested</span>
                      </span>
                    ) : item.status === 'COVERED' ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-xs">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>Covered</span>
                      </span>
                    ) : (
                      <span className="font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-xs">
                        {item.status.replace(/_/g, ' ')}
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-6 text-left">
                    <button
                      onClick={() => openWhyDoIOweThis(item)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs inline-flex items-center gap-1"
                    >
                      <HelpCircle className="w-3 h-3 text-slate-400" />
                      <span>Why?</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
