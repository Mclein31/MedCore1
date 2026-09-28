import React, { createContext, useContext, useState, useEffect } from 'react';
import { Encounter, ChargemasterItem, DischargeStage, PromissoryNote, DischargePass } from '@/types/domain';
import { NavRoute, UserRole } from '@/types/navigation';
import { INITIAL_ENCOUNTERS } from '@/data/mockData';
import { recalculateWaterfall } from '@/utils/waterfall';
import { calculateInstallmentPlan } from '@/utils/financing';

interface MedCoreContextType {
  encounters: Encounter[];
  selectedEncounterId: string;
  selectedEncounter: Encounter;
  activeRoute: NavRoute;
  activeRole: UserRole;
  searchQuery: string;
  activeFilter: 'ALL' | 'WARNING' | 'BREACH' | 'DISPUTED';
  
  // Drawer & Modal States
  isActionDrawerOpen: boolean;
  isPromissoryModalOpen: boolean;
  promissoryCustomAmount: number | null;
  promissoryItemContext: { description?: string; itemId?: string } | null;
  isDoctorQuickSignOpen: boolean;
  isGatePassModalOpen: boolean;
  isWhyDoIOweThisOpen: boolean;
  selectedWhyItem: ChargemasterItem | null;
  isSearchModalOpen: boolean;
  isDossierDrawerOpen: boolean;
  dossierEncounter: Encounter | null;
  isPatientClarifyDrawerOpen: boolean;
  clarifyTokenEncounter: Encounter | null;

  // Actions
  selectEncounter: (id: string) => void;
  setActiveRoute: (route: NavRoute) => void;
  setActiveRole: (role: UserRole) => void;
  setSearchQuery: (query: string) => void;
  setActiveFilter: (filter: 'ALL' | 'WARNING' | 'BREACH' | 'DISPUTED') => void;
  
  // Modal openers
  openActionDrawer: () => void;
  closeActionDrawer: () => void;
  openPromissoryModal: (
    encounterId?: string,
    customAmount?: number,
    itemContext?: { description?: string; itemId?: string } | string
  ) => void;
  closePromissoryModal: () => void;
  openDoctorQuickSign: () => void;
  closeDoctorQuickSign: () => void;
  openGatePassModal: () => void;
  closeGatePassModal: () => void;
  openWhyDoIOweThis: (item: ChargemasterItem) => void;
  closeWhyDoIOweThis: () => void;
  openSearchModal: () => void;
  closeSearchModal: () => void;
  openDossierDrawer: (encounter: Encounter) => void;
  closeDossierDrawer: () => void;
  openPatientClarifyDrawer: (encounter?: Encounter) => void;
  closePatientClarifyDrawer: () => void;

  // Operational Transitions
  advanceStage: (encounterId: string) => void;
  nudgeDoctor: (encounterId: string) => void;
  applyAccreditedCeiling: (encounterId: string) => void;
  clearPharmacyRts: (encounterId: string) => void;
  approveHmoFinalLoa: (encounterId: string) => void;
  settlePatientBalance: (encounterId: string, channel: 'QR_PH' | 'GCASH' | 'MAYA' | 'PROMISSORY_NOTE') => void;
  issueDigitalGatePass: (encounterId: string) => void;
  executePromissoryNote: (
    encounterId: string,
    borrowerName: string,
    idType: 'PHILSYS_NATIONAL_ID' | 'UMID' | 'DRIVERS_LICENSE',
    idNumber: string,
    months: 3 | 6 | 12,
    customPrincipal?: number
  ) => void;
  freezeDisputeItem: (encounterId: string, itemId: string, reason: string) => void;
  supervisoryWaiveItem: (encounterId: string, itemId: string, notes: string) => void;
}

const MedCoreContext = createContext<MedCoreContextType | undefined>(undefined);

export const MedCoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [encounters, setEncounters] = useState<Encounter[]>(INITIAL_ENCOUNTERS);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string>('enc-8812');
  const [activeRoute, setActiveRoute] = useState<NavRoute>('COMMAND_CENTER');
  const [activeRole, setActiveRole] = useState<UserRole>('BILLING_SPECIALIST');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'WARNING' | 'BREACH' | 'DISPUTED'>('ALL');

  // Modals & Drawers
  const [isActionDrawerOpen, setIsActionDrawerOpen] = useState(false);
  const [isPromissoryModalOpen, setIsPromissoryModalOpen] = useState(false);
  const [promissoryCustomAmount, setPromissoryCustomAmount] = useState<number | null>(null);
  const [promissoryItemContext, setPromissoryItemContext] = useState<{ description?: string; itemId?: string } | null>(null);
  const [isDoctorQuickSignOpen, setIsDoctorQuickSignOpen] = useState(false);
  const [isGatePassModalOpen, setIsGatePassModalOpen] = useState(false);
  const [isWhyDoIOweThisOpen, setIsWhyDoIOweThisOpen] = useState(false);
  const [selectedWhyItem, setSelectedWhyItem] = useState<ChargemasterItem | null>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isDossierDrawerOpen, setIsDossierDrawerOpen] = useState(false);
  const [dossierEncounter, setDossierEncounter] = useState<Encounter | null>(null);
  const [isPatientClarifyDrawerOpen, setIsPatientClarifyDrawerOpen] = useState(false);
  const [clarifyTokenEncounter, setClarifyTokenEncounter] = useState<Encounter | null>(null);

  // Enforce pure light mode across the application
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  // Global Keyboard Shortcuts (Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsActionDrawerOpen(false);
        setIsPromissoryModalOpen(false);
        setPromissoryCustomAmount(null);
        setPromissoryItemContext(null);
        setIsDoctorQuickSignOpen(false);
        setIsGatePassModalOpen(false);
        setIsWhyDoIOweThisOpen(false);
        setIsSearchModalOpen(false);
        setIsDossierDrawerOpen(false);
        setIsPatientClarifyDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const selectedEncounter =
    encounters.find((e) => e.id === selectedEncounterId) || encounters[0];

  const selectEncounter = (id: string) => {
    setSelectedEncounterId(id);
  };

  const openActionDrawer = () => setIsActionDrawerOpen(true);
  const closeActionDrawer = () => setIsActionDrawerOpen(false);

  const openPromissoryModal = (
    encounterId?: string,
    customAmount?: number,
    itemContext?: { description?: string; itemId?: string } | string
  ) => {
    if (encounterId) {
      setSelectedEncounterId(encounterId);
    } else {
      const current = encounters.find(e => e.id === selectedEncounterId);
      if (!current || current.waterfall.netPatientDue <= 0) {
        const firstEligible = encounters.find(e => e.waterfall.netPatientDue > 0);
        if (firstEligible) {
          setSelectedEncounterId(firstEligible.id);
        }
      }
    }
    if (customAmount !== undefined && customAmount !== null) {
      setPromissoryCustomAmount(customAmount);
    } else {
      setPromissoryCustomAmount(null);
    }
    if (itemContext) {
      if (typeof itemContext === 'string') {
        setPromissoryItemContext({ description: itemContext });
      } else {
        setPromissoryItemContext(itemContext);
      }
    } else {
      setPromissoryItemContext(null);
    }
    setIsPromissoryModalOpen(true);
  };
  const closePromissoryModal = () => {
    setIsPromissoryModalOpen(false);
    setPromissoryCustomAmount(null);
    setPromissoryItemContext(null);
  };

  const openDoctorQuickSign = () => setIsDoctorQuickSignOpen(true);
  const closeDoctorQuickSign = () => setIsDoctorQuickSignOpen(false);

  const openGatePassModal = () => setIsGatePassModalOpen(true);
  const closeGatePassModal = () => setIsGatePassModalOpen(false);

  const openWhyDoIOweThis = (item: ChargemasterItem) => {
    setSelectedWhyItem(item);
    setIsWhyDoIOweThisOpen(true);
  };
  const closeWhyDoIOweThis = () => {
    setIsWhyDoIOweThisOpen(false);
    setSelectedWhyItem(null);
  };

  const openSearchModal = () => setIsSearchModalOpen(true);
  const closeSearchModal = () => setIsSearchModalOpen(false);

  const openDossierDrawer = (encounter: Encounter) => {
    setDossierEncounter(encounter);
    setSelectedEncounterId(encounter.id);
    setIsDossierDrawerOpen(true);
  };
  const closeDossierDrawer = () => {
    setIsDossierDrawerOpen(false);
  };

  const openPatientClarifyDrawer = (encounter?: Encounter) => {
    const enc = encounter || selectedEncounter;
    setClarifyTokenEncounter(enc);
    setSelectedEncounterId(enc.id);
    setIsPatientClarifyDrawerOpen(true);
  };
  const closePatientClarifyDrawer = () => {
    setIsPatientClarifyDrawerOpen(false);
  };

  // Operational Transitions
  const stageOrder: DischargeStage[] = [
    'MGH_DECLARED',
    'DOCTOR_PF_PENDING',
    'PHARMACY_RTS_AUDIT',
    'HMO_FINAL_LOA',
    'PENDING_SETTLEMENT',
    'CLEARED_GATE_PASS'
  ];

  const advanceStage = (encounterId: string) => {
    setEncounters((prev) =>
      prev.map((enc) => {
        if (enc.id !== encounterId) return enc;
        const currentIndex = stageOrder.indexOf(enc.stage);
        if (currentIndex < stageOrder.length - 1) {
          const nextStage = stageOrder[currentIndex + 1];
          return {
            ...enc,
            stage: nextStage,
            elapsedMinutes: Math.min(45, enc.elapsedMinutes + 4)
          };
        }
        return enc;
      })
    );
  };

  const nudgeDoctor = (encounterId: string) => {
    setEncounters((prev) =>
      prev.map((enc) => {
        if (enc.id !== encounterId) return enc;
        return {
          ...enc,
          elapsedMinutes: enc.elapsedMinutes + 1
        };
      })
    );
  };

  const applyAccreditedCeiling = (encounterId: string) => {
    setEncounters((prev) =>
      prev.map((enc) => {
        if (enc.id !== encounterId) return enc;
        const updatedExcess = 0;
        const newWaterfall = recalculateWaterfall(
          enc.items,
          enc.patient.isSeniorCitizen || enc.patient.isPwd,
          enc.philhealth.hciAmount,
          enc.philhealth.pfAmount,
          enc.hmo.approvedAmount,
          enc.waterfall.roomUpgradeExcess,
          updatedExcess
        );
        return {
          ...enc,
          doctorExcessPf: 0,
          doctorSignedAt: new Date().toISOString(),
          waterfall: newWaterfall,
          stage: enc.stage === 'DOCTOR_PF_PENDING' ? 'PHARMACY_RTS_AUDIT' : enc.stage
        };
      })
    );
  };

  const clearPharmacyRts = (encounterId: string) => {
    setEncounters((prev) =>
      prev.map((enc) => {
        if (enc.id !== encounterId) return enc;
        return {
          ...enc,
          pharmacyRtsCleared: true,
          unreturnedMedsCount: 0,
          stage: enc.stage === 'PHARMACY_RTS_AUDIT' ? 'HMO_FINAL_LOA' : enc.stage
        };
      })
    );
  };

  const approveHmoFinalLoa = (encounterId: string) => {
    setEncounters((prev) =>
      prev.map((enc) => {
        if (enc.id !== encounterId) return enc;
        return {
          ...enc,
          hmo: {
            ...enc.hmo,
            finalLoaStatus: 'APPROVED',
            approvalCode: `APV-${Math.floor(100000 + Math.random() * 900000)}`
          },
          stage: enc.stage === 'HMO_FINAL_LOA' ? 'PENDING_SETTLEMENT' : enc.stage
        };
      })
    );
  };

  const issueDigitalGatePass = (encounterId: string) => {
    setEncounters((prev) =>
      prev.map((enc) => {
        if (enc.id !== encounterId) return enc;
        const newPass: DischargePass = {
          passNumber: `PASS-MC-${Math.floor(10000 + Math.random() * 90000)}`,
          encounterId: enc.id,
          patientName: enc.patient.maskedName,
          roomBed: enc.roomBed,
          settledAmount: enc.waterfall.netPatientDue,
          settlementChannel: 'QR_PH',
          issuedAt: new Date().toISOString(),
          status: 'ACTIVE_READY_FOR_EXIT',
          hmacSignature: `hmac_${Math.random().toString(36).substring(2, 15)}`
        };
        return {
          ...enc,
          stage: 'CLEARED_GATE_PASS',
          dischargePass: newPass
        };
      })
    );
    setIsGatePassModalOpen(true);
  };

  const settlePatientBalance = (
    encounterId: string,
    channel: 'QR_PH' | 'GCASH' | 'MAYA' | 'PROMISSORY_NOTE'
  ) => {
    setSelectedEncounterId(encounterId);
    setEncounters((prev) =>
      prev.map((enc) => {
        if (enc.id !== encounterId) return enc;
        const currentDue = enc.waterfall.netPatientDue;
        const newPass: DischargePass = {
          passNumber: `PASS-MC-${Math.floor(10000 + Math.random() * 90000)}`,
          encounterId: enc.id,
          patientName: enc.patient.maskedName,
          roomBed: enc.roomBed,
          settledAmount: currentDue,
          settlementChannel: channel,
          issuedAt: new Date().toISOString(),
          status: 'ACTIVE_READY_FOR_EXIT',
          hmacSignature: `hmac_${Math.random().toString(36).substring(2, 15)}`
        };
        return {
          ...enc,
          stage: 'CLEARED_GATE_PASS',
          dischargePass: newPass,
          waterfall: {
            ...enc.waterfall,
            netPatientDue: 0,
            patientPaid: (enc.waterfall.patientPaid || 0) + currentDue
          }
        };
      })
    );
    setIsGatePassModalOpen(true);
  };

  const executePromissoryNote = (
    encounterId: string,
    borrowerName: string,
    idType: 'PHILSYS_NATIONAL_ID' | 'UMID' | 'DRIVERS_LICENSE',
    idNumber: string,
    months: 3 | 6 | 12,
    customPrincipal?: number
  ) => {
    setEncounters((prev) =>
      prev.map((enc) => {
        if (enc.id !== encounterId) return enc;
        const principal = customPrincipal !== undefined && customPrincipal !== null
          ? customPrincipal
          : (promissoryCustomAmount !== null ? promissoryCustomAmount : enc.waterfall.netPatientDue);
        const plan = calculateInstallmentPlan(principal, months);
        const note: PromissoryNote = {
          id: `PN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          encounterId: enc.id,
          borrowerName,
          borrowerRelationship: 'GUARANTOR',
          borrowerIdType: idType,
          borrowerIdNumber: idNumber,
          principalAmount: principal,
          installmentMonths: months,
          monthlyInstallment: plan.monthlyInstallment,
          firstDueDate: '2026-10-25',
          digitalSignatureTimestamp: new Date().toISOString(),
          status: 'ACTIVE'
        };

        const clearedPass: DischargePass = {
          passNumber: `PASS-MC-${Math.floor(10000 + Math.random() * 90000)}`,
          encounterId: enc.id,
          patientName: enc.patient.maskedName,
          roomBed: enc.roomBed,
          settledAmount: principal,
          settlementChannel: 'PROMISSORY_NOTE',
          issuedAt: new Date().toISOString(),
          status: 'ACTIVE_READY_FOR_EXIT',
          hmacSignature: `sig_ra9439_${Math.random().toString(36).substring(2, 12)}`
        };

        return {
          ...enc,
          stage: 'CLEARED_GATE_PASS',
          promissoryNote: note,
          dischargePass: clearedPass
        };
      })
    );
    setIsPromissoryModalOpen(false);
    setIsGatePassModalOpen(true);
  };

  const freezeDisputeItem = (encounterId: string, itemId: string, reason: string) => {
    setEncounters((prev) =>
      prev.map((enc) => {
        if (enc.id !== encounterId) return enc;
        const updatedItems = enc.items.map((it) =>
          it.id === itemId ? { ...it, status: 'CONTESTED' as const } : it
        );
        const contestedItem = enc.items.find((it) => it.id === itemId);
        const newDispute = {
          id: `disp-${Date.now()}`,
          encounterId,
          itemId,
          itemDescription: contestedItem?.description || 'Contested line item',
          contestedAmount: contestedItem?.patientOop || 0,
          reason,
          status: 'FROZEN' as const,
          createdAt: new Date().toISOString()
        };
        return {
          ...enc,
          items: updatedItems,
          disputes: [...enc.disputes, newDispute]
        };
      })
    );
  };

  const supervisoryWaiveItem = (encounterId: string, itemId: string, notes: string) => {
    setEncounters((prev) =>
      prev.map((enc) => {
        if (enc.id !== encounterId) return enc;
        const updatedItems = enc.items.map((it) =>
          it.id === itemId
            ? {
                ...it,
                status: 'SUPERVISORY_WAIVED' as const,
                isDisputed: false,
                patientOop: 0,
                disputeReason: undefined
              }
            : it
        );
        const updatedWaterfall = recalculateWaterfall(
          updatedItems,
          enc.patient.isSeniorCitizen || enc.patient.isPwd,
          enc.philhealth.hciAmount,
          enc.philhealth.pfAmount,
          enc.hmo.approvedAmount,
          enc.waterfall.roomUpgradeExcess,
          enc.doctorExcessPf
        );
        const updatedDisputes = enc.disputes.map((d) =>
          d.itemId === itemId
            ? { ...d, status: 'SUPERVISOR_WAIVED' as const, supervisorNotes: notes }
            : d
        );
        const hasRemainingDisputedMeds = updatedItems.some(
          (it) =>
            (it.isDisputed || it.status === 'CONTESTED') &&
            it.status !== 'SUPERVISORY_WAIVED' &&
            it.status !== 'WAIVED' &&
            it.category === 'PHARMACY'
        );
        return {
          ...enc,
          items: updatedItems,
          waterfall: updatedWaterfall,
          disputes: updatedDisputes,
          pharmacyRtsCleared: enc.pharmacyRtsCleared || !hasRemainingDisputedMeds,
          unreturnedMedsCount: hasRemainingDisputedMeds ? enc.unreturnedMedsCount : 0
        };
      })
    );
  };

  return (
    <MedCoreContext.Provider
      value={{
        encounters,
        selectedEncounterId,
        selectedEncounter,
        activeRoute,
        activeRole,
        searchQuery,
        activeFilter,
        isActionDrawerOpen,
        isPromissoryModalOpen,
        promissoryCustomAmount,
        promissoryItemContext,
        isDoctorQuickSignOpen,
        isGatePassModalOpen,
        isWhyDoIOweThisOpen,
        selectedWhyItem,
        isSearchModalOpen,
        isDossierDrawerOpen,
        dossierEncounter,
        isPatientClarifyDrawerOpen,
        clarifyTokenEncounter,
        selectEncounter,
        setActiveRoute,
        setActiveRole,
        setSearchQuery,
        setActiveFilter,
        openActionDrawer,
        closeActionDrawer,
        openPromissoryModal,
        closePromissoryModal,
        openDoctorQuickSign,
        closeDoctorQuickSign,
        openGatePassModal,
        closeGatePassModal,
        openWhyDoIOweThis,
        closeWhyDoIOweThis,
        openSearchModal,
        closeSearchModal,
        openDossierDrawer,
        closeDossierDrawer,
        openPatientClarifyDrawer,
        closePatientClarifyDrawer,
        advanceStage,
        nudgeDoctor,
        applyAccreditedCeiling,
        clearPharmacyRts,
        approveHmoFinalLoa,
        settlePatientBalance,
        issueDigitalGatePass,
        executePromissoryNote,
        freezeDisputeItem,
        supervisoryWaiveItem
      }}
    >
      {children}
    </MedCoreContext.Provider>
  );
};

export const useMedCore = () => {
  const context = useContext(MedCoreContext);
  if (!context) {
    throw new Error('useMedCore must be used within a MedCoreProvider');
  }
  return context;
};
