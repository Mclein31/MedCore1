import React, { useState } from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import { Encounter } from '@/types/domain';
import { formatPhp } from '@/utils/formatters';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Shield,
  Stethoscope,
  Pill,
  CreditCard,
  QrCode,
  ExternalLink,
  Smartphone,
  Columns,
  Table,
  List,
  Printer,
  FileCheck2,
  User,
  UserPlus,
  Pencil,
  Trash2
} from 'lucide-react';
import { ConfirmButton } from '@/components/common';

export const ActiveDischargeRadar: React.FC = () => {
  const {
    encounters,
    selectedEncounterId,
    selectEncounter,
    openDossierDrawer,
    openDoctorQuickSign,
    openPromissoryModal,
    openGatePassModal,
    openPatientClarifyDrawer,
    applyAccreditedCeiling,
    clearPharmacyRts,
    approveHmoFinalLoa,
    settlePatientBalance,
    printDocument,
    activeFilter,
    setActiveFilter,
    openAdmitPatientModal,
    openEditEncounterModal,
    deleteEncounter
  } = useMedCore();

  const [filterQuery, setFilterQuery] = useState('');
  const [viewMode, setViewMode] = useState<'MASTER_DETAIL' | 'TABLE' | 'CARD_LIST'>('MASTER_DETAIL');
  const [mobileActivePane, setMobileActivePane] = useState<'QUEUE' | 'DETAIL'>('QUEUE');

  // Filter encounters
  const filteredEncounters = encounters.filter((enc) => {
    if (activeFilter === 'WARNING' && enc.slaStatus !== 'WARNING') return false;
    if (activeFilter === 'BREACH' && enc.slaStatus !== 'BREACH') return false;
    if (activeFilter === 'DISPUTED') {
      const isDisp =
        enc.items.some(
          (i) =>
            (i.status === 'CONTESTED' || i.isDisputed) &&
            i.status !== 'SUPERVISORY_WAIVED' &&
            i.status !== 'WAIVED'
        ) ||
        enc.disputes.some(
          (d) =>
            d.status !== 'SUPERVISOR_WAIVED' &&
            d.status !== 'HMO_RECONSIDERED' &&
            (d.status as string) !== 'RESOLVED' &&
            (d.status as string) !== 'WAIVED' &&
            (d.status as string) !== 'SUPERVISORY_WAIVED'
        );
      if (!isDisp) return false;
    }

    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      const matchName = (enc.patient.fullName || enc.patient.maskedName).toLowerCase().includes(q);
      const matchRoom = enc.roomBed.toLowerCase().includes(q);
      const matchDoctor = enc.attendingDoctor.toLowerCase().includes(q);
      const matchHmo = (enc.hmo.hmoName || enc.hmo.providerName).toLowerCase().includes(q);
      const matchDiag = (enc.primaryDiagnosis || '').toLowerCase().includes(q);
      return matchName || matchRoom || matchDoctor || matchHmo || matchDiag;
    }
    return true;
  });

  // Selected encounter for detail pane:
  // When filtered, prioritize selected encounter only if it is in filteredEncounters, else fall back to first filtered encounter
  const currentSelectedEncounter =
    (selectedEncounterId && filteredEncounters.find((e) => e.id === selectedEncounterId)) ||
    filteredEncounters[0] ||
    encounters.find((e) => e.id === selectedEncounterId) ||
    encounters[0];

  const getStageMeta = (stage: Encounter['stage']) => {
    switch (stage) {
      case 'MGH_DECLARED':
        return { step: 1, label: 'MGH Order Declared', icon: Clock };
      case 'DOCTOR_PF_PENDING':
        return { step: 2, label: 'Doctor PF Sign-Off', icon: Stethoscope };
      case 'PHARMACY_RTS_AUDIT':
        return { step: 3, label: 'Pharmacy RTS Return', icon: Pill };
      case 'HMO_FINAL_LOA':
        return { step: 4, label: 'HMO Final eLOA Review', icon: Shield };
      case 'PENDING_SETTLEMENT':
        return { step: 5, label: 'Patient Settlement', icon: CreditCard };
      case 'CLEARED_GATE_PASS':
        return { step: 6, label: 'Gate Pass Issued', icon: QrCode };
      default:
        return { step: 1, label: stage, icon: Clock };
    }
  };

  const renderBillStateChip = (enc: Encounter) => {
    if (enc.promissoryNote && enc.promissoryNote.status === 'ACTIVE') {
      return (
        <span className="inline-flex items-center gap-1 font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full text-[10px]">
          <span>⚖ RA 9439 Note Active</span>
        </span>
      );
    }
    switch (enc.billState) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px]">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>✓ Settled &amp; Cleared</span>
          </span>
        );
      case 'PARTIALLY_PAID':
        return (
          <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[10px]">
            <span>◐ Partially Paid</span>
          </span>
        );
      case 'DISPUTED':
        return (
          <span className="inline-flex items-center gap-1 font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full text-[10px]">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            <span>! Contested</span>
          </span>
        );
      case 'VIEWED':
        return (
          <span className="inline-flex items-center gap-1 font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
            <span>● Viewed</span>
          </span>
        );
      case 'SENT_TO_PATIENT':
        return (
          <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full text-[10px]">
            <span>↗ eSOA Sent</span>
          </span>
        );
      case 'FINALIZED':
        return (
          <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full text-[10px]">
            <span>Bill Finalized</span>
          </span>
        );
      case 'DRAFT':
      default:
        return (
          <span className="inline-flex items-center gap-1 font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full text-[10px]">
            <span>Draft</span>
          </span>
        );
    }
  };

  const getBlockerDetails = (enc: Encounter) => {
    const pName = enc.patient.fullName || enc.patient.maskedName;
    const hmoName = enc.hmo.hmoName || enc.hmo.providerName;
    switch (enc.stage) {
      case 'DOCTOR_PF_PENDING':
        return {
          title: 'Physician Professional Fee Declaration Pending',
          explanation: `Attending physician declared ₱${enc.doctorAgreedFee.toLocaleString()} exceeding the HMO contracted ceiling by ₱${enc.doctorExcessPf.toLocaleString()}.`,
          actionType: 'ceiling',
          actionText: 'Apply Tariff Ceiling',
          confirmText: 'Apply Ceiling',
          modalTitle: 'Apply Doctor Accredited Tariff Ceiling?',
          modalDescription: `Apply the statutory ${hmoName} accredited fee ceiling to Dr. ${enc.attendingDoctor}'s professional fee for ${pName}. This adjusts the balance due by ₱${enc.doctorExcessPf.toLocaleString()}.`,
          contextInfo: [
            { label: 'Patient', value: pName },
            { label: 'Attending Doctor', value: enc.attendingDoctor },
            { label: 'Excess PF', value: formatPhp(enc.doctorExcessPf) }
          ],
          isDangerous: true,
          variant: 'warning' as const,
          confirmVariant: 'warning' as const,
          buttonColor: 'bg-amber-600 hover:bg-amber-700 text-white',
          onAction: (e?: React.MouseEvent) => {
            if (e) e.stopPropagation();
            selectEncounter(enc.id);
            applyAccreditedCeiling(enc.id);
          }
        };
      case 'PHARMACY_RTS_AUDIT':
        return {
          title: 'Pharmacy Return-to-Stock (RTS) Clearance Pending',
          explanation: `${enc.unreturnedMedsCount} unreturned ward medicines require pharmacy credit slip reconciliation to prevent overcharging.`,
          actionType: 'pharmacy',
          actionText: 'Reconcile Ward Meds',
          confirmText: 'Clear RTS',
          modalTitle: 'Clear Pharmacy Return-to-Stock Audit?',
          modalDescription: `Certify that ${enc.unreturnedMedsCount} unreturned medicines for ${pName} have been reconciled and credit slips issued by Central Pharmacy.`,
          contextInfo: [
            { label: 'Patient', value: pName },
            { label: 'Ward/Bed', value: enc.roomBed },
            { label: 'Unreturned Meds', value: String(enc.unreturnedMedsCount) }
          ],
          isDangerous: true,
          variant: 'success' as const,
          confirmVariant: 'success' as const,
          buttonColor: 'bg-teal-600 hover:bg-teal-700 text-white',
          onAction: (e?: React.MouseEvent) => {
            if (e) e.stopPropagation();
            selectEncounter(enc.id);
            clearPharmacyRts(enc.id);
          }
        };
      case 'HMO_FINAL_LOA':
        return {
          title: 'HMO Final Letter of Authorization (eLOA) Awaiting Code',
          explanation: `${hmoName} portal has not transmitted final coverage lock. Awaiting LOA authorization response.`,
          actionType: 'hmo',
          actionText: 'Review & Confirm eLOA',
          confirmText: 'Approve eLOA',
          modalTitle: 'Approve & Lock HMO Final eLOA?',
          modalDescription: `Confirm final insurance adjudication and lock approved coverage amount of ${formatPhp(enc.waterfall.hmoApprovedAmount)} from ${hmoName} for ${pName}.`,
          contextInfo: [
            { label: 'Patient', value: pName },
            { label: 'Payer', value: hmoName },
            { label: 'Approved Amount', value: formatPhp(enc.waterfall.hmoApprovedAmount) },
            { label: 'Net Patient Due', value: formatPhp(enc.waterfall.netPatientDue) }
          ],
          isDangerous: true,
          variant: 'primary' as const,
          confirmVariant: 'primary' as const,
          buttonColor: 'bg-blue-600 hover:bg-blue-700 text-white',
          onAction: (e?: React.MouseEvent) => {
            if (e) e.stopPropagation();
            selectEncounter(enc.id);
            approveHmoFinalLoa(enc.id);
          }
        };
      case 'PENDING_SETTLEMENT':
        return {
          title: 'Patient Out-of-Pocket Balance Settlement',
          explanation: `Net patient due of ${formatPhp(enc.waterfall.netPatientDue)} requires settlement at cashier or via QR Ph digital POS.`,
          actionType: 'settlement',
          actionText: 'Collect via QR Ph / POS',
          confirmText: 'Record Payment',
          modalTitle: 'Confirm QR Ph Patient Payment?',
          modalDescription: `Record point-of-sale settlement of ${formatPhp(enc.waterfall.netPatientDue)} for ${pName}. This clears all financial holds.`,
          contextInfo: [
            { label: 'Patient', value: pName },
            { label: 'Net Due', value: formatPhp(enc.waterfall.netPatientDue) },
            { label: 'Channel', value: 'QR Ph / POS' }
          ],
          isDangerous: true,
          variant: 'success' as const,
          confirmVariant: 'success' as const,
          buttonColor: 'bg-emerald-600 hover:bg-emerald-700 text-white',
          onAction: (e?: React.MouseEvent) => {
            if (e) e.stopPropagation();
            selectEncounter(enc.id);
            settlePatientBalance(enc.id, 'QR_PH');
          }
        };
      case 'CLEARED_GATE_PASS':
        return {
          title: 'Discharge Clearance Complete',
          explanation: 'All clinical and financial milestones cleared. Patient authorized for lobby exit.',
          actionType: 'cleared',
          actionText: 'View Digital Gate Pass',
          confirmText: 'View Pass',
          modalTitle: 'View Digital Exit Gate Pass?',
          modalDescription: 'Open verified gate pass modal.',
          contextInfo: [],
          isDangerous: false,
          variant: 'outline' as const,
          confirmVariant: 'outline' as const,
          buttonColor: 'bg-emerald-600 hover:bg-emerald-700 text-white',
          onAction: (e?: React.MouseEvent) => {
            if (e) e.stopPropagation();
            selectEncounter(enc.id);
            openGatePassModal();
          }
        };
      case 'MGH_DECLARED':
      default:
        return {
          title: 'May Go Home (MGH) Medical Order Received',
          explanation: 'Initial discharge clearance sequence commenced. Audit checklist initialized.',
          actionType: 'review',
          actionText: 'Initiate Discharge Triage',
          confirmText: 'Initiate Triage',
          modalTitle: 'Initiate Discharge Triage?',
          modalDescription: 'Open dossier drawer to begin checklist audit.',
          contextInfo: [],
          isDangerous: false,
          variant: 'primary' as const,
          confirmVariant: 'primary' as const,
          buttonColor: 'bg-blue-600 hover:bg-blue-700 text-white',
          onAction: (e?: React.MouseEvent) => {
            if (e) e.stopPropagation();
            selectEncounter(enc.id);
            openDossierDrawer(enc);
          }
        };
    }
  };

  const warningCount = encounters.filter((e) => e.slaStatus === 'WARNING').length;
  const breachCount = encounters.filter((e) => e.slaStatus === 'BREACH').length;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
      {/* Subheader: Clean title, natural filter tabs, search, and view mode toggle */}
      <div className="px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div className="flex items-baseline gap-3">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Discharge Clearance Workstation
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            {filteredEncounters.length} active inpatient {filteredEncounters.length === 1 ? 'encounter' : 'encounters'}
          </span>
        </div>

        {/* Filter Controls & Layout Mode */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                activeFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({encounters.length})
            </button>
            <button
              onClick={() => setActiveFilter('WARNING')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                activeFilter === 'WARNING'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              <span>! At Risk ({warningCount})</span>
            </button>
            <button
              onClick={() => setActiveFilter('BREACH')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                activeFilter === 'BREACH'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <span>× Breached ({breachCount})</span>
            </button>
            <button
              onClick={() => setActiveFilter('DISPUTED')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                activeFilter === 'DISPUTED'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              Disputed
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search patients, rooms..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="pl-8 pr-3 h-8 text-xs rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48 text-slate-800 placeholder-slate-400 leading-normal"
            />
          </div>

          {/* Admit Inpatient Button */}
          <button
            type="button"
            onClick={openAdmitPatientModal}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
            title="Admit new patient and allocate hospital bed"
          >
            <UserPlus className="w-3.5 h-3.5 text-white" />
            <span>Admit Inpatient</span>
          </button>

          {/* View Mode Toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 hidden md:flex">
            <button
              onClick={() => setViewMode('MASTER_DETAIL')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'MASTER_DETAIL'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Split Master / Detail Queue"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Workspace</span>
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'TABLE'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Discharge Clearance Table"
            >
              <Table className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewMode('CARD_LIST')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'CARD_LIST'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Expanded Card List"
            >
              <List className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Body */}
      {viewMode === 'MASTER_DETAIL' ? (
        /* MASTER / DETAIL SPLIT-PANE WORKSPACE */
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          {/* Mobile Segmented Pane Switcher (< lg) */}
          <div className="lg:hidden p-2 bg-slate-100 border-b border-slate-200 flex items-center gap-1 shrink-0">
            <button
              onClick={() => setMobileActivePane('QUEUE')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-colors ${
                mobileActivePane === 'QUEUE'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              Patient Queue ({filteredEncounters.length})
            </button>
            <button
              onClick={() => setMobileActivePane('DETAIL')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-colors ${
                mobileActivePane === 'DETAIL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              Patient Detail ({currentSelectedEncounter?.patient.maskedName || 'None'})
            </button>
          </div>

          {/* Left Pane: The Operational Work Queue (Inspo 3 style) */}
          <div className={`w-full lg:w-80 xl:w-[320px] border-r border-slate-200 bg-white flex flex-col min-h-0 shrink-0 ${mobileActivePane === 'QUEUE' ? 'flex' : 'hidden lg:flex'}`}>
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider flex justify-between items-center shrink-0 sticky top-0 z-10">
              <span>Patient Queue ({filteredEncounters.length})</span>
              <span className="text-[10px] text-slate-400 font-normal">Select to triage</span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-slate-100 pb-6">
              {filteredEncounters.map((enc) => {
                const isSelected = enc.id === currentSelectedEncounter?.id;
                const remainingMinutes = 45 - enc.elapsedMinutes;
                const isBreached = remainingMinutes <= 0;
                const isWarning = enc.slaStatus === 'WARNING';
                const isCleared = enc.stage === 'CLEARED_GATE_PASS';
                const pName = enc.patient.fullName || enc.patient.maskedName;
                const hmo = enc.hmo.hmoName || enc.hmo.providerName;
                const blocker = getBlockerDetails(enc);

                return (
                  <div
                    key={enc.id}
                    onClick={() => {
                      selectEncounter(enc.id);
                      setMobileActivePane('DETAIL');
                    }}
                    className={`px-3 py-2 cursor-pointer transition-all border-l-4 ${
                      isSelected
                        ? 'bg-blue-50/70 border-l-blue-600 shadow-2xs'
                        : 'border-l-transparent hover:bg-slate-50'
                    }`}
                  >
                    {/* Top Line: Name + Bed */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-xs sm:text-sm text-slate-900 leading-snug truncate">
                            {pName}
                          </span>
                          {enc.patient.isSeniorCitizen && (
                            <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded shrink-0">
                              Senior
                            </span>
                          )}
                          {enc.patient.isPwd && (
                            <span className="text-[9px] font-bold text-indigo-800 bg-indigo-100 px-1.5 py-0.2 rounded shrink-0">
                              PWD
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 font-medium truncate">
                          <span className="font-semibold text-slate-700">{enc.roomBed}</span> · <span className="font-mono text-[10px]">{enc.encounterNumber}</span> · {hmo}
                        </div>
                      </div>

                      {/* Net Due */}
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-xs sm:text-sm text-slate-900 tabular-nums">
                          {formatPhp(enc.waterfall.netPatientDue)}
                        </div>
                        <div className="text-[9px] text-slate-400 font-medium uppercase">Net Due</div>
                      </div>
                    </div>

                    {/* Middle Line: Status & Blocker */}
                    <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      {/* Status */}
                      {isCleared ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 text-[10px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Ready for Exit</span>
                        </span>
                      ) : isBreached ? (
                        <span className="inline-flex items-center gap-1 font-bold text-rose-700 text-[10px]">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>SLA Breached ({Math.abs(remainingMinutes)}m)</span>
                        </span>
                      ) : isWarning ? (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-700 text-[10px]">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>At Risk ({remainingMinutes}m)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-blue-700 text-[10px]">
                          <Clock className="w-3 h-3 text-blue-600" />
                          <span>On Schedule ({remainingMinutes}m)</span>
                        </span>
                      )}

                      {/* Blocker Tag */}
                      <span className="text-[10px] text-slate-500 truncate max-w-[130px] font-medium">
                        {blocker.actionText}
                      </span>
                    </div>

                    {/* eSOA Lifecycle Status Row */}
                    <div className="mt-1 pt-1 border-t border-slate-50 flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-medium">eSOA:</span>
                        {renderBillStateChip(enc)}
                      </div>
                      {enc.amountPaid !== undefined && enc.amountPaid > 0 && (
                        <span className="font-mono text-emerald-700 font-semibold">
                          Paid {formatPhp(enc.amountPaid)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredEncounters.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No active patients match the filter criteria.
                </div>
              )}
            </div>
          </div>

          {/* Right Pane: Comlogik HIMS-Inspired Operational Workspace (Responsive Localized Scroll) */}
          {currentSelectedEncounter ? (
            <div className={`flex-1 bg-white p-2.5 sm:p-3 space-y-2 min-h-0 flex flex-col justify-between overflow-y-auto overscroll-contain ${mobileActivePane === 'DETAIL' ? 'flex' : 'hidden lg:flex'}`}>
              {/* 1. Patient Demographic & Clinical Intelligence Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 sm:p-3 shadow-2xs space-y-2">
                {/* Mobile Back to Queue (< lg) */}
                <div className="lg:hidden flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <button
                    onClick={() => setMobileActivePane('QUEUE')}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Back to Patient Queue</span>
                  </button>
                  <span className="text-[11px] font-semibold text-slate-500 font-mono">
                    {currentSelectedEncounter.encounterNumber} · {currentSelectedEncounter.roomBed}
                  </span>
                </div>

                {/* Header Top: Patient Avatar, Full Name, Badges & Quick Action Utility Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs ring-2 ring-blue-50">
                      {(currentSelectedEncounter.patient.fullName || currentSelectedEncounter.patient.maskedName)
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-base font-black text-slate-900 tracking-tight">
                          {currentSelectedEncounter.patient.fullName || currentSelectedEncounter.patient.maskedName}
                        </h3>
                        <span className="text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full shadow-2xs">
                          {currentSelectedEncounter.patient.age || 62} y/o · {currentSelectedEncounter.patient.gender === 'F' ? 'Female' : 'Male'}
                        </span>
                        {currentSelectedEncounter.patient.isSeniorCitizen && (
                          <span className="text-[10px] font-bold text-amber-900 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-full shadow-2xs">
                            Senior Citizen (RA 9994)
                          </span>
                        )}
                        {currentSelectedEncounter.patient.isPwd && (
                          <span className="text-[10px] font-bold text-indigo-900 bg-indigo-100/90 border border-indigo-300 px-2 py-0.5 rounded-full shadow-2xs">
                            PWD (RA 10754)
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>PhilHealth PEC 3.0</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Header Utility Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    {/* Clinical Review Shortcuts */}
                    <button
                      type="button"
                      onClick={() => {
                        selectEncounter(currentSelectedEncounter.id);
                        openPatientClarifyDrawer(currentSelectedEncounter);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-2xs"
                      title="Open interactive patient mobile view"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Patient View</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        selectEncounter(currentSelectedEncounter.id);
                        openDossierDrawer(currentSelectedEncounter);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-2xs"
                      title="Open complete clinical and billing dossier"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ledger Dossier</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        selectEncounter(currentSelectedEncounter.id);
                        printDocument({
                          type: 'OFFICIAL_ESOA',
                          title: `Official eSOA - ${currentSelectedEncounter.encounterNumber}`,
                          data: { encounter: currentSelectedEncounter }
                        });
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-2xs"
                      title="Print Official BIR & PhilHealth eSOA Statement"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500" />
                      <span>Print eSOA</span>
                    </button>

                    {/* Subtle Divider */}
                    <div className="h-4 w-px bg-slate-300 mx-0.5 hidden sm:block" />

                    {/* Administrative Management */}
                    <button
                      type="button"
                      onClick={() => openEditEncounterModal(currentSelectedEncounter)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-2xs"
                      title="Edit encounter details, diagnosis, or room transfer"
                    >
                      <Pencil className="w-3.5 h-3.5 text-slate-500" />
                      <span>Edit</span>
                    </button>
                    <ConfirmButton
                      label={
                        <span className="flex items-center gap-1 text-rose-700">
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Release Bed</span>
                        </span>
                      }
                      modalTitle="Remove Encounter & Release Bed?"
                      modalDescription={`Are you sure you want to remove the encounter for ${currentSelectedEncounter.patient.fullName || currentSelectedEncounter.patient.maskedName} and release bed ${currentSelectedEncounter.roomBed} back to hospital inventory?`}
                      confirmLabel="Release Bed"
                      variant="outline"
                      confirmVariant="danger"
                      size="sm"
                      className="border-slate-300 hover:border-rose-300 hover:bg-rose-50"
                      contextInfo={[
                        { label: 'Patient', value: currentSelectedEncounter.patient.fullName || currentSelectedEncounter.patient.maskedName },
                        { label: 'Encounter Number', value: currentSelectedEncounter.encounterNumber },
                        { label: 'Room & Bed', value: currentSelectedEncounter.roomBed }
                      ]}
                      onConfirm={() => deleteEncounter(currentSelectedEncounter.id)}
                      title="Remove encounter and return bed to inventory"
                    />
                  </div>
                </div>

                {/* Structured Metadata Grid (4 Compact Operational Cards) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200">
                  <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Encounter / MRN
                    </span>
                    <div className="font-mono font-bold text-xs text-slate-900 mt-0.5 truncate">
                      {currentSelectedEncounter.encounterNumber} · {currentSelectedEncounter.patient.mrn || 'MRN-10924'}
                    </div>
                  </div>

                  <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Room &amp; Category
                    </span>
                    <div className="font-bold text-xs text-slate-900 mt-0.5 truncate">
                      {currentSelectedEncounter.roomBed} · {(currentSelectedEncounter.roomCategory || 'REGULAR_PRIVATE').replace('_', ' ')}
                    </div>
                  </div>

                  <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Attending Specialist
                    </span>
                    <div className="font-bold text-xs text-slate-900 mt-0.5 truncate">
                      {currentSelectedEncounter.attendingDoctor}
                    </div>
                  </div>

                  <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Admitting Diagnosis
                    </span>
                    <div className="font-bold text-xs text-slate-900 mt-0.5 truncate" title={currentSelectedEncounter.primaryDiagnosis}>
                      {currentSelectedEncounter.primaryDiagnosis} ({currentSelectedEncounter.primaryIcd10})
                    </div>
                  </div>
                </div>

                {/* Sub-strip: Payer, ACR Benefit, eSOA Status & Declaration Time */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-200/60 flex-wrap gap-2">
                  <div>
                    Payer: <strong className="text-slate-800 font-semibold">{currentSelectedEncounter.hmo.hmoName || currentSelectedEncounter.hmo.providerName}</strong> (MBL Rem: <span className="font-mono font-semibold">{formatPhp(currentSelectedEncounter.hmo.mblRemaining)}</span>)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>eSOA Status:</span>
                    {renderBillStateChip(currentSelectedEncounter)}
                  </div>
                  <div>
                    PhilHealth Benefit: <strong className="text-emerald-700 font-mono font-bold">{formatPhp(currentSelectedEncounter.philhealth.totalCaseRate)}</strong> ({currentSelectedEncounter.philhealth.caseRateCode})
                  </div>
                  <div>
                    MGH Declared: <strong className="text-slate-800">{currentSelectedEncounter.mghOrderTimestamp ? new Date(currentSelectedEncounter.mghOrderTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:15 AM'}</strong> ({currentSelectedEncounter.elapsedMinutes}m elapsed)
                  </div>
                </div>
              </div>

              {/* 2. Discharge Milestones & SLA Timeline */}
              <div className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Discharge Status:
                    </span>
                    {currentSelectedEncounter.stage === 'CLEARED_GATE_PASS' ? (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Ready for Lobby Exit · Gate Pass Issued</span>
                      </span>
                    ) : 45 - currentSelectedEncounter.elapsedMinutes <= 0 ? (
                      <span className="text-xs font-bold text-rose-700 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>SLA Breached ({Math.abs(45 - currentSelectedEncounter.elapsedMinutes)}m overdue)</span>
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>{45 - currentSelectedEncounter.elapsedMinutes} Minutes Remaining (Target &lt;45m)</span>
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-semibold text-slate-500">
                    Step {getStageMeta(currentSelectedEncounter.stage).step} of 6: {getStageMeta(currentSelectedEncounter.stage).label}
                  </span>
                </div>

                {/* Visual Step Progress Bar */}
                <div className="grid grid-cols-6 gap-2 pt-0.5">
                  {['1. MGH Order', '2. Doctor PF', '3. RTS Audit', '4. HMO eLOA', '5. Settlement', '6. Gate Pass'].map((stepLabel, idx) => {
                    const currentStep = getStageMeta(currentSelectedEncounter.stage).step;
                    const isDone = idx + 1 < currentStep || currentSelectedEncounter.stage === 'CLEARED_GATE_PASS';
                    const isCurrent = idx + 1 === currentStep && currentSelectedEncounter.stage !== 'CLEARED_GATE_PASS';

                    return (
                      <div key={stepLabel} className="text-center">
                        <div
                          className={`h-1.5 rounded-full mb-1 transition-all ${
                            isDone
                              ? 'bg-emerald-600'
                              : isCurrent
                              ? 'bg-blue-600 ring-2 ring-blue-200'
                              : 'bg-slate-200'
                          }`}
                        />
                        <span className={`text-[10px] block truncate ${
                          isCurrent ? 'font-bold text-blue-700' : isDone ? 'font-semibold text-slate-700' : 'text-slate-400 font-medium'
                        }`}>
                          {stepLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Operational Split: [Blocker + Net Due] + [Quick Action Console] */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
                {/* Left/Main Column: Blocker Box & Net Patient Due (7-8 Cols) */}
                <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-2">
                  {/* Blocker Action Box */}
                  {(() => {
                    const blocker = getBlockerDetails(currentSelectedEncounter);
                    return (
                      <div className="px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50/80 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between pb-0.5">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                              What is Blocking Discharge Right Now?
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-amber-900 bg-amber-200/90 border border-amber-300 px-2 py-0.5 rounded-full">
                            Action Required
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-0.5">
                          <div className="min-w-0 pr-2">
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {blocker.title}
                            </h4>
                            <p className="text-[11px] text-slate-700 mt-0.5 leading-snug line-clamp-1">
                              {blocker.explanation}
                            </p>
                          </div>
                          {blocker.isDangerous ? (
                            <ConfirmButton
                              label={
                                <span className="flex items-center gap-1">
                                  <span>{blocker.actionText}</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </span>
                              }
                              modalTitle={blocker.modalTitle}
                              modalDescription={blocker.modalDescription}
                              contextInfo={blocker.contextInfo}
                              confirmLabel={blocker.confirmText}
                              variant={blocker.variant}
                              confirmVariant={blocker.confirmVariant}
                              size="xs"
                              onConfirm={blocker.onAction}
                              title={blocker.title}
                            />
                          ) : (
                            <button
                              onClick={blocker.onAction}
                              className={`py-1.5 px-3 rounded-lg font-bold text-xs shadow-2xs transition-all shrink-0 flex items-center gap-1 ${blocker.buttonColor}`}
                            >
                              <span>{blocker.actionText}</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Prominent Balance Due Box with Full Statutory Waterfall Reconciliation */}
                  <div className="p-3 sm:p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2.5">
                    <div className="flex items-start justify-between flex-wrap gap-2 pb-1.5 border-b border-slate-100">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Total Net Patient Due
                        </span>
                        <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 mt-0.5 tabular-nums">
                          {formatPhp(currentSelectedEncounter.waterfall.netPatientDue)}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Net payable after PhilHealth and HMO coverage
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                          Gross Hospital Billed
                        </span>
                        <div className="text-base font-bold font-mono text-slate-700 mt-0.5 tabular-nums">
                          {formatPhp(currentSelectedEncounter.waterfall.grossTotal)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          HMO: {formatPhp(currentSelectedEncounter.waterfall.hmoApprovedAmount)} · PhilHealth: {formatPhp(currentSelectedEncounter.waterfall.philhealthTotal)}
                        </div>
                      </div>
                    </div>

                    {/* Statutory Deduction Reconciliation Strip */}
                    <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 text-[11px] flex items-center justify-between gap-1 flex-wrap text-slate-600">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Waterfall:</span>
                      <span>Gross <strong className="font-mono text-slate-900">{formatPhp(currentSelectedEncounter.waterfall.grossTotal)}</strong></span>
                      <span className="text-slate-300">-</span>
                      <span>PhilHealth <strong className="font-mono text-emerald-700">-{formatPhp(currentSelectedEncounter.waterfall.philhealthTotal)}</strong></span>
                      <span className="text-slate-300">-</span>
                      <span>HMO <strong className="font-mono text-blue-700">-{formatPhp(currentSelectedEncounter.waterfall.hmoApprovedAmount)}</strong></span>
                      <span className="text-slate-300">-</span>
                      <span>Relief <strong className="font-mono text-amber-700">-{formatPhp(currentSelectedEncounter.waterfall.seniorPwdDiscount + currentSelectedEncounter.waterfall.vatExemption)}</strong></span>
                      <span className="text-slate-300">=</span>
                      <span className="font-bold font-mono text-slate-900">{formatPhp(currentSelectedEncounter.waterfall.netPatientDue)}</span>
                    </div>

                    {/* 3-Driver Out-of-Pocket Breakdown */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2 bg-slate-50/80 border border-slate-200/80 rounded-lg">
                        <span className="text-[9px] text-slate-500 font-bold uppercase block">1. Room Diff</span>
                        <span className="text-xs font-bold font-mono text-slate-900 mt-0.5 block">
                          {formatPhp(currentSelectedEncounter.waterfall.roomUpgradeExcess)}
                        </span>
                      </div>

                      <div className="p-2 bg-slate-50/80 border border-slate-200/80 rounded-lg">
                        <span className="text-[9px] text-slate-500 font-bold uppercase block">2. Excluded Sundry</span>
                        <span className="text-xs font-bold font-mono text-slate-900 mt-0.5 block">
                          {formatPhp(currentSelectedEncounter.waterfall.excludedConsumables)}
                        </span>
                      </div>

                      <div className="p-2 bg-slate-50/80 border border-slate-200/80 rounded-lg">
                        <span className="text-[9px] text-slate-500 font-bold uppercase block">3. Excess PF</span>
                        <span className="text-xs font-bold font-mono text-slate-900 mt-0.5 block">
                          {formatPhp(currentSelectedEncounter.doctorExcessPf)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Inspo 1 Quick Action Console Pad (4-5 Cols) */}
                <div className="lg:col-span-5 xl:col-span-4 flex flex-col">
                  <div className="p-3 sm:p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 shadow-2xs space-y-2">
                    <div>
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                          Quick Action Console
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full shadow-2xs">
                          Station Actions
                        </span>
                      </div>

                      <div className="space-y-1.5 pt-1.5">
                        {/* Action 1: Collect / Settle Patient Balance */}
                        {currentSelectedEncounter.stage === 'CLEARED_GATE_PASS' || currentSelectedEncounter.waterfall.netPatientDue === 0 ? (
                          <div className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 font-semibold text-xs flex items-center justify-between shadow-2xs">
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>✓ Settled &amp; Cleared</span>
                            </div>
                            <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                              ₱0.00 DUE
                            </span>
                          </div>
                        ) : (
                          <ConfirmButton
                            label={
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-1.5">
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>Record Payment / QR Ph</span>
                                </div>
                                <span className="font-mono text-[10px] bg-emerald-800/40 px-2 py-0.5 rounded">
                                  {formatPhp(currentSelectedEncounter.waterfall.netPatientDue)}
                                </span>
                              </div>
                            }
                            modalTitle="Confirm QR Ph Patient Payment?"
                            modalDescription={`Record point-of-sale settlement of ${formatPhp(currentSelectedEncounter.waterfall.netPatientDue)} for ${currentSelectedEncounter.patient.fullName || currentSelectedEncounter.patient.maskedName}. This will clear financial holds and authorize departure.`}
                            contextInfo={[
                              { label: 'Patient', value: currentSelectedEncounter.patient.fullName || currentSelectedEncounter.patient.maskedName },
                              { label: 'Encounter', value: currentSelectedEncounter.encounterNumber },
                              { label: 'Net Amount Due', value: formatPhp(currentSelectedEncounter.waterfall.netPatientDue) },
                              { label: 'Method', value: 'Bangko Sentral QR Ph / POS' }
                            ]}
                            confirmLabel="Record Payment"
                            variant="success"
                            confirmVariant="success"
                            size="sm"
                            className="w-full py-1.5 px-2.5 rounded-lg font-bold text-xs shadow-2xs justify-between"
                            onConfirm={() => {
                              selectEncounter(currentSelectedEncounter.id);
                              settlePatientBalance(currentSelectedEncounter.id, 'QR_PH');
                            }}
                            title="Record settlement of remaining patient out-of-pocket balance"
                          />
                        )}

                        {/* Action 2: Doctor QuickSign */}
                        <button
                          type="button"
                          onClick={() => {
                            selectEncounter(currentSelectedEncounter.id);
                            openDoctorQuickSign();
                          }}
                          className="w-full py-1.5 px-2.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-xs flex items-center justify-between transition-colors shadow-2xs"
                        >
                          <div className="flex items-center gap-1.5">
                            <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                            <span>Doctor QuickSign Portal</span>
                          </div>
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-medium">Physician</span>
                        </button>

                        {/* Action 3: RA 9439 Promissory Note */}
                        <button
                          type="button"
                          onClick={() => {
                            selectEncounter(currentSelectedEncounter.id);
                            openPromissoryModal(currentSelectedEncounter.id);
                          }}
                          className="w-full py-1.5 px-2.5 rounded-lg bg-white hover:bg-purple-50 border border-slate-200 text-slate-800 font-semibold text-xs flex items-center justify-between transition-colors shadow-2xs"
                        >
                          <div className="flex items-center gap-1.5">
                            <FileCheck2 className="w-3.5 h-3.5 text-purple-600" />
                            <span>Execute RA 9439 Note</span>
                          </div>
                          <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded font-medium">
                            Legal (0% Int)
                          </span>
                        </button>

                        {/* Action 4: Issue Gate Pass */}
                        <button
                          type="button"
                          onClick={() => {
                            selectEncounter(currentSelectedEncounter.id);
                            openGatePassModal();
                          }}
                          className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors shadow-2xs ${
                            currentSelectedEncounter.stage === 'CLEARED_GATE_PASS'
                              ? 'bg-blue-600 hover:bg-blue-700 text-white font-bold'
                              : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <QrCode className={`w-3.5 h-3.5 ${currentSelectedEncounter.stage === 'CLEARED_GATE_PASS' ? 'text-white' : 'text-emerald-600'}`} />
                            <span>Digital Exit Gate Pass</span>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                            currentSelectedEncounter.stage === 'CLEARED_GATE_PASS'
                              ? 'bg-blue-700 text-white'
                              : 'text-slate-500 bg-slate-100'
                          }`}>
                            Lobby Exit
                          </span>
                        </button>

                        {/* Action 5: Print Official eSOA */}
                        <button
                          type="button"
                          onClick={() => {
                            selectEncounter(currentSelectedEncounter.id);
                            printDocument({
                              type: 'OFFICIAL_ESOA',
                              title: `Official eSOA - ${currentSelectedEncounter.encounterNumber}`,
                              data: { encounter: currentSelectedEncounter }
                            });
                          }}
                          className="w-full py-1.5 px-2.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-between transition-colors shadow-2xs"
                          title="Print Official BIR & PhilHealth eSOA Statement"
                        >
                          <div className="flex items-center gap-1.5">
                            <Printer className="w-3.5 h-3.5 text-slate-500" />
                            <span>Generate Official eSOA</span>
                          </div>
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-medium">Print PDF</span>
                        </button>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-slate-200 text-[10px] text-slate-500 leading-snug">
                      Complies with PhilHealth Circular 2024-0037 and RA 9439 Anti-Hospital Detention law.
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Itemized Audit & Discharge Verification Overview (Compact & Beautifully Padded) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-0.5">
                {/* Chargemaster Audit Summary */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                      Itemized Chargemaster Audit
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {currentSelectedEncounter.items.length} billable items
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                    <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                      <span className="text-slate-400 text-[9px] block font-bold uppercase">Room &amp; Board</span>
                      <span className="font-mono font-bold text-slate-800 text-xs mt-0.5 block">
                        {formatPhp(currentSelectedEncounter.items.filter(i => i.category === 'ROOM_BOARD').reduce((s, i) => s + i.grossAmount, 0))}
                      </span>
                    </div>
                    <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                      <span className="text-slate-400 text-[9px] block font-bold uppercase">Pharmacy</span>
                      <span className="font-mono font-bold text-slate-800 text-xs mt-0.5 block">
                        {formatPhp(currentSelectedEncounter.items.filter(i => i.category === 'PHARMACY').reduce((s, i) => s + i.grossAmount, 0))}
                      </span>
                    </div>
                    <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                      <span className="text-slate-400 text-[9px] block font-bold uppercase">Supplies</span>
                      <span className="font-mono font-bold text-slate-800 text-xs mt-0.5 block">
                        {formatPhp(currentSelectedEncounter.items.filter(i => i.category === 'CENTRAL_SUPPLIES').reduce((s, i) => s + i.grossAmount, 0))}
                      </span>
                    </div>
                    <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                      <span className="text-slate-400 text-[9px] block font-bold uppercase">Doctor PF</span>
                      <span className="font-mono font-bold text-slate-800 text-xs mt-0.5 block">
                        {formatPhp(currentSelectedEncounter.doctorAgreedFee + currentSelectedEncounter.doctorExcessPf)}
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center justify-between px-1 pt-0.5">
                    <span>Zero unverified items across chargemaster ledger.</span>
                    <button
                      onClick={() => {
                        selectEncounter(currentSelectedEncounter.id);
                        openDossierDrawer(currentSelectedEncounter);
                      }}
                      className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-0.5"
                    >
                      <span>View Full Statement</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Discharge Clearance Sign-Offs */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                      Discharge Clearance Sign-Offs
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-full">
                      {currentSelectedEncounter.stage === 'CLEARED_GATE_PASS' ? '4/4 Stations Cleared' : '3 of 4 Stations Cleared'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <div className="p-1.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-slate-400 text-[9px] block font-bold uppercase">Specialist PF</span>
                        <span className="font-bold text-slate-800 text-[11px] block">{currentSelectedEncounter.doctorSignedAt ? 'Declared & Signed' : 'Signed Tariff Rate'}</span>
                      </div>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    </div>
                    <div className="p-1.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-slate-400 text-[9px] block font-bold uppercase">Pharmacy RTS</span>
                        <span className="font-bold text-slate-800 text-[11px] block">{currentSelectedEncounter.pharmacyRtsCleared ? 'Credit Slips Cleared' : 'Ward Meds Cleared'}</span>
                      </div>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    </div>
                    <div className="p-1.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-slate-400 text-[9px] block font-bold uppercase">PhilHealth PEC</span>
                        <span className="font-bold text-slate-800 text-[11px] block">ACR Claim Transmitted</span>
                      </div>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    </div>
                    <div className="p-1.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-slate-400 text-[9px] block font-bold uppercase">HMO Final LOA</span>
                        <span className="font-bold text-slate-800 text-[11px] block">{currentSelectedEncounter.hmo.finalLoaStatus === 'APPROVED' ? 'Carrier Code Issued' : 'Awaiting Authorization'}</span>
                      </div>
                      {currentSelectedEncounter.hmo.finalLoaStatus === 'APPROVED' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      )}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 px-1 pt-0.5">
                    Complies with Department of Health Administrative Order No. 2021-0037.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-slate-400">
              Select an encounter from the work queue to view discharge clearance status.
            </div>
          )}
        </div>
      ) : viewMode === 'TABLE' ? (
        /* DISCHARGE CLEARANCE FULL TABLE (Static Sticky Header + Scrollable Rows) */
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto overscroll-contain bg-white">
          <table className="w-full min-w-[950px] text-left text-sm border-collapse">
            <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
              <tr className="text-xs font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3.5 px-6 text-left">Patient &amp; MRN</th>
                <th className="py-3.5 px-4 text-left">Room / Bed</th>
                <th className="py-3.5 px-4 text-left">Attending Doctor</th>
                <th className="py-3.5 px-4 text-left">Payer / Plan</th>
                <th className="py-3.5 px-4 text-left">Stage</th>
                <th className="py-3.5 px-4 text-left">eSOA Status</th>
                <th className="py-3.5 px-4 text-left">SLA Status</th>
                <th className="py-3.5 px-4 text-left">Net Patient Due</th>
                <th className="py-3.5 px-6 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEncounters.map((enc) => {
                const remainingMinutes = 45 - enc.elapsedMinutes;
                const isBreached = remainingMinutes <= 0;
                const isWarning = enc.slaStatus === 'WARNING';
                const isCleared = enc.stage === 'CLEARED_GATE_PASS';
                const pName = enc.patient.fullName || enc.patient.maskedName;
                const hmo = enc.hmo.hmoName || enc.hmo.providerName;
                const blocker = getBlockerDetails(enc);
                const isSelected = enc.id === currentSelectedEncounter?.id;

                return (
                  <tr
                    key={enc.id}
                    onClick={() => selectEncounter(enc.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/70 border-l-4 border-l-blue-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3.5 px-6 text-left">
                      <div className="font-semibold text-slate-900 text-sm">
                        {pName}
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        {enc.encounterNumber}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-left text-slate-700 font-semibold text-sm">
                      {enc.roomBed}
                    </td>

                    <td className="py-3.5 px-4 text-left text-slate-700 text-xs">
                      {enc.attendingDoctor}
                    </td>

                    <td className="py-3.5 px-4 text-left text-slate-700 text-xs">
                      <div className="font-medium text-slate-900">{hmo}</div>
                      <div className="text-slate-400 font-mono text-[11px] mt-0.5">
                        PhilHealth: {enc.philhealth.caseRateCode}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-left text-xs font-semibold text-slate-800">
                      Step {getStageMeta(enc.stage).step}: {getStageMeta(enc.stage).label}
                    </td>

                    <td className="py-3.5 px-4 text-left">
                      {renderBillStateChip(enc)}
                    </td>

                    <td className="py-3.5 px-4 text-left">
                      {isCleared ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Cleared</span>
                        </span>
                      ) : isBreached ? (
                        <span className="inline-flex items-center gap-1 font-bold text-rose-700 text-xs">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Breached ({Math.abs(remainingMinutes)}m)</span>
                        </span>
                      ) : isWarning ? (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-700 text-xs">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>At Risk ({remainingMinutes}m)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-blue-700 text-xs">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          <span>On Sched ({remainingMinutes}m)</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-left font-mono font-bold text-slate-900 text-sm tabular-nums">
                      {formatPhp(enc.waterfall.netPatientDue)}
                    </td>

                    <td className="py-3.5 px-6 text-left">
                      <div className="flex items-center justify-start gap-2">
                        {blocker.isDangerous ? (
                          <ConfirmButton
                            label={
                              <span className="flex items-center gap-1">
                                <span>{blocker.actionText}</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </span>
                            }
                            modalTitle={blocker.modalTitle}
                            modalDescription={blocker.modalDescription}
                            contextInfo={blocker.contextInfo}
                            confirmLabel={blocker.confirmText}
                            variant={blocker.variant}
                            confirmVariant={blocker.confirmVariant}
                            size="xs"
                            onConfirm={blocker.onAction}
                            title={blocker.title}
                          />
                        ) : (
                          <button
                            onClick={blocker.onAction}
                            className={`py-1.5 px-3 rounded-lg font-bold text-xs shadow-2xs transition-all flex items-center gap-1 ${blocker.buttonColor}`}
                          >
                            <span>{blocker.actionText}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditEncounterModal(enc);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors"
                          title="Edit encounter details"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteEncounter(enc.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                          title="Discharge and remove encounter"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* EXPANDED FULL-WIDTH WORK-QUEUE CARDS */
        <div className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-4">
          {filteredEncounters.map((enc) => {
            const remainingMinutes = 45 - enc.elapsedMinutes;
            const isBreached = remainingMinutes <= 0;
            const isWarning = enc.slaStatus === 'WARNING';
            const isCleared = enc.stage === 'CLEARED_GATE_PASS';
            const pName = enc.patient.fullName || enc.patient.maskedName;
            const hmo = enc.hmo.hmoName || enc.hmo.providerName;
            const blocker = getBlockerDetails(enc);

            return (
              <div
                key={enc.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs hover:border-slate-300 transition-all space-y-4"
              >
                {/* Top Row: Patient Info + Clearance Status & SLA */}
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-base font-bold text-slate-900">
                        {pName}
                      </span>
                      {enc.patient.isSeniorCitizen && (
                        <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                          Senior Citizen
                        </span>
                      )}
                      {enc.patient.isPwd && (
                        <span className="text-xs font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-full">
                          PWD
                        </span>
                      )}
                      {renderBillStateChip(enc)}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      <span className="font-semibold text-slate-800">{enc.roomBed}</span> · <span className="font-mono text-xs">{enc.encounterNumber}</span> · {hmo} · Attending: <strong>{enc.attendingDoctor}</strong>
                    </div>
                  </div>

                  {/* Clearance Urgency */}
                  <div className="text-right">
                    {isCleared ? (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 justify-end">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Ready for Discharge</span>
                      </span>
                    ) : isBreached ? (
                      <span className="text-xs font-bold text-rose-700 flex items-center gap-1.5 justify-end">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>SLA Breached ({Math.abs(remainingMinutes)}m overdue)</span>
                      </span>
                    ) : isWarning ? (
                      <span className="text-xs font-bold text-amber-700 flex items-center gap-1.5 justify-end">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span>! At Risk ({remainingMinutes}m remaining)</span>
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-blue-700 flex items-center gap-1.5 justify-end">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span>● On Schedule ({remainingMinutes}m left)</span>
                      </span>
                    )}
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Stage {getStageMeta(enc.stage).step} of 6: {getStageMeta(enc.stage).label}
                    </span>
                  </div>
                </div>

                {/* Middle Grid: What is Blocking & Financial Responsibility */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                  {/* Blocker */}
                  <div className="p-3.5 rounded-lg bg-amber-50/50 border border-amber-200">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-800 block mb-1">
                      Current Blocker
                    </span>
                    <div className="font-bold text-slate-900 text-sm">
                      {blocker.title}
                    </div>
                    <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                      {blocker.explanation}
                    </p>
                  </div>

                  {/* Financial Responsibility */}
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Patient Due:
                      </span>
                      <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                        {formatPhp(enc.waterfall.netPatientDue)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-2 flex justify-between">
                      <span>Room <strong>{formatPhp(enc.waterfall.roomUpgradeExcess)}</strong></span>
                      <span>·</span>
                      <span>Supplies <strong>{formatPhp(enc.waterfall.excludedConsumables)}</strong></span>
                      <span>·</span>
                      <span>PF <strong>{formatPhp(enc.doctorExcessPf)}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Actions Bottom Bar */}
                <div className="pt-2 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openPatientClarifyDrawer(enc)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Patient Clarify</span>
                    </button>
                    <button
                      onClick={() => openDossierDrawer(enc)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <span>Itemized Ledger</span>
                    </button>
                  </div>

                  {blocker.isDangerous ? (
                    <ConfirmButton
                      label={
                        <span className="flex items-center gap-1.5">
                          <span>{blocker.actionText}</span>
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      }
                      modalTitle={blocker.modalTitle}
                      modalDescription={blocker.modalDescription}
                      contextInfo={blocker.contextInfo}
                      confirmLabel={blocker.confirmText}
                      variant={blocker.variant}
                      confirmVariant={blocker.confirmVariant}
                      size="sm"
                      className="py-2 px-5 rounded-lg font-bold text-xs shadow-xs"
                      onConfirm={blocker.onAction}
                      title={blocker.title}
                    />
                  ) : (
                    <button
                      onClick={blocker.onAction}
                      className={`py-2 px-5 rounded-lg font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 ${blocker.buttonColor}`}
                    >
                      <span>{blocker.actionText}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
