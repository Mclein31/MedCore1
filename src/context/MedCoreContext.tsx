import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Encounter, ChargemasterItem, DischargeStage, PromissoryNote, DischargePass, PaymentReceipt } from '@/types/domain';
import { NavRoute, UserRole } from '@/types/navigation';
import { INITIAL_ENCOUNTERS } from '@/data/mockData';
import { recalculateWaterfall } from '@/utils/waterfall';
import { calculateInstallmentPlan } from '@/utils/financing';
import { formatPhp } from '@/utils/formatters';
import {
  BillLifecycleState,
  DemoPaymentRail,
  DemoPaymentRecord,
  broadcastBillingSync,
  usePatientBillingSync,
  generateTransactionReference,
  generateOfficialReceiptNumber,
  generateHmacSignature,
  generateGatePassNumber,
  generatePaymentId,
  createOrGetReceipt
} from '@/features/patient-clarify';
import { printEngine, PrintDocumentConfig } from '@/services/printEngine';
import type { ConfirmationModalVariant, ConfirmationContextInfo } from '@/components/modals';
import { apiClient } from '@/services/apiClient';

export interface ConfirmModalRequest {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmationModalVariant;
  contextInfo?: ConfirmationContextInfo[];
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}


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
  verifyGatePass: (encounterId: string) => void;
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

  // Patient Billing & Demo Settlement
  finalizeBill: (encounterId: string) => void;
  sendBillToPatient: (encounterId: string) => { magicLink: string; token: string };
  recordPatientViewed: (encounterId: string) => void;
  fileBillingDispute: (encounterId: string, itemId: string, reason: string) => void;
  processDemoPayment: (params: {
    encounterId: string;
    amount: number;
    paymentRail: DemoPaymentRail;
    payerName: string;
    payerContactMasked: string;
    failureSimulated?: boolean;
    promissoryMonths?: 3 | 6 | 12;
    borrowerIdType?: string;
    borrowerIdNumber?: string;
    bankName?: string;
  }) => Promise<{ success: boolean; paymentRecord?: DemoPaymentRecord; error?: string }>;
  // Auth & Session
  isAuthenticated: boolean;
  currentUser: any | null;
  login: (credentials: { email: string; password?: string; facilityCode?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;

  // CRUD Modal States
  isAddChargeModalOpen: boolean;
  isEditChargeModalOpen: boolean;
  chargeToEdit: ChargemasterItem | null;
  isAdmitPatientModalOpen: boolean;
  isEditEncounterModalOpen: boolean;
  encounterToEdit: Encounter | null;

  // CRUD Modal Openers & Closers
  openAddChargeModal: () => void;
  openEditChargeModal: (item: ChargemasterItem) => void;
  closeAddEditChargeModal: () => void;
  openAdmitPatientModal: () => void;
  closeAdmitPatientModal: () => void;
  openEditEncounterModal: (encounter?: Encounter) => void;
  closeEditEncounterModal: () => void;

  // CRUD Actions
  addChargeItem: (encounterId: string, itemData: any) => Promise<void>;
  editChargeItem: (encounterId: string, itemId: string, updates: any) => Promise<void>;
  deleteChargeItem: (encounterId: string, itemId: string) => void;
  admitPatient: (data: any) => Promise<void>;
  editEncounter: (encounterId: string, updates: any) => Promise<void>;
  deleteEncounter: (encounterId: string) => void;

  printDocument: (config: PrintDocumentConfig) => void;
  confirmationState: (ConfirmModalRequest & { isOpen: boolean }) | null;
  requestConfirmation: (request: ConfirmModalRequest) => void;
  closeConfirmation: () => void;
}


const buildInitialEncounterState = (): Encounter[] => {
  return INITIAL_ENCOUNTERS.map((enc) => {
    const isPaid = enc.stage === 'CLEARED_GATE_PASS';
    const isPending = enc.stage === 'PENDING_SETTLEMENT';
    const hasDisputes = enc.disputes && enc.disputes.length > 0;
    const netDue = enc.waterfall.netPatientDue;

    // Bill 3 Preset: Partially Paid encounter (enc-4552: Gutierrez, Rolando T.)
    if (enc.id === 'enc-4552') {
      const amountPaid = 10000;
      const remainingBalance = Math.max(0, Number((netDue - amountPaid).toFixed(2)));
      const sampleTx: DemoPaymentRecord = {
        id: 'tx-init-4552',
        paymentId: 'PAY-DEMO-4552-INIT001',
        billId: 'BILL-2026-4552',
        encounterId: enc.id,
        amount: 10000,
        currency: 'PHP',
        paymentRail: 'GCASH',
        channelReference: 'TXN-DEMO-GCASH-441209',
        gatewayAuthCode: 'AUTH-88219',
        payerName: 'Gutierrez, Rolando T.',
        payerContactMasked: '0917-***-4552',
        timestamp: '2026-09-28T09:15:00.000Z',
        status: 'SUCCESS',
        officialReceiptNumber: 'OR-SJMC-2026-88120',
        isSimulatedDemo: true,
        notes: 'Initial partial payment towards room differential & doctor fee'
      };
      const initialReceipt = createOrGetReceipt(sampleTx);
      sampleTx.receiptId = initialReceipt.id;
      sampleTx.receipt = initialReceipt;

      return {
        ...enc,
        billNumber: 'SOA-SJMC-26-4552',
        billState: 'PARTIALLY_PAID',
        amountPaid,
        remainingBalance,
        paymentHistory: [sampleTx],
        receipts: [initialReceipt]
      };
    }

    let defaultState: BillLifecycleState = 'DRAFT';
    if (isPaid) defaultState = 'PAID';
    else if (hasDisputes) defaultState = 'DISPUTED';
    else if (isPending) defaultState = 'SENT_TO_PATIENT';

    const billNumber = enc.billNumber || `SOA-SJMC-26-${enc.encounterNumber.replace(/\D/g, '') || enc.id.replace(/\D/g, '')}`;
    const amountPaid = isPaid ? (enc.waterfall.patientPaid || netDue) : 0;
    const remainingBalance = isPaid ? 0 : netDue;
    const initialReceipts = (enc.paymentHistory || []).map((p) => p.receipt || createOrGetReceipt(p));

    return {
      ...enc,
      billNumber,
      billState: enc.billState || defaultState,
      amountPaid: enc.amountPaid !== undefined ? enc.amountPaid : amountPaid,
      remainingBalance: enc.remainingBalance !== undefined ? enc.remainingBalance : remainingBalance,
      paymentHistory: enc.paymentHistory || [],
      receipts: enc.receipts || initialReceipts
    };
  });
};

const MedCoreContext = createContext<MedCoreContextType | undefined>(undefined);

export const MedCoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [encounters, setEncounters] = useState<Encounter[]>(buildInitialEncounterState);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string>('enc-8812');
  const [activeRoute, setActiveRoute] = useState<NavRoute>('COMMAND_CENTER');
  const [activeRole, setActiveRoleState] = useState<UserRole>('BILLING_SPECIALIST');

  const setActiveRole = (role: UserRole) => {
    setActiveRoleState(role);
    apiClient.switchRole(role).catch((err) => {
      console.warn('API switchRole sync:', err);
    });
  };

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

  // Centralized Confirmation Modal State
  const [confirmationState, setConfirmationState] = useState<(ConfirmModalRequest & { isOpen: boolean }) | null>(null);

  const requestConfirmation = (request: ConfirmModalRequest) => {
    setConfirmationState({
      ...request,
      isOpen: true
    });
  };

  const closeConfirmation = () => {
    setConfirmationState(null);
  };

  // Auth & Session State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('aqromed_auth');
      return stored === 'true';
    }
    return false;
  });

  const [currentUser, setCurrentUser] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('aqromed_user');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // ignore
        }
      }
    }
    return {
      id: 'usr-billing-lead',
      fullName: 'Elena Santos',
      email: 'elena.santos@stjude.ph',
      role: 'BILLING_SPECIALIST',
      title: 'Inpatient Billing Specialist',
      facilityName: 'St. Jude Medical Center Manila'
    };
  });

  // Verify backend session on mount
  useEffect(() => {
    apiClient.getMe()
      .then((res) => {
        if (res?.user) {
          setIsAuthenticated(true);
          setCurrentUser(res.user);
          if (typeof window !== 'undefined') {
            localStorage.setItem('aqromed_auth', 'true');
            localStorage.setItem('aqromed_user', JSON.stringify(res.user));
          }
        }
      })
      .catch(() => {
        // Standalone or local fallback
      });
  }, []);

  const login = async (credentials: { email: string; password?: string; facilityCode?: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await apiClient.login(credentials);
      if (res?.user) {
        setIsAuthenticated(true);
        setCurrentUser(res.user);
        if (typeof window !== 'undefined') {
          localStorage.setItem('aqromed_auth', 'true');
          localStorage.setItem('aqromed_user', JSON.stringify(res.user));
        }
        if (res.user.role) {
          setActiveRoleState(res.user.role as UserRole);
        }
        return { success: true };
      }
      return { success: false, error: 'Login failed: Invalid server response' };
    } catch (err: any) {
      // Fallback demo preset accounts
      const demoAccounts = [
        { email: 'elena.santos@stjude.ph', role: 'BILLING_SPECIALIST', name: 'Elena Santos', title: 'Inpatient Billing Specialist' },
        { email: 'arthur.delgado@stjude.ph', role: 'HOSPITAL_CFO', name: 'Arthur Delgado', title: 'Hospital CFO / RCM Director' },
        { email: 'manuel.reyes@stjude.ph', role: 'ATTENDING_PHYSICIAN', name: 'Dr. Manuel Reyes', title: 'Attending Physician (FPCP)' },
        { email: 'marco.valenzuela@stjude.ph', role: 'HMO_COORDINATOR', name: 'Marco Valenzuela', title: 'HMO Liaison Coordinator' },
        { email: 'grace.tan@stjude.ph', role: 'CLAIMS_ENCODER', name: 'Grace Tan', title: 'PhilHealth Claims Auditor' },
        { email: 'bert.aquino@stjude.ph', role: 'LOBBY_SECURITY', name: 'Bert Aquino', title: 'Lobby Exit Security Officer' }
      ];
      const match = demoAccounts.find(d => d.email.toLowerCase() === credentials.email.toLowerCase());
      if (match) {
        const user = {
          id: `usr-${match.role.toLowerCase()}`,
          fullName: match.name,
          email: match.email,
          role: match.role,
          title: match.title,
          facilityName: 'St. Jude Medical Center Manila'
        };
        setIsAuthenticated(true);
        setCurrentUser(user);
        if (typeof window !== 'undefined') {
          localStorage.setItem('aqromed_auth', 'true');
          localStorage.setItem('aqromed_user', JSON.stringify(user));
        }
        setActiveRoleState(match.role as UserRole);
        return { success: true };
      }
      return { success: false, error: err.message || 'Authentication failed' };
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (err) {
      console.warn('API logout notice:', err);
    } finally {
      setIsAuthenticated(false);
      setCurrentUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('aqromed_auth');
        localStorage.removeItem('aqromed_user');
      }
    }
  };

  // CRUD Modals State
  const [isAddChargeModalOpen, setIsAddChargeModalOpen] = useState(false);
  const [isEditChargeModalOpen, setIsEditChargeModalOpen] = useState(false);
  const [chargeToEdit, setChargeToEdit] = useState<ChargemasterItem | null>(null);

  const openAddChargeModal = () => {
    setChargeToEdit(null);
    setIsAddChargeModalOpen(true);
    setIsEditChargeModalOpen(false);
  };

  const openEditChargeModal = (item: ChargemasterItem) => {
    setChargeToEdit(item);
    setIsEditChargeModalOpen(true);
    setIsAddChargeModalOpen(false);
  };

  const closeAddEditChargeModal = () => {
    setIsAddChargeModalOpen(false);
    setIsEditChargeModalOpen(false);
    setChargeToEdit(null);
  };

  const [isAdmitPatientModalOpen, setIsAdmitPatientModalOpen] = useState(false);
  const [isEditEncounterModalOpen, setIsEditEncounterModalOpen] = useState(false);
  const [encounterToEdit, setEncounterToEdit] = useState<Encounter | null>(null);

  const openAdmitPatientModal = () => {
    setIsAdmitPatientModalOpen(true);
  };

  const closeAdmitPatientModal = () => {
    setIsAdmitPatientModalOpen(false);
  };

  const openEditEncounterModal = (enc?: Encounter) => {
    setEncounterToEdit(enc || encounters.find(e => e.id === selectedEncounterId) || encounters[0]);
    setIsEditEncounterModalOpen(true);
  };

  const closeEditEncounterModal = () => {
    setIsEditEncounterModalOpen(false);
    setEncounterToEdit(null);
  };

  // In-flight mutex lock to prevent concurrent double-processing of payments per encounter
  const inFlightPaymentsRef = useRef<Set<string>>(new Set());

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
    apiClient.advanceStage(encounterId).catch((err) => {
      console.warn('API advance-stage background sync:', err);
    });
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
    apiClient.applyAccreditedCeiling(encounterId).catch((err) => {
      console.warn('API accredited-ceiling background sync:', err);
    });
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
    apiClient.clearPharmacyRts(encounterId).catch((err) => {
      console.warn('API clear-pharmacy-rts background sync:', err);
    });
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
    apiClient.approveHmoFinalLoa(encounterId).catch((err) => {
      console.warn('API approve-hmo-loa background sync:', err);
    });
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

  const verifyGatePass = (encounterId: string) => {
    setEncounters((prev) =>
      prev.map((enc) => {
        if (enc.id !== encounterId) return enc;
        const currentPass: DischargePass = enc.dischargePass || {
          passNumber: `PASS-MC-${enc.encounterNumber.replace('ENC-2026-', '')}`,
          encounterId: enc.id,
          patientName: enc.patient.fullName || enc.patient.maskedName,
          roomBed: enc.roomBed,
          settledAmount: enc.waterfall.netPatientDue,
          settlementChannel: 'QR_PH' as const,
          issuedAt: new Date().toISOString(),
          status: 'ACTIVE_READY_FOR_EXIT' as const,
          hmacSignature: 'a8f102c918e38d721bf64098ad23ef10'
        };
        return {
          ...enc,
          dischargePass: {
            ...currentPass,
            status: 'VERIFIED_AT_LOBBY',
            verifiedAt: new Date().toISOString()
          }
        };
      })
    );
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
    const encTarget = encounters.find((e) => e.id === encounterId);
    const targetPrincipal = customPrincipal !== undefined && customPrincipal !== null
      ? customPrincipal
      : (promissoryCustomAmount !== null ? promissoryCustomAmount : (encTarget?.waterfall.netPatientDue || 0));

    apiClient.executePromissoryNote(encounterId, {
      borrowerName,
      borrowerRelationship: 'GUARANTOR',
      borrowerIdType: idType,
      borrowerIdNumber: idNumber,
      installmentMonths: months,
      principalAmount: targetPrincipal
    }).catch((err) => {
      console.warn('API promissory note sync:', err);
    });

    setEncounters((prev) =>
      prev.map((enc) => {
        if (enc.id !== encounterId) return enc;
        const principal = targetPrincipal;
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
    apiClient.fileDispute(encounterId, {
      chargeId: itemId,
      reason,
      disputeCategory: 'OTHER'
    }).catch((err) => {
      console.warn('API file dispute sync:', err);
    });

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
    const encTarget = encounters.find((e) => e.id === encounterId);
    const targetDispute = encTarget?.disputes?.find((d) => d.itemId === itemId);
    if (targetDispute?.id) {
      apiClient.waiveDispute(targetDispute.id, notes).catch((err) => {
        console.warn('API supervisory waive sync:', err);
      });
    }

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

  // Listen for Cross-Tab / Cross-Window Sync Events
  usePatientBillingSync((msg) => {
    if (msg.type === 'BILL_FINALIZED') {
      setEncounters((prev) =>
        prev.map((e) => (e.id === msg.encounterId ? { ...e, billState: 'FINALIZED', billFinalizedAt: msg.timestamp } : e))
      );
    } else if (msg.type === 'BILL_SENT') {
      setEncounters((prev) =>
        prev.map((e) => (e.id === msg.encounterId ? { ...e, billState: 'SENT_TO_PATIENT', billSentAt: msg.timestamp } : e))
      );
    } else if (msg.type === 'BILL_VIEWED') {
      setEncounters((prev) =>
        prev.map((e) =>
          e.id === msg.encounterId && (e.billState === 'SENT_TO_PATIENT' || e.billState === 'DRAFT')
            ? { ...e, billState: 'VIEWED', billFirstViewedAt: msg.timestamp }
            : e
        )
      );
    } else if (msg.type === 'DISPUTE_FILED') {
      setEncounters((prev) =>
        prev.map((e) => {
          if (e.id !== msg.encounterId) return e;
          const updatedItems = e.items.map((it) => (it.id === msg.itemId ? { ...it, status: 'CONTESTED' as const } : it));
          return { ...e, billState: 'DISPUTED', items: updatedItems };
        })
      );
    } else if (msg.type === 'PAYMENT_SETTLED') {
      setEncounters((prev) =>
        prev.map((e) => {
          if (e.id !== msg.encounterId) return e;
          // IDEMPOTENCY GUARD: Check if this payment record is already recorded
          const existingPayments = e.paymentHistory || [];
          const isAlreadyRecorded = existingPayments.some(
            (p) => (msg.payment.paymentId && p.paymentId === msg.payment.paymentId) || p.id === msg.payment.id
          );
          if (isAlreadyRecorded) {
            return e;
          }

          const newPaid = Number(((e.amountPaid || 0) + msg.payment.amount).toFixed(2));
          const existingReceipts = e.receipts || [];
          const updatedReceipts = msg.payment.receipt
            ? (existingReceipts.some((r) => r.paymentId === msg.payment.paymentId) ? existingReceipts : [msg.payment.receipt, ...existingReceipts])
            : existingReceipts;

          return {
            ...e,
            amountPaid: newPaid,
            remainingBalance: msg.remainingBalance,
            billState: msg.isFullySettled ? 'PAID' : 'PARTIALLY_PAID',
            stage: msg.isFullySettled ? 'CLEARED_GATE_PASS' : e.stage,
            paymentHistory: [msg.payment, ...existingPayments],
            receipts: updatedReceipts,
            waterfall: {
              ...e.waterfall,
              netPatientDue: msg.remainingBalance,
              patientPaid: newPaid
            }
          };
        })
      );
    }
  });

  const finalizeBill = (encounterId: string) => {
    const nowIso = new Date().toISOString();
    setEncounters((prev) =>
      prev.map((enc) => {
        if (enc.id !== encounterId) return enc;
        return {
          ...enc,
          billState: 'FINALIZED',
          billFinalizedAt: nowIso
        };
      })
    );
    broadcastBillingSync({
      type: 'BILL_FINALIZED',
      encounterId,
      timestamp: nowIso
    });
  };

  const sendBillToPatient = (encounterId: string) => {
    const nowIso = new Date().toISOString();
    const token = `tok_${encounterId.replace(/\D/g, '')}_${Math.random().toString(36).substring(2, 7)}`;
    const magicLink = `https://aqromed.stjude.ph/clarify/${encounterId}?token=${token}`;
    setEncounters((prev) =>
      prev.map((enc) => {
        if (enc.id !== encounterId) return enc;
        return {
          ...enc,
          billState: 'SENT_TO_PATIENT',
          billSentAt: nowIso
        };
      })
    );
    broadcastBillingSync({
      type: 'BILL_SENT',
      encounterId,
      timestamp: nowIso,
      magicToken: token
    });
    return { magicLink, token };
  };

  const recordPatientViewed = (encounterId: string) => {
    const nowIso = new Date().toISOString();
    setEncounters((prev) =>
      prev.map((enc) => {
        if (enc.id !== encounterId) return enc;
        if (enc.billState === 'SENT_TO_PATIENT' || enc.billState === 'DRAFT') {
          return {
            ...enc,
            billState: 'VIEWED',
            billFirstViewedAt: enc.billFirstViewedAt || nowIso
          };
        }
        return enc;
      })
    );
    broadcastBillingSync({
      type: 'BILL_VIEWED',
      encounterId,
      timestamp: nowIso
    });
  };

  const fileBillingDispute = (encounterId: string, itemId: string, reason: string) => {
    freezeDisputeItem(encounterId, itemId, reason);
    setEncounters((prev) =>
      prev.map((enc) => {
        if (enc.id !== encounterId) return enc;
        return {
          ...enc,
          billState: 'DISPUTED'
        };
      })
    );
    broadcastBillingSync({
      type: 'DISPUTE_FILED',
      encounterId,
      itemId,
      reason
    });
  };

  const processDemoPayment = async (params: {
    encounterId: string;
    amount: number;
    paymentRail: DemoPaymentRail;
    payerName: string;
    payerContactMasked: string;
    failureSimulated?: boolean;
    promissoryMonths?: 3 | 6 | 12;
    borrowerIdType?: string;
    borrowerIdNumber?: string;
    bankName?: string;
  }): Promise<{ success: boolean; paymentRecord?: DemoPaymentRecord; error?: string }> => {
    // Concurrent mutex guard
    if (inFlightPaymentsRef.current.has(params.encounterId)) {
      return { success: false, error: 'A payment is currently being processed for this statement. Please wait.' };
    }
    inFlightPaymentsRef.current.add(params.encounterId);

    try {
      const enc = encounters.find((e) => e.id === params.encounterId);
      if (!enc) {
        return { success: false, error: 'Encounter record not found.' };
      }

      const currentRemaining =
        enc.remainingBalance !== undefined
          ? enc.remainingBalance
          : enc.stage === 'CLEARED_GATE_PASS'
          ? 0
          : enc.waterfall.netPatientDue;

      if (currentRemaining <= 0 && params.paymentRail !== 'PROMISSORY_NOTE') {
        return { success: false, error: 'This statement is already fully settled (Remaining Balance: ₱0.00).' };
      }

      if (params.amount <= 0) {
        return { success: false, error: 'Payment amount must be greater than ₱0.00.' };
      }

      if (params.amount > currentRemaining + 0.05) {
        return { success: false, error: `Payment cannot exceed remaining balance (${formatPhp(currentRemaining)}).` };
      }

      // Realistic micro-latency delay for presenter exhibition
      await new Promise((resolve) => setTimeout(resolve, 1600));

      if (params.failureSimulated) {
        return {
          success: false,
          error: 'Simulated Gateway Decline: Insufficient test funds or network timeout. No demo funds deducted.'
        };
      }

      const nowIso = new Date().toISOString();
      const txRef = generateTransactionReference(params.paymentRail);
      const orNum = generateOfficialReceiptNumber();
      const authCode = `AUTH-${Math.floor(10000 + Math.random() * 90000)}`;
      const paymentId = generatePaymentId(enc.id);

      const newRecord: DemoPaymentRecord = {
        id: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        paymentId,
        billId: enc.billNumber || `SOA-SJMC-26-${enc.id.replace(/\D/g, '')}`,
        encounterId: enc.id,
        amount: params.amount,
        currency: 'PHP',
        paymentRail: params.paymentRail,
        channelReference: txRef,
        gatewayAuthCode: authCode,
        payerName: params.payerName,
        payerContactMasked: params.payerContactMasked,
        timestamp: nowIso,
        status: 'SUCCESS',
        officialReceiptNumber: orNum,
        isSimulatedDemo: true,
        bankName: params.bankName
      };

      // Idempotently create exactly one receipt for this payment
      const receipt = createOrGetReceipt(newRecord, enc.receipts);
      newRecord.receiptId = receipt.id;
      newRecord.receipt = receipt;

      const newAmountPaid = Number(((enc.amountPaid || 0) + params.amount).toFixed(2));
      const newRemaining = Math.max(0, Number((currentRemaining - params.amount).toFixed(2)));
      const isFullySettled = newRemaining === 0 || params.paymentRail === 'PROMISSORY_NOTE';

      let updatedPass = enc.dischargePass;
      if (isFullySettled) {
        const passNum = generateGatePassNumber();
        const hmac = generateHmacSignature(enc.id, params.amount, nowIso);
        updatedPass = {
          passNumber: passNum,
          encounterId: enc.id,
          patientName: enc.patient.fullName || enc.patient.maskedName,
          roomBed: enc.roomBed,
          settledAmount: newAmountPaid,
          settlementChannel: params.paymentRail === 'PROMISSORY_NOTE' ? 'PROMISSORY_NOTE' : 'QR_PH',
          issuedAt: nowIso,
          status: 'ACTIVE_READY_FOR_EXIT',
          hmacSignature: hmac
        };
      }

      let updatedNote = enc.promissoryNote;
      if (params.paymentRail === 'PROMISSORY_NOTE') {
        const months = params.promissoryMonths || 6;
        const plan = calculateInstallmentPlan(params.amount, months);
        updatedNote = {
          id: `PN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          encounterId: enc.id,
          borrowerName: params.payerName,
          borrowerRelationship: 'GUARANTOR',
          borrowerIdType: (params.borrowerIdType as any) || 'PHILSYS_NATIONAL_ID',
          borrowerIdNumber: params.borrowerIdNumber || '1924-8812-4019-2041',
          principalAmount: params.amount,
          installmentMonths: months,
          monthlyInstallment: plan.monthlyInstallment,
          firstDueDate: '2026-10-25',
          digitalSignatureTimestamp: nowIso,
          status: 'ACTIVE'
        };
      }

      setEncounters((prev) =>
        prev.map((e) => {
          if (e.id !== params.encounterId) return e;
          // Invariant: Never add duplicate payment record
          if (e.paymentHistory?.some((p) => p.paymentId === paymentId || p.id === newRecord.id)) {
            return e;
          }
          const existingReceipts = e.receipts || [];
          const updatedReceipts = existingReceipts.some((r) => r.paymentId === paymentId)
            ? existingReceipts
            : [receipt, ...existingReceipts];

          return {
            ...e,
            amountPaid: newAmountPaid,
            remainingBalance: newRemaining,
            billState: isFullySettled ? 'PAID' : 'PARTIALLY_PAID',
            stage: isFullySettled ? 'CLEARED_GATE_PASS' : e.stage,
            dischargePass: updatedPass,
            promissoryNote: updatedNote,
            paymentHistory: [newRecord, ...(e.paymentHistory || [])],
            receipts: updatedReceipts,
            waterfall: {
              ...e.waterfall,
              netPatientDue: newRemaining,
              patientPaid: newAmountPaid
            }
          };
        })
      );

      broadcastBillingSync({
        type: 'PAYMENT_SETTLED',
        encounterId: enc.id,
        payment: newRecord,
        remainingBalance: newRemaining,
        isFullySettled
      });

      apiClient.processPayment(
        enc.id,
        {
          amount: params.amount,
          paymentRail: params.paymentRail,
          payerName: params.payerName || enc.patient.fullName || enc.patient.maskedName || 'Patient Guarantor',
          payerContactMasked: params.payerContactMasked || '0917-***-****',
          notes: (params as any).notes || `Settlement via ${params.paymentRail}`
        },
        txRef
      ).catch((err) => {
        console.warn('API processPayment background sync:', err);
      });

      return { success: true, paymentRecord: newRecord };
    } finally {
      inFlightPaymentsRef.current.delete(params.encounterId);
    }
  };

  // --- CHARGEMASTER CRUD IMPLEMENTATION ---
  const addChargeItem = async (encounterId: string, itemData: any) => {
    const enc = encounters.find((e) => e.id === encounterId) || selectedEncounter;
    if (!enc) return;

    const qty = Number(itemData.qty) > 0 ? Number(itemData.qty) : 1;
    const grossAmount = Number(itemData.grossAmount) > 0 ? Number(itemData.grossAmount) : 0;
    const unitPrice = itemData.unitPrice !== undefined && Number(itemData.unitPrice) >= 0
      ? Number(itemData.unitPrice)
      : Number((grossAmount / qty).toFixed(2));

    const newItem: ChargemasterItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      code: itemData.code || `CHG-${itemData.category.slice(0, 3)}-${Date.now().toString().slice(-4)}`,
      description: itemData.description,
      category: itemData.category,
      qty,
      unitPrice,
      grossAmount,
      isVatable: true,
      philhealthCovered: 0,
      hmoCovered: 0,
      patientOop: grossAmount,
      status: 'COVERED',
      isDisputed: false,
      plainLanguageExplainer: `Standard clinical hospital charge for ${itemData.description}.`
    };

    const updatedItems = [...enc.items, newItem];
    const newWaterfall = recalculateWaterfall(
      updatedItems,
      enc.patient.isSeniorCitizen || enc.patient.isPwd,
      enc.philhealth.hciAmount,
      enc.philhealth.pfAmount,
      enc.hmo.approvedAmount,
      enc.waterfall.roomUpgradeExcess,
      enc.doctorExcessPf || 0
    );

    setEncounters((prev) =>
      prev.map((e) => {
        if (e.id !== encounterId) return e;
        return {
          ...e,
          items: updatedItems,
          waterfall: newWaterfall,
          remainingBalance: Math.max(0, Number((newWaterfall.netPatientDue - (e.amountPaid || 0)).toFixed(2)))
        };
      })
    );

    try {
      const res = await apiClient.addChargeItem(encounterId, {
        description: itemData.description,
        category: itemData.category === 'MEDICAL_SUPPLIES' ? 'CENTRAL_SUPPLIES' : itemData.category,
        grossAmount,
        qty,
        quantity: qty,
        unitPrice,
        code: newItem.code,
        coverageType: itemData.coverageType || 'PHILHEALTH_FIRST'
      });
      if (res && res.item) {
        setEncounters((prev) =>
          prev.map((e) => {
            if (e.id !== encounterId) return e;
            return {
              ...e,
              items: e.items.map((i) =>
                i.id === newItem.id ? { ...i, id: res.item.id, code: res.item.code } : i
              )
            };
          })
        );
      }
    } catch (err) {
      console.warn('Backend addChargeItem sync notice:', err);
    }
  };

  const editChargeItem = async (encounterId: string, itemId: string, updates: any) => {
    const enc = encounters.find((e) => e.id === encounterId) || selectedEncounter;
    if (!enc) return;

    const item = enc.items.find((i) => i.id === itemId);

    const updatedItems = enc.items.map((i) => {
      if (i.id !== itemId) return i;
      const qty = updates.qty !== undefined ? Number(updates.qty) : (i.qty || 1);
      const grossAmount = updates.grossAmount !== undefined ? Number(updates.grossAmount) : i.grossAmount;
      const unitPrice = updates.unitPrice !== undefined
        ? Number(updates.unitPrice)
        : Number((grossAmount / (qty || 1)).toFixed(2));
      return {
        ...i,
        ...updates,
        qty,
        grossAmount,
        unitPrice
      };
    });

    const newWaterfall = recalculateWaterfall(
      updatedItems,
      enc.patient.isSeniorCitizen || enc.patient.isPwd,
      enc.philhealth.hciAmount,
      enc.philhealth.pfAmount,
      enc.hmo.approvedAmount,
      enc.waterfall.roomUpgradeExcess,
      enc.doctorExcessPf || 0
    );

    setEncounters((prev) =>
      prev.map((e) => {
        if (e.id !== encounterId) return e;
        return {
          ...e,
          items: updatedItems,
          waterfall: newWaterfall,
          remainingBalance: Math.max(0, Number((newWaterfall.netPatientDue - (e.amountPaid || 0)).toFixed(2)))
        };
      })
    );

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemId);
      const targetId = isUuid ? itemId : (item?.code || itemId);
      await apiClient.editChargeItem(targetId, {
        description: updates.description,
        category: updates.category === 'MEDICAL_SUPPLIES' ? 'CENTRAL_SUPPLIES' : updates.category,
        grossAmount: updates.grossAmount,
        qty: updates.qty,
        quantity: updates.qty,
        unitPrice: updates.unitPrice
      });
    } catch (err) {
      console.warn('Backend editChargeItem sync notice:', err);
    }
  };

  const deleteChargeItem = (encounterId: string, itemId: string) => {
    const enc = encounters.find((e) => e.id === encounterId) || selectedEncounter;
    const item = enc?.items.find((i) => i.id === itemId);
    const itemName = item?.description || 'Item';
    const itemAmt = item?.grossAmount ? formatPhp(item.grossAmount) : '₱0.00';

    requestConfirmation({
      title: 'Delete Chargemaster Item',
      description: `Are you sure you want to permanently remove "${itemName}" (${itemAmt}) from this patient's running bill? This will automatically recalculate the Philippine statutory deduction waterfall and update the net patient balance.`,
      confirmLabel: 'Delete Item',
      cancelLabel: 'Keep Item',
      variant: 'danger',
      contextInfo: [
        { label: 'Item Description', value: itemName },
        { label: 'Gross Amount', value: itemAmt },
        { label: 'Patient', value: enc?.patient.fullName || enc?.patient.maskedName || 'Patient' },
        { label: 'Encounter', value: enc?.encounterNumber || encounterId }
      ],
      onConfirm: async () => {
        if (!enc) return;
        const updatedItems = enc.items.filter((i) => i.id !== itemId);
        const newWaterfall = recalculateWaterfall(
          updatedItems,
          enc.patient.isSeniorCitizen || enc.patient.isPwd,
          enc.philhealth.hciAmount,
          enc.philhealth.pfAmount,
          enc.hmo.approvedAmount,
          enc.waterfall.roomUpgradeExcess,
          enc.doctorExcessPf || 0
        );

        setEncounters((prev) =>
          prev.map((e) => {
            if (e.id !== encounterId) return e;
            return {
              ...e,
              items: updatedItems,
              waterfall: newWaterfall,
              remainingBalance: Math.max(0, Number((newWaterfall.netPatientDue - (e.amountPaid || 0)).toFixed(2)))
            };
          })
        );

        try {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemId);
          const targetId = isUuid ? itemId : (item?.code || itemId);
          await apiClient.deleteChargeItem(targetId);
        } catch (err) {
          console.warn('Backend deleteChargeItem sync notice:', err);
        }
      }
    });
  };

  // --- ENCOUNTER CRUD IMPLEMENTATION ---
  const admitPatient = async (data: any) => {
    const newEncId = `enc-${Date.now().toString().slice(-4)}`;
    const encNumber = `ENC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const billNumber = `SOA-SJMC-26-${Math.floor(1000 + Math.random() * 9000)}`;

    const initialItems: ChargemasterItem[] = [
      {
        id: `item-${Date.now()}-1`,
        code: 'CHG-ROOM-001',
        description: `Inpatient Room Accommodation (${data.roomCategory?.replace(/_/g, ' ') || 'Regular Private'}) - Day 1`,
        category: 'ROOM_BOARD',
        qty: 1,
        unitPrice: data.dailyRoomRate || 3200,
        grossAmount: data.dailyRoomRate || 3200,
        isVatable: true,
        philhealthCovered: 0,
        hmoCovered: 0,
        patientOop: data.dailyRoomRate || 3200,
        status: 'COVERED',
        isDisputed: false,
        plainLanguageExplainer: 'Standard daily room rate charged on admission.'
      },
      {
        id: `item-${Date.now()}-2`,
        code: 'CHG-SUPP-001',
        description: 'Standard Inpatient Admission & Hygiene Kit',
        category: 'CENTRAL_SUPPLIES',
        qty: 1,
        unitPrice: 850,
        grossAmount: 850,
        isVatable: true,
        philhealthCovered: 0,
        hmoCovered: 0,
        patientOop: 850,
        status: 'COVERED',
        isDisputed: false,
        plainLanguageExplainer: 'Basic clinical hygiene and admission materials.'
      }
    ];

    const newWaterfall = recalculateWaterfall(
      initialItems,
      data.isSeniorCitizen || data.isPwd,
      18000,
      6000,
      data.hmoProvider ? 50000 : 0,
      0,
      0
    );

    const newEncounter: Encounter = {
      id: newEncId,
      encounterNumber: encNumber,
      billNumber,
      billState: 'DRAFT',
      admissionDate: new Date().toISOString().split('T')[0],
      stage: 'MGH_DECLARED',
      slaStatus: 'NORMAL',
      elapsedMinutes: 5,
      mghOrderTimestamp: new Date().toISOString(),
      primaryDiagnosis: data.primaryDiagnosis,
      primaryIcd10: 'Z00.0',
      roomBed: data.roomBed,
      bedNumber: data.roomBed,
      roomCategory: data.roomCategory,
      roomType: data.roomCategory?.replace(/_/g, ' '),
      dailyRoomRate: data.dailyRoomRate,
      dailyRoomAllowance: data.dailyRoomRate || 3200,
      attendingDoctor: data.attendingDoctor,
      doctorPan: 'PAN-DOC-2026-001',
      doctorAgreedFee: 6000,
      doctorExcessPf: 0,
      pharmacyRtsCleared: false,
      unreturnedMedsCount: 0,
      patient: {
        id: `pat-${Date.now().toString().slice(-4)}`,
        mrn: data.mrn,
        fullName: data.fullName,
        maskedName: data.fullName,
        gender: data.gender,
        age: data.age,
        isSeniorCitizen: data.isSeniorCitizen,
        seniorCitizenId: data.isSeniorCitizen ? 'SC-2026-ACTIVE' : undefined,
        isPwd: data.isPwd,
        pwdId: data.isPwd ? 'PWD-2026-ACTIVE' : undefined,
        philhealthPin: data.philhealthPin,
        contactNumber: '0917-000-0000'
      },
      hmo: {
        providerName: data.hmoProvider || 'Self-Pay / None',
        hmoName: data.hmoProvider || 'Self-Pay / None',
        cardMasked: 'CARD-***-9921',
        loaNumber: data.hmoPolicyNumber ? `LOA-${data.hmoPolicyNumber.slice(-6)}` : 'N/A',
        policyMbl: 150000,
        mblRemaining: data.hmoProvider ? 150000 : 0,
        dailyRoomAllowance: data.dailyRoomRate || 3200,
        initialLoaApproved: true,
        finalLoaStatus: data.hmoProvider ? 'PENDING_SUBMISSION' : 'APPROVED',
        approvedAmount: data.hmoProvider ? 50000 : 0,
        disallowedConsumables: 0
      },
      philhealth: {
        id: `clm-${Date.now().toString().slice(-4)}`,
        primaryIcd10: 'Z00.0',
        primaryDescription: data.primaryDiagnosis || 'General Examination',
        caseRateCode: 'P01',
        totalCaseRate: 24000,
        hciAmount: 18000,
        pfAmount: 6000,
        isNbb: false,
        rthRiskScore: 0.12,
        cf4VitalsRecorded: true,
        cf4CourseInWardRecorded: true,
        cf4LabsConsistent: true,
        eSoaXmlConformity: true,
        status: 'CLEAN'
      },
      items: initialItems,
      waterfall: newWaterfall,
      amountPaid: 0,
      remainingBalance: newWaterfall.netPatientDue,
      paymentHistory: [],
      receipts: [],
      disputes: [],
      timeline: [
        {
          id: `evt-${Date.now()}-1`,
          timestamp: new Date().toISOString(),
          timeDisplay: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          title: 'Patient Admitted',
          actor: 'Admissions Lead',
          type: 'BILLING',
          status: 'COMPLETED',
          description: `Patient admitted to ${data.roomBed} under ${data.attendingDoctor}. Diagnosis: ${data.primaryDiagnosis}.`
        }
      ]
    };

    setEncounters((prev) => [newEncounter, ...prev]);
    setSelectedEncounterId(newEncId);

    try {
      const res = await apiClient.createEncounter({
        fullName: data.fullName,
        mrn: data.mrn,
        gender: data.gender,
        age: data.age,
        isSeniorCitizen: data.isSeniorCitizen,
        isPwd: data.isPwd,
        philhealthPin: data.philhealthPin,
        roomBed: data.roomBed,
        roomCategory: data.roomCategory,
        dailyRoomRate: data.dailyRoomRate,
        attendingDoctor: data.attendingDoctor,
        primaryDiagnosis: data.primaryDiagnosis,
        hmoProvider: data.hmoProvider,
        hmoPolicyNumber: data.hmoPolicyNumber
      });

      if (res && res.encounter) {
        const backendEnc = res.encounter;
        setEncounters((prev) =>
          prev.map((e) => {
            if (e.id !== newEncId) return e;
            return {
              ...e,
              id: backendEnc.id,
              encounterNumber: backendEnc.encounterNumber || e.encounterNumber,
              billNumber: backendEnc.billNumber || e.billNumber,
              items: backendEnc.items && backendEnc.items.length > 0 ? backendEnc.items : e.items
            };
          })
        );
        setSelectedEncounterId(backendEnc.id);
      }
    } catch (err) {
      console.warn('Backend createEncounter sync notice:', err);
    }
  };

  const editEncounter = async (encounterId: string, updates: any) => {
    setEncounters((prev) =>
      prev.map((e) => {
        if (e.id !== encounterId) return e;
        return {
          ...e,
          ...updates,
          bedNumber: updates.roomBed || e.bedNumber,
          roomBed: updates.roomBed || e.roomBed
        };
      })
    );

    try {
      await apiClient.editEncounter(encounterId, updates);
    } catch (err) {
      console.warn('Backend editEncounter sync notice:', err);
    }
  };

  const deleteEncounter = (encounterId: string) => {
    const enc = encounters.find((e) => e.id === encounterId) || selectedEncounter;
    const pName = enc?.patient.fullName || enc?.patient.maskedName || 'Patient';
    const encNum = enc?.encounterNumber || encounterId;
    const bed = enc?.roomBed || enc?.bedNumber || 'Assigned Bed';

    requestConfirmation({
      title: 'Discharge & Remove Inpatient Encounter',
      description: `Are you sure you want to remove encounter ${encNum} for ${pName}? This will immediately deallocate and release ${bed} back to available hospital bed inventory.`,
      confirmLabel: 'Remove Encounter',
      cancelLabel: 'Keep Encounter',
      variant: 'danger',
      contextInfo: [
        { label: 'Patient Name', value: pName },
        { label: 'Encounter Number', value: encNum },
        { label: 'Room / Bed', value: bed },
        { label: 'Net Patient Due', value: formatPhp(enc?.waterfall.netPatientDue || 0) }
      ],
      onConfirm: async () => {
        setEncounters((prev) => {
          const remaining = prev.filter((e) => e.id !== encounterId);
          if (selectedEncounterId === encounterId && remaining.length > 0) {
            setSelectedEncounterId(remaining[0].id);
          }
          return remaining;
        });

        try {
          await apiClient.deleteEncounter(encounterId);
        } catch (err) {
          console.warn('Backend deleteEncounter sync notice:', err);
        }
      }
    });
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
        // Auth & Session
        isAuthenticated,
        currentUser,
        login,
        logout,
        // CRUD Modal States
        isAddChargeModalOpen,
        isEditChargeModalOpen,
        chargeToEdit,
        isAdmitPatientModalOpen,
        isEditEncounterModalOpen,
        encounterToEdit,
        // CRUD Modal Openers
        openAddChargeModal,
        openEditChargeModal,
        closeAddEditChargeModal,
        openAdmitPatientModal,
        closeAdmitPatientModal,
        openEditEncounterModal,
        closeEditEncounterModal,
        // CRUD Actions
        addChargeItem,
        editChargeItem,
        deleteChargeItem,
        admitPatient,
        editEncounter,
        deleteEncounter,
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
        verifyGatePass,
        executePromissoryNote,
        freezeDisputeItem,
        supervisoryWaiveItem,
        finalizeBill,
        sendBillToPatient,
        recordPatientViewed,
        fileBillingDispute,
        processDemoPayment,
        printDocument: (config: PrintDocumentConfig) => {
          printEngine.print(config);
        },
        confirmationState,
        requestConfirmation,
        closeConfirmation
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

// AQROMED Rebranded Context Aliases
export const useAqromed = useMedCore;
export const AqromedProvider = MedCoreProvider;
export const AqromedContext = MedCoreContext;
