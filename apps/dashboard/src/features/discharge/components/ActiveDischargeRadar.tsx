import { matchesEncounterSearch } from '@/utils/encounterSearch';
import React, { useState, useRef, useEffect } from 'react';
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
  Columns,
  Table,
  List,
  Printer,
  FileCheck2,
  UserPlus,
  Pencil,
  Trash2,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Scale,
  ArrowRight
} from 'lucide-react';
import { ConfirmButton, Button, IconButton, SegmentedTabs } from '@/components/common';

export const ActiveDischargeRadar: React.FC = () => {
  const { searchQuery,
    encounters,
    selectedEncounterId,
    selectEncounter,
    openDossierDrawer,
    openDoctorQuickSign,
    openPromissoryModal,
    openGatePassModal,
    issueDigitalGatePass,
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

  const filterQuery = searchQuery;
  const [viewMode, setViewMode] = useState<'MASTER_DETAIL' | 'TABLE' | 'CARD_LIST'>('MASTER_DETAIL');
  const [isQueueCollapsed, setIsQueueCollapsed] = useState(false);
  const [mobileActivePane, setMobileActivePane] = useState<'QUEUE' | 'DETAIL'>('QUEUE');
  const [activeDetailTab, setActiveDetailTab] = useState<'CLEARANCE' | 'CHARGES' | 'TIMELINE'>('CLEARANCE');
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);
  const moreActionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreActionsRef.current && !moreActionsRef.current.contains(e.target as Node)) {
        setIsMoreActionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      return matchName || matchRoom || matchDoctor || matchHmo || matchDiag || matchesEncounterSearch(enc,filterQuery);
    }
    return true;
  });

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
        <span className="inline-flex items-center gap-1 font-semibold text-teal-700 text-[11px]">
          <span>RA 9439 Promissory Active</span>
        </span>
      );
    }
    switch (enc.billState) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 text-[11px]">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Settled &amp; Cleared</span>
          </span>
        );
      case 'PARTIALLY_PAID':
        return (
          <span className="inline-flex items-center gap-1 font-semibold text-amber-700 text-[11px]">
            <span>Partially Paid</span>
          </span>
        );
      case 'DISPUTED':
        return (
          <span className="inline-flex items-center gap-1 font-semibold text-rose-700 text-[11px]">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            <span>Contested Items</span>
          </span>
        );
      case 'VIEWED':
        return (
          <span className="inline-flex items-center gap-1 font-semibold text-purple-700 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
            <span>Viewed by Guarantor</span>
          </span>
        );
      case 'SENT_TO_PATIENT':
        return (
          <span className="inline-flex items-center gap-1 font-medium text-blue-700 text-[11px]">
            <span>eSOA Transmitted</span>
          </span>
        );
      case 'FINALIZED':
        return (
          <span className="inline-flex items-center gap-1 font-medium text-slate-700 text-[11px]">
            <span>Bill Finalized</span>
          </span>
        );
      case 'DRAFT':
      default:
        return (
          <span className="inline-flex items-center gap-1 font-medium text-slate-500 text-[11px]">
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
            return applyAccreditedCeiling(enc.id);
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
            return clearPharmacyRts(enc.id);
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
            return approveHmoFinalLoa(enc.id);
          }
        };
      case 'PENDING_SETTLEMENT': {
        const remaining = enc.remainingBalance !== undefined ? enc.remainingBalance : enc.waterfall.netPatientDue;
        if (remaining <= 0) {
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
              return issueDigitalGatePass(enc.id);
            }
          };
        }
        return {
          title: 'Patient Out-of-Pocket Balance Settlement',
          explanation: `Net patient due of ${formatPhp(remaining)} requires settlement at cashier or via QR Ph digital POS.`,
          actionType: 'settlement',
          actionText: 'Collect via QR Ph / POS',
          confirmText: 'Record Payment',
          modalTitle: 'Confirm QR Ph Patient Payment?',
          modalDescription: `Record point-of-sale settlement of ${formatPhp(remaining)} for ${pName}. This clears all financial holds.`,
          contextInfo: [
            { label: 'Patient', value: pName },
            { label: 'Net Due', value: formatPhp(remaining) },
            { label: 'Channel', value: 'QR Ph / POS' }
          ],
          isDangerous: true,
          variant: 'success' as const,
          confirmVariant: 'success' as const,
          buttonColor: 'bg-emerald-600 hover:bg-emerald-700 text-white',
          onAction: (e?: React.MouseEvent) => {
            if (e) e.stopPropagation();
            selectEncounter(enc.id);
            return settlePatientBalance(enc.id, 'QR_PH');
          }
        };
      }
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

  const renderContextualPrimaryAction = (enc: Encounter) => {
    const pName = enc.patient.fullName || enc.patient.maskedName;
    const blocker = getBlockerDetails(enc);

    // 1. Cleared Stage
    if (enc.stage === 'CLEARED_GATE_PASS') {
      return (
        <Button
          size="sm"
          variant="success"
          icon={QrCode}
          onClick={() => {
            selectEncounter(enc.id);
            openGatePassModal();
          }}
          className="w-full sm:w-auto"
        >
          View Digital Exit Gate Pass
        </Button>
      );
    }

    // 2. Doctor PF pending
    if (enc.stage === 'DOCTOR_PF_PENDING' || !enc.doctorSignedAt) {
      return (
        <Button
          size="sm"
          variant="primary"
          icon={Stethoscope}
          onClick={() => {
            selectEncounter(enc.id);
            openDoctorQuickSign();
          }}
          className="w-full sm:w-auto"
        >
          Doctor QuickSign Portal
        </Button>
      );
    }

    // 3. Pharmacy RTS or HMO LOA blocker
    if (enc.stage === 'PHARMACY_RTS_AUDIT' || enc.stage === 'HMO_FINAL_LOA') {
      if (blocker.isDangerous) {
        return (
          <ConfirmButton
            label={
              <span className="flex items-center gap-1.5 font-bold text-xs">
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
            size="sm"
            className={`w-full sm:w-auto px-4 py-2 rounded-lg font-bold text-xs shadow-xs ${blocker.buttonColor}`}
            onConfirm={blocker.onAction}
            title={blocker.title}
          />
        );
      }
    }

    // 4. Out-of-pocket settlement
    const balanceDue = enc.remainingBalance !== undefined ? enc.remainingBalance : enc.waterfall.netPatientDue;
    if (balanceDue > 0) {
      return (
        <ConfirmButton
          label={
            <div className="flex items-center gap-2 font-bold text-xs">
              <CreditCard className="w-4 h-4" />
              <span>Record Settlement / QR Ph ({formatPhp(balanceDue)})</span>
            </div>
          }
          modalTitle="Confirm QR Ph Patient Payment?"
          modalDescription={`Record point-of-sale settlement of ${formatPhp(balanceDue)} for ${pName}. This clears all financial holds and authorizes departure.`}
          contextInfo={[
            { label: 'Patient', value: pName },
            { label: 'Encounter', value: enc.encounterNumber },
            { label: 'Net Amount Due', value: formatPhp(balanceDue) },
            { label: 'Channel', value: 'QR Ph / POS' }
          ]}
          confirmLabel="Record Payment"
          variant="success"
          confirmVariant="success"
          size="sm"
          className="w-full sm:w-auto px-4 py-2 rounded-lg font-bold text-xs shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          onConfirm={() => {
            selectEncounter(enc.id);
            return settlePatientBalance(enc.id, 'QR_PH');
          }}
          title="Record settlement of remaining patient out-of-pocket balance"
        />
      );
    }

    if(enc.stage==='PENDING_SETTLEMENT'&&Number(enc.remainingBalance)===0)return <ConfirmButton size="sm" variant="success" label="Release Digital Gate Pass" modalTitle="Release hospital discharge pass?" modalDescription="All discharge checks are complete and no patient balance remains." confirmLabel="Release Gate Pass" onConfirm={()=>issueDigitalGatePass(enc.id)}/>;

    // 5. Default
    return (
      <Button
        size="sm"
        variant="primary"
        icon={QrCode}
        onClick={() => {
          selectEncounter(enc.id);
          openGatePassModal();
        }}
        className="w-full sm:w-auto"
      >
        Authorize Lobby Exit Gate Pass
      </Button>
    );
  };

  const warningCount = encounters.filter((e) => e.slaStatus === 'WARNING').length;
  const breachCount = encounters.filter((e) => e.slaStatus === 'BREACH').length;

  const filterTabs = [
    { id: 'ALL', label: 'All', badge: encounters.length },
    { id: 'WARNING', label: 'At Risk', badge: warningCount, badgeVariant: 'amber' as const },
    { id: 'BREACH', label: 'Breached', badge: breachCount, badgeVariant: 'rose' as const },
    { id: 'DISPUTED', label: 'Disputed' }
  ];

  const viewModeTabs = [
    { id: 'MASTER_DETAIL', label: 'Workspace', icon: Columns },
    { id: 'TABLE', label: 'Table', icon: Table },
    { id: 'CARD_LIST', label: 'Cards', icon: List }
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
      {/* Subheader: Queue Toggle/Header, Search, Admit Inpatient on Left; Filters & View Mode on Right */}
      <div className="px-4 sm:px-6 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs">
        {/* Left Section: Queue Header/Toggle + Search Input + Admit Inpatient Button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Patient Queue Header & Collapse Toggle */}
          <Button
            size="md"
            variant="secondary"
            icon={isQueueCollapsed ? PanelLeftOpen : PanelLeftClose}
            onClick={() => setIsQueueCollapsed((prev) => !prev)}
            title={isQueueCollapsed ? 'Expand Patient Queue' : 'Collapse Patient Queue to expand workspace'}
          >
            <span>{isQueueCollapsed ? 'Show Queue' : 'Patient Queue'}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              isQueueCollapsed ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'
            }`}>
              {filteredEncounters.length}
            </span>
          </Button>

          {/* Divider */}
          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          {/* Search Input: Equal Height h-9 */}


          {/* Admit Inpatient Button: Equal Height h-9 */}
          <Button
            size="md"
            variant="primary"
            icon={UserPlus}
            onClick={openAdmitPatientModal}
            title="Admit new patient and allocate hospital bed"
          >
            + Admit Inpatient
          </Button>
        </div>

        {/* Right Section: Filter Pills & View Mode Switcher */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Filter Pills */}
          <SegmentedTabs
            size="md"
            items={filterTabs}
            activeId={activeFilter}
            onChange={(id) => setActiveFilter(id as any)}
          />

          {/* Divider */}
          <div className="h-5 w-px bg-slate-200 hidden md:block" />

          {/* View Mode Toggle */}
          <div className="hidden md:block">
            <SegmentedTabs
              size="md"
              items={viewModeTabs}
              activeId={viewMode}
              onChange={(id) => setViewMode(id as any)}
            />
          </div>
        </div>
      </div>

      {/* Main Workspace Body */}
      {viewMode === 'MASTER_DETAIL' ? (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          {/* Mobile Segmented Pane Switcher (< lg) */}
          <div className="lg:hidden p-2 bg-slate-100 border-b border-slate-200 shrink-0">
            <SegmentedTabs
              size="sm"
              fullWidth
              items={[
                { id: 'QUEUE', label: `Patient Queue (${filteredEncounters.length})` },
                { id: 'DETAIL', label: `Patient Detail (${currentSelectedEncounter?.patient.maskedName || 'None'})` }
              ]}
              activeId={mobileActivePane}
              onChange={(id) => setMobileActivePane(id as any)}
            />
          </div>

          {/* Left Pane: The Operational Work Queue (Top-aligned, collapsible) */}
          <div className={`w-full lg:w-80 xl:w-[320px] border-r border-slate-200 bg-white flex flex-col min-h-0 shrink-0 ${isQueueCollapsed ? 'hidden' : (mobileActivePane === 'QUEUE' ? 'flex' : 'hidden lg:flex')}`}>
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
                    className={`px-3 py-2.5 cursor-pointer transition-all border-l-4 ${
                      isSelected
                        ? 'bg-blue-50/70 border-l-blue-600 shadow-2xs'
                        : 'border-l-transparent hover:bg-slate-50'
                    }`}
                  >
                    {/* Top Line: Name + Net Due */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-semibold text-xs sm:text-sm text-slate-900 leading-snug truncate block">
                          {pName}
                        </span>
                        {/* 1-Badge Rule: Plain text demographics instead of multi-colored pill clutter */}
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate font-normal">
                          <span className="font-semibold text-slate-700">{enc.roomBed}</span> · {enc.patient.age || 62} y/o {enc.patient.gender === 'F' ? 'F' : 'M'}{enc.patient.isSeniorCitizen ? ' · SC' : ''}{enc.patient.isPwd ? ' · PWD' : ''} · {hmo}
                        </div>
                      </div>

                      {/* Net Due */}
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-xs sm:text-sm text-slate-900 tabular-nums">
                          {formatPhp(enc.stage === 'CLEARED_GATE_PASS' ? 0 : (enc.remainingBalance !== undefined ? enc.remainingBalance : enc.waterfall.netPatientDue))}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium uppercase">
                          {enc.stage === 'CLEARED_GATE_PASS' || (enc.remainingBalance !== undefined && enc.remainingBalance <= 0) ? 'Settled' : 'Net Due'}
                        </div>
                      </div>
                    </div>

                    {/* Middle Line: The Single Operational Badge + Blocker Plain Text */}
                    <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      {isCleared ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Ready for Exit</span>
                        </span>
                      ) : isBreached ? (
                        <span className="inline-flex items-center gap-1 font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full text-[10px] border border-rose-200">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>SLA Breached ({Math.abs(remainingMinutes)}m)</span>
                        </span>
                      ) : isWarning ? (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full text-[10px] border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>At Risk ({remainingMinutes}m)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full text-[10px] border border-blue-200">
                          <Clock className="w-3 h-3 text-blue-600" />
                          <span>On Sched ({remainingMinutes}m)</span>
                        </span>
                      )}

                      <span className="text-[11px] text-slate-500 truncate max-w-[140px] font-medium text-right">
                        {blocker.actionText}
                      </span>
                    </div>

                    {/* Bottom Line: Plain text eSOA lifecycle */}
                    <div className="mt-1.5 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1 text-slate-400">
                        <span>eSOA:</span>
                        {renderBillStateChip(enc)}
                      </div>
                      {enc.amountPaid !== undefined && enc.amountPaid > 0 && (
                        <span className="font-mono text-emerald-700 font-semibold text-[11px]">
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

          {/* Right Pane: Pinned Detail Header + Zero-Scroll Tabbed Body */}
          {currentSelectedEncounter ? (
            <div className={`flex-1 bg-white min-h-0 flex flex-col overflow-hidden ${isQueueCollapsed ? 'flex' : (mobileActivePane === 'DETAIL' ? 'flex' : 'hidden lg:flex')}`}>
              {/* PINNED HEADER: Demographics, Balance Due & Single Contextual Primary Action */}
              <div className="p-3 sm:p-4 bg-slate-50/90 border-b border-slate-200 shrink-0 space-y-3">
                {/* Mobile Back to Queue (< lg) */}
                <div className="lg:hidden flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={ChevronLeft}
                    onClick={() => setMobileActivePane('QUEUE')}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Back to Patient Queue
                  </Button>
                  <span className="text-[11px] font-semibold text-slate-500 font-mono">
                    {currentSelectedEncounter.encounterNumber} · {currentSelectedEncounter.roomBed}
                  </span>
                </div>

                {/* Patient Top Row: Avatar, Name, Demographics, Net Due & Primary Action */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs ring-2 ring-blue-50">
                      {(currentSelectedEncounter.patient.fullName || currentSelectedEncounter.patient.maskedName)
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                          {currentSelectedEncounter.patient.fullName || currentSelectedEncounter.patient.maskedName}
                        </h3>
                        <span className="text-xs text-slate-500 font-medium">
                          {currentSelectedEncounter.patient.age || 62} y/o {currentSelectedEncounter.patient.gender === 'F' ? 'Female' : 'Male'}
                          {currentSelectedEncounter.patient.isSeniorCitizen ? ' · Senior Citizen (RA 9994)' : ''}
                          {currentSelectedEncounter.patient.isPwd ? ' · PWD (RA 10754)' : ''}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5 truncate">
                        <strong className="text-slate-800">{currentSelectedEncounter.roomBed}</strong> · MRN: <span className="font-mono">{currentSelectedEncounter.encounterNumber}</span> · Dr. {currentSelectedEncounter.attendingDoctor} · {currentSelectedEncounter.primaryDiagnosis}
                      </div>
                    </div>
                  </div>

                  {/* Financial Due & Single Contextual Primary Action CTA + More Actions Menu */}
                  <div className="flex items-center gap-3 shrink-0 flex-wrap">
                    <div className="text-right pr-2 border-r border-slate-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        {currentSelectedEncounter.stage === 'CLEARED_GATE_PASS' || (currentSelectedEncounter.remainingBalance !== undefined && currentSelectedEncounter.remainingBalance <= 0) ? 'Remaining Due (Settled)' : 'Net Patient Due'}
                      </span>
                      <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 tabular-nums">
                        {formatPhp(currentSelectedEncounter.stage === 'CLEARED_GATE_PASS' ? 0 : (currentSelectedEncounter.remainingBalance !== undefined ? currentSelectedEncounter.remainingBalance : currentSelectedEncounter.waterfall.netPatientDue))}
                      </div>
                    </div>

                    {/* Single Contextual Primary Action CTA */}
                    {renderContextualPrimaryAction(currentSelectedEncounter)}

                    {/* [••• More Actions] Overflow Dropdown */}
                    <div className="relative" ref={moreActionsRef}>
                      <IconButton
                        size="sm"
                        variant="secondary"
                        icon={MoreHorizontal}
                        ariaLabel="More Actions"
                        onClick={() => setIsMoreActionsOpen(!isMoreActionsOpen)}
                      />

                      {isMoreActionsOpen && (
                        <div className="absolute right-0 mt-1.5 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1.5 text-xs text-slate-700 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                          <div className="py-1">
                            <button
                              type="button"
                              onClick={() => {
                                setIsMoreActionsOpen(false);
                                selectEncounter(currentSelectedEncounter.id);
                                openPromissoryModal(currentSelectedEncounter.id);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-purple-50 hover:text-purple-800 flex items-center gap-2 font-medium"
                            >
                              <FileCheck2 className="w-4 h-4 text-purple-600" />
                              <span>Execute RA 9439 Note</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsMoreActionsOpen(false);
                                selectEncounter(currentSelectedEncounter.id);
                                printDocument({
                                  type: 'OFFICIAL_ESOA',
                                  title: `Official eSOA - ${currentSelectedEncounter.encounterNumber}`,
                                  data: { encounter: currentSelectedEncounter }
                                });
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 font-medium"
                            >
                              <Printer className="w-4 h-4 text-slate-500" />
                              <span>Print Official eSOA</span>
                            </button>
                          </div>

                          <div className="py-1">
                            <button
                              type="button"
                              onClick={() => {
                                setIsMoreActionsOpen(false);
                                selectEncounter(currentSelectedEncounter.id);
                                openDossierDrawer(currentSelectedEncounter);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 font-medium"
                            >
                              <ExternalLink className="w-4 h-4 text-slate-500" />
                              <span>Full Ledger Dossier</span>
                            </button>
                          </div>

                          <div className="py-1">
                            <button
                              type="button"
                              onClick={() => {
                                setIsMoreActionsOpen(false);
                                openEditEncounterModal(currentSelectedEncounter);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 font-medium"
                            >
                              <Pencil className="w-4 h-4 text-slate-500" />
                              <span>Edit Encounter Details</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsMoreActionsOpen(false);
                                deleteEncounter(currentSelectedEncounter.id);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-rose-50 text-rose-600 flex items-center gap-2 font-medium"
                            >
                              <Trash2 className="w-4 h-4 text-rose-600" />
                              <span>Release Hospital Bed</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Sub-strip */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/70 flex-wrap gap-2">
                  <div>
                    Payer: <strong className="text-slate-800">{currentSelectedEncounter.hmo.hmoName || currentSelectedEncounter.hmo.providerName}</strong> (LOA: <span className="font-mono font-semibold">{formatPhp(currentSelectedEncounter.hmo.approvedAmount)}</span>)
                  </div>
                  <div>
                    PhilHealth: <strong className="text-emerald-700 font-mono font-semibold">{formatPhp(currentSelectedEncounter.philhealth.totalCaseRate)}</strong> ({currentSelectedEncounter.philhealth.caseRateCode})
                  </div>
                  <div>
                    MGH Declared: <strong className="text-slate-800">{currentSelectedEncounter.mghOrderTimestamp ? new Date(currentSelectedEncounter.mghOrderTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:15 AM'}</strong> ({currentSelectedEncounter.elapsedMinutes}m elapsed)
                  </div>
                </div>
              </div>

              {/* ZERO-SCROLL TABS NAVIGATION */}
              <div className="border-b border-slate-200 bg-white px-4 py-2 shrink-0">
                <SegmentedTabs
                  size="sm"
                  items={[
                    { id: 'CLEARANCE', label: 'Clearance & Sign-Offs' },
                    { id: 'CHARGES', label: 'Itemized Charges & Waterfall' },
                    { id: 'TIMELINE', label: 'Timeline & Compliance Logs' }
                  ]}
                  activeId={activeDetailTab}
                  onChange={(id) => setActiveDetailTab(id as any)}
                />
              </div>

              {/* TAB CONTENT AREA */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4">
                {activeDetailTab === 'CLEARANCE' && (
                  <div className="space-y-4">
                    {/* 6-Stage Milestone Progress Bar */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Discharge Clearance Milestone
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          Step {getStageMeta(currentSelectedEncounter.stage).step} of 6: {getStageMeta(currentSelectedEncounter.stage).label}
                        </span>
                      </div>

                      <div className="grid grid-cols-6 gap-2 pt-1">
                        {['1. MGH Order', '2. Doctor PF', '3. RTS Audit', '4. HMO eLOA', '5. Settlement', '6. Gate Pass'].map((stepLabel, idx) => {
                          const currentStep = getStageMeta(currentSelectedEncounter.stage).step;
                          const isDone = idx + 1 < currentStep || currentSelectedEncounter.stage === 'CLEARED_GATE_PASS';
                          const isCurrent = idx + 1 === currentStep && currentSelectedEncounter.stage !== 'CLEARED_GATE_PASS';

                          return (
                            <div key={stepLabel} className="text-center">
                              <div
                                className={`h-2 rounded-full mb-1 transition-all ${
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

                    {/* Blocker Action Box */}
                    {(() => {
                      const blocker = getBlockerDetails(currentSelectedEncounter);
                      return (
                        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/80 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between pb-1 border-b border-amber-200/80">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-700" />
                              <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                                Current Operational Blocker
                              </span>
                            </div>
                            <span className="text-[11px] font-bold text-amber-900 bg-amber-200/90 border border-amber-300 px-2 py-0.5 rounded-full">
                              Action Required
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-3 pt-1">
                            <div className="min-w-0 pr-2">
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                                {blocker.title}
                              </h4>
                              <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">
                                {blocker.explanation}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 4 Station Sign-Off Cards */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                          Mandatory Station Sign-Offs (DOH AO 2021-0037)
                        </span>
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                          {currentSelectedEncounter.stage === 'CLEARED_GATE_PASS' ? '4 of 4 Stations Cleared' : '3 of 4 Stations Cleared'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                              1. Attending Physician
                            </span>
                            <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                              {currentSelectedEncounter.doctorSignedAt ? 'Declared & Signed' : 'Signed Tariff Rate'}
                            </span>
                          </div>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                              2. Central Pharmacy RTS
                            </span>
                            <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                              {currentSelectedEncounter.pharmacyRtsCleared ? 'Credit Slips Cleared' : 'Ward Meds Cleared'}
                            </span>
                          </div>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                              3. PhilHealth Benefit
                            </span>
                            <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                              ACR Claim Transmitted (PEC 3.0)
                            </span>
                          </div>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                              4. HMO Authorization
                            </span>
                            <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                              {currentSelectedEncounter.hmo.finalLoaStatus === 'APPROVED' ? 'Carrier Code Issued' : 'Awaiting Authorization'}
                            </span>
                          </div>
                          {currentSelectedEncounter.hmo.finalLoaStatus === 'APPROVED' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Operational Turnaround Clock & SLA Benchmark */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            Discharge Turnaround Clock &amp; SLA Benchmark
                          </span>
                        </div>
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                            currentSelectedEncounter.stage === 'CLEARED_GATE_PASS'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 45 - currentSelectedEncounter.elapsedMinutes <= 0
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : currentSelectedEncounter.slaStatus === 'WARNING'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {currentSelectedEncounter.stage === 'CLEARED_GATE_PASS'
                            ? `Discharge Completed in ${currentSelectedEncounter.elapsedMinutes}m`
                            : 45 - currentSelectedEncounter.elapsedMinutes <= 0
                            ? `SLA Breached (${Math.abs(45 - currentSelectedEncounter.elapsedMinutes)}m Overdue)`
                            : currentSelectedEncounter.slaStatus === 'WARNING'
                            ? `At Risk (${45 - currentSelectedEncounter.elapsedMinutes}m Remaining)`
                            : `On Track (${45 - currentSelectedEncounter.elapsedMinutes}m Remaining)`}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                          <div
                            className={`h-full transition-all duration-300 ${
                              currentSelectedEncounter.stage === 'CLEARED_GATE_PASS'
                                ? 'bg-emerald-500'
                                : 45 - currentSelectedEncounter.elapsedMinutes <= 0
                                ? 'bg-rose-500'
                                : currentSelectedEncounter.slaStatus === 'WARNING'
                                ? 'bg-amber-500'
                                : 'bg-blue-500'
                            }`}
                            style={{
                              width: `${Math.min(100, Math.round((currentSelectedEncounter.elapsedMinutes / 45) * 100))}%`
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                          <span>Elapsed: <strong className="text-slate-800 font-mono">{currentSelectedEncounter.elapsedMinutes} mins</strong></span>
                          <span>Target Ceiling: <strong className="text-slate-800 font-mono">45 mins</strong> (DOH AO 2021-0037 Standard)</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">MGH Declaration</span>
                          <span className="font-semibold text-slate-800 mt-0.5 block">
                            {currentSelectedEncounter.mghOrderTimestamp
                              ? new Date(currentSelectedEncounter.mghOrderTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : '10:15 AM'} · Dr. {currentSelectedEncounter.attendingDoctor}
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Station Clearance Pace</span>
                          <span className="font-semibold text-slate-800 mt-0.5 block">
                            {currentSelectedEncounter.stage === 'CLEARED_GATE_PASS'
                              ? '100% Station Throughput'
                              : `${getStageMeta(currentSelectedEncounter.stage).step} of 6 Milestones Completed`}
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Average Queue SLA</span>
                          <span className="font-semibold text-slate-800 mt-0.5 block">
                            38.4m Median Discharge Pace
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Philippine Statutory Compliance & Legal Protections */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Scale className="w-4 h-4 text-purple-600" />
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            Philippine Statutory Compliance &amp; Consumer Protections
                          </span>
                        </div>
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Audit Verified</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* RA 9439 Anti-Hospital Detention Law */}
                        <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1.5 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-slate-900">RA 9439 Protection</span>
                              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                                Anti-Detention
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                              Prohibits patient detention for unpaid medical bills. Promissory notes guaranteed under statutory terms.
                            </p>
                          </div>
                          <div className="pt-2 border-t border-slate-200/80">
                            {currentSelectedEncounter.promissoryNote && currentSelectedEncounter.promissoryNote.status === 'ACTIVE' ? (
                              <span className="text-[11px] font-bold text-teal-700 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                                <span>Note Active ({currentSelectedEncounter.promissoryNote.installmentMonths} Mos)</span>
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                iconPosition="right"
                                icon={ArrowRight}
                                className="text-blue-600 hover:text-blue-800 p-0 h-auto font-bold text-[11px]"
                                onClick={() => openPromissoryModal(currentSelectedEncounter.id)}
                              >
                                Execute RA 9439 Note
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* RA 9994 / RA 10754 Senior & PWD Mandate */}
                        <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1.5 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-slate-900">RA 9994 / 10754 Mandate</span>
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                20% + VAT Exemption
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                              Senior / PWD 20% discount and 12% VAT exemption applied across all eligible medical consumables &amp; PF.
                            </p>
                          </div>
                          <div className="pt-2 border-t border-slate-200/80 text-[11px]">
                            {currentSelectedEncounter.patient.isSeniorCitizen || currentSelectedEncounter.patient.isPwd ? (
                              <span className="font-semibold text-emerald-700 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Relief: {formatPhp(currentSelectedEncounter.waterfall.seniorPwdDiscount + currentSelectedEncounter.waterfall.vatExemption)}</span>
                              </span>
                            ) : (
                              <span className="text-slate-500 font-medium">Standard Tariff (Non-SC/PWD)</span>
                            )}
                          </div>
                        </div>

                        {/* PhilHealth Circular 2024-0037 */}
                        <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1.5 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-slate-900">PhilHealth Deduction Hierarchy</span>
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                Circular 2024-0037
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                              PhilHealth benefit deducted prior to HMO adjudication to prevent patient co-pay overcharges.
                            </p>
                          </div>
                          <div className="pt-2 border-t border-slate-200/80 text-[11px]">
                            <span className="font-mono font-bold text-slate-800">
                              {currentSelectedEncounter.philhealth.caseRateCode} · {formatPhp(currentSelectedEncounter.philhealth.totalCaseRate)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Financial Reconciliation & Out-of-Pocket Cost Drivers Snapshot */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            Financial Reconciliation &amp; Out-of-Pocket Drivers
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          iconPosition="right"
                          icon={ArrowRight}
                          className="text-blue-600 hover:text-blue-800 font-bold text-xs"
                          onClick={() => setActiveDetailTab('CHARGES')}
                        >
                          View Full Itemized Statement ({currentSelectedEncounter.items.length} items)
                        </Button>
                      </div>

                      {/* Formula strip */}
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs flex items-center justify-between gap-2 flex-wrap text-slate-700">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Waterfall:</span>
                        <span>Gross <strong className="font-mono text-slate-900">{formatPhp(currentSelectedEncounter.waterfall.grossTotal)}</strong></span>
                        <span className="text-slate-300">-</span>
                        <span>PhilHealth <strong className="font-mono text-emerald-700">-{formatPhp(currentSelectedEncounter.waterfall.philhealthTotal)}</strong></span>
                        <span className="text-slate-300">-</span>
                        <span>HMO <strong className="font-mono text-blue-700">-{formatPhp(currentSelectedEncounter.waterfall.hmoApprovedAmount)}</strong></span>
                        <span className="text-slate-300">-</span>
                        <span>Relief <strong className="font-mono text-amber-700">-{formatPhp(currentSelectedEncounter.waterfall.seniorPwdDiscount + currentSelectedEncounter.waterfall.vatExemption)}</strong></span>
                        <span className="text-slate-300">=</span>
                        <span className="font-bold font-mono text-slate-900 text-sm">{formatPhp(currentSelectedEncounter.waterfall.netPatientDue)}</span>
                      </div>

                      {/* 3 Out-of-pocket drivers */}
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">1. Room Difference</span>
                          <span className="text-xs sm:text-sm font-bold font-mono text-slate-900 mt-0.5 block">
                            {formatPhp(currentSelectedEncounter.waterfall.roomUpgradeExcess)}
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">2. Excluded Sundry</span>
                          <span className="text-xs sm:text-sm font-bold font-mono text-slate-900 mt-0.5 block">
                            {formatPhp(currentSelectedEncounter.waterfall.excludedConsumables)}
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">3. Excess Doctor PF</span>
                          <span className="text-xs sm:text-sm font-bold font-mono text-slate-900 mt-0.5 block">
                            {formatPhp(currentSelectedEncounter.doctorExcessPf)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeDetailTab === 'CHARGES' && (
                  <div className="space-y-4">
                    {/* Statutory Deduction Reconciliation Strip */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between gap-2 flex-wrap text-slate-700">
                      <span className="text-slate-500 font-bold uppercase tracking-wider text-[11px]">Formula:</span>
                      <span>Gross <strong className="font-mono text-slate-900">{formatPhp(currentSelectedEncounter.waterfall.grossTotal)}</strong></span>
                      <span className="text-slate-300">-</span>
                      <span>PhilHealth <strong className="font-mono text-emerald-700">-{formatPhp(currentSelectedEncounter.waterfall.philhealthTotal)}</strong></span>
                      <span className="text-slate-300">-</span>
                      <span>HMO <strong className="font-mono text-blue-700">-{formatPhp(currentSelectedEncounter.waterfall.hmoApprovedAmount)}</strong></span>
                      <span className="text-slate-300">-</span>
                      <span>Relief <strong className="font-mono text-amber-700">-{formatPhp(currentSelectedEncounter.waterfall.seniorPwdDiscount + currentSelectedEncounter.waterfall.vatExemption)}</strong></span>
                      <span className="text-slate-300">=</span>
                      <span className="font-bold font-mono text-slate-900 text-sm">{formatPhp(currentSelectedEncounter.waterfall.netPatientDue)}</span>
                    </div>

                    {/* 3-Driver Out-of-Pocket Breakdown */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-[11px] text-slate-500 font-bold uppercase block">1. Room Diff</span>
                        <span className="text-sm font-bold font-mono text-slate-900 mt-1 block">
                          {formatPhp(currentSelectedEncounter.waterfall.roomUpgradeExcess)}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-[11px] text-slate-500 font-bold uppercase block">2. Excluded Sundry</span>
                        <span className="text-sm font-bold font-mono text-slate-900 mt-1 block">
                          {formatPhp(currentSelectedEncounter.waterfall.excludedConsumables)}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-[11px] text-slate-500 font-bold uppercase block">3. Excess PF</span>
                        <span className="text-sm font-bold font-mono text-slate-900 mt-1 block">
                          {formatPhp(currentSelectedEncounter.doctorExcessPf)}
                        </span>
                      </div>
                    </div>

                    {/* Chargemaster Items Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-slate-400 text-[11px] block font-bold uppercase">Room &amp; Board</span>
                        <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">
                          {formatPhp(currentSelectedEncounter.items.filter(i => i.category === 'ROOM_BOARD').reduce((s, i) => s + i.grossAmount, 0))}
                        </span>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-slate-400 text-[11px] block font-bold uppercase">Pharmacy</span>
                        <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">
                          {formatPhp(currentSelectedEncounter.items.filter(i => i.category === 'PHARMACY').reduce((s, i) => s + i.grossAmount, 0))}
                        </span>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-slate-400 text-[11px] block font-bold uppercase">Supplies</span>
                        <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">
                          {formatPhp(currentSelectedEncounter.items.filter(i => i.category === 'CENTRAL_SUPPLIES').reduce((s, i) => s + i.grossAmount, 0))}
                        </span>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-slate-400 text-[11px] block font-bold uppercase">Doctor PF</span>
                        <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">
                          {formatPhp(currentSelectedEncounter.doctorAgreedFee + currentSelectedEncounter.doctorExcessPf)}
                        </span>
                      </div>
                    </div>

                    {/* Itemized Chargemaster Table */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                      <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                        <span>Encounter Chargemaster Items ({currentSelectedEncounter.items.length})</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          iconPosition="right"
                          icon={ExternalLink}
                          className="text-blue-600 hover:text-blue-800 text-xs font-semibold"
                          onClick={() => {
                            selectEncounter(currentSelectedEncounter.id);
                            openDossierDrawer(currentSelectedEncounter);
                          }}
                        >
                          Open Dossier Ledger
                        </Button>
                      </div>

                      <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                        {currentSelectedEncounter.items.map((item) => (
                          <div key={item.id} className="px-3.5 py-2 flex items-center justify-between text-xs">
                            <div className="min-w-0 pr-2">
                              <span className="font-semibold text-slate-900 truncate block">
                                {item.description}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {item.category.replace('_', ' ')} · Qty: {item.qty}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-mono font-bold text-slate-900 block">
                                {formatPhp(item.grossAmount)}
                              </span>
                              {item.patientOop > 0 && (
                                <span className="text-[11px] font-mono text-rose-600 block">
                                  OOP: {formatPhp(item.patientOop)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeDetailTab === 'TIMELINE' && (
                  <div className="space-y-4">
                    {/* Timestamp & SLA Metrics */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Operational Discharge Clock
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-slate-400 text-[11px] block font-bold uppercase">MGH Declaration</span>
                          <span className="font-semibold text-slate-800 mt-1 block">
                            {currentSelectedEncounter.mghOrderTimestamp ? new Date(currentSelectedEncounter.mghOrderTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:15 AM'}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-slate-400 text-[11px] block font-bold uppercase">Elapsed Turnaround</span>
                          <span className="font-bold text-slate-900 mt-1 block font-mono">
                            {currentSelectedEncounter.elapsedMinutes} mins
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-slate-400 text-[11px] block font-bold uppercase">SLA Target Limit</span>
                          <span className="font-semibold text-slate-800 mt-1 block">
                            45.0 mins (Standard)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Statutory Compliance Certifications */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Philippine Statutory Adjudication Compliance
                      </h4>
                      <div className="space-y-2 text-xs text-slate-600">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-slate-800">RA 9439 (Anti-Hospital Detention):</strong> Patient cannot be detained for non-payment; statutory 0% promissory note option active.
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-slate-800">RA 9994 &amp; RA 10754:</strong> Statutory 20% discount and 12% VAT exemption verified on eligible line items.
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-slate-800">PhilHealth Circular 2024-0037:</strong> All case rate deductions applied prior to commercial HMO LOA and copay calculation.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-slate-400 text-sm">
              Select an encounter from the patient queue to view discharge clearance status.
            </div>
          )}
        </div>
      ) : viewMode === 'TABLE' ? (
        /* DISCHARGE CLEARANCE FULL TABLE */
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto overscroll-contain bg-white">
          <table className="w-full min-w-[950px] text-left text-sm border-collapse">
            <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
              <tr className="text-xs font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-6 text-left">Patient &amp; MRN</th>
                <th className="py-3 px-4 text-left">Room / Bed</th>
                <th className="py-3 px-4 text-left">Attending Doctor</th>
                <th className="py-3 px-4 text-left">Payer / Plan</th>
                <th className="py-3 px-4 text-left">Stage</th>
                <th className="py-3 px-4 text-left">eSOA Status</th>
                <th className="py-3 px-4 text-left">SLA Status</th>
                <th className="py-3 px-4 text-left">Net Patient Due</th>
                <th className="py-3 px-6 text-left">Actions</th>
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
                const isSelected = enc.id === currentSelectedEncounter?.id;

                return (
                  <tr
                    key={enc.id}
                    onClick={() => selectEncounter(enc.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/70 border-l-4 border-l-blue-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3 px-6 text-left">
                      <div className="font-semibold text-slate-900 text-sm">
                        {pName}
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        {enc.encounterNumber}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-left text-slate-700 font-semibold text-sm">
                      {enc.roomBed}
                    </td>

                    <td className="py-3 px-4 text-left text-slate-700 text-xs">
                      {enc.attendingDoctor}
                    </td>

                    <td className="py-3 px-4 text-left text-slate-700 text-xs">
                      <div className="font-medium text-slate-900">{hmo}</div>
                      <div className="text-slate-400 font-mono text-[11px] mt-0.5">
                        PhilHealth: {enc.philhealth.caseRateCode}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-left text-xs font-semibold text-slate-800">
                      Step {getStageMeta(enc.stage).step}: {getStageMeta(enc.stage).label}
                    </td>

                    <td className="py-3 px-4 text-left">
                      {renderBillStateChip(enc)}
                    </td>

                    <td className="py-3 px-4 text-left">
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

                    <td className="py-3 px-4 text-left font-mono font-bold text-slate-900 text-sm tabular-nums">
                      {formatPhp(enc.stage === 'CLEARED_GATE_PASS' ? 0 : (enc.remainingBalance !== undefined ? enc.remainingBalance : enc.waterfall.netPatientDue))}
                    </td>

                    <td className="py-3 px-6 text-left">
                      <div className="flex items-center justify-start gap-2">
                        {renderContextualPrimaryAction(enc)}
                        <IconButton
                          size="sm"
                          variant="ghost"
                          icon={Pencil}
                          ariaLabel="Edit encounter details"
                          title="Edit encounter details"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditEncounterModal(enc);
                          }}
                        />
                        <IconButton
                          size="sm"
                          variant="ghost"
                          icon={Trash2}
                          ariaLabel="Discharge and remove encounter"
                          title="Discharge and remove encounter"
                          className="hover:text-rose-600 hover:bg-rose-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteEncounter(enc.id);
                          }}
                        />
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
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
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
                className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs hover:border-slate-300 transition-all space-y-3"
              >
                {/* Top Row: Patient Info + Clearance Status & SLA */}
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-slate-900">
                        {pName}
                      </span>
                      {renderBillStateChip(enc)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 font-normal">
                      <span className="font-semibold text-slate-800">{enc.roomBed}</span> · {enc.patient.age || 62} y/o {enc.patient.gender === 'F' ? 'F' : 'M'}{enc.patient.isSeniorCitizen ? ' · SC' : ''}{enc.patient.isPwd ? ' · PWD' : ''} · <span className="font-mono">{enc.encounterNumber}</span> · {hmo} · Dr. {enc.attendingDoctor}
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
                        <span>At Risk ({remainingMinutes}m remaining)</span>
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-blue-700 flex items-center gap-1.5 justify-end">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span>On Schedule ({remainingMinutes}m left)</span>
                      </span>
                    )}
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Stage {getStageMeta(enc.stage).step} of 6: {getStageMeta(enc.stage).label}
                    </span>
                  </div>
                </div>

                {/* Middle Grid: What is Blocking & Financial Responsibility */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-200">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-800 block mb-1">
                      Current Blocker
                    </span>
                    <div className="font-bold text-slate-900 text-xs sm:text-sm">
                      {blocker.title}
                    </div>
                    <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                      {blocker.explanation}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Patient Due:
                      </span>
                      <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                        {formatPhp(enc.stage === 'CLEARED_GATE_PASS' ? 0 : (enc.remainingBalance !== undefined ? enc.remainingBalance : enc.waterfall.netPatientDue))}
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
                <div className="pt-2 flex items-center justify-between flex-wrap gap-2.5">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openDossierDrawer(enc)}
                    >
                      Itemized Ledger
                    </Button>
                  </div>

                  {renderContextualPrimaryAction(enc)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
