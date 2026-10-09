import { validateGovernmentId, type GovernmentIdType } from '../../../shared/governmentId';
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
  createOrGetReceipt
} from '@/features/patient-clarify';
import { printEngine, PrintDocumentConfig } from '@/services/printEngine';
import type { ConfirmationModalVariant, ConfirmationContextInfo } from '@/components/modals';
import { apiClient, ApiError, ApiUser } from '@/api';

export interface ConfirmModalRequest {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmationModalVariant;
  contextInfo?: ConfirmationContextInfo[];
  requiresValidationFriction?: boolean;
  validationKeyword?: string;
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

  // Operational Transitions
  advanceStage: (encounterId: string) => Promise<void>;
  nudgeDoctor: (encounterId: string) => void;
  applyAccreditedCeiling: (encounterId: string) => Promise<void>;
  clearPharmacyRts: (encounterId: string) => Promise<void>;
  approveHmoFinalLoa: (encounterId: string) => Promise<void>;
  settlePatientBalance: (encounterId: string, channel: 'QR_PH' | 'GCASH' | 'MAYA' | 'PROMISSORY_NOTE') => Promise<void>;
  issueDigitalGatePass: (encounterId: string) => void;
  verifyGatePass: (encounterId: string) => Promise<void>;
  signDoctorFee: (encounterId: string, agreedFee: number) => Promise<void>;
  executePromissoryNote: (
    encounterId: string,
    borrowerName: string,
    idType: GovernmentIdType,
    idNumber: string,
    months: 3 | 6 | 12,
    customPrincipal?: number
  ) => Promise<void>;
  freezeDisputeItem: (encounterId: string, itemId: string, reason: string) => Promise<void>;
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
    cardBrand?: 'VISA' | 'MASTERCARD';
    cardLast4?: string;
  }) => Promise<{ success: boolean; paymentRecord?: DemoPaymentRecord; error?: string }>;
  // Auth & Session
  isAuthenticated: boolean;
  isVerifyingSession: boolean;
  sessionError: string | null;
  sessionNotice: string | null;
  retrySession: () => void;
  currentUser: any | null;
  login: (credentials: { email: string; password: string; facilityCode?: string }) => Promise<{ success: boolean; error?: string }>;
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

  // Data Loading & API Error State
  isLoadingEncounters: boolean;
  apiError: string | null;
  clearApiError: () => void;
  refreshEncounters: () => Promise<boolean>;
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

  // API Loading & Error State
  const [isLoadingEncounters, setIsLoadingEncounters] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const clearApiError = () => setApiError(null);

  const refreshEncounters = async (retries = 2): Promise<boolean> => {
    try {
      setIsLoadingEncounters(true);
      const res = await apiClient.getEncounters();
      if (res && Array.isArray(res.items)) {
        setEncounters(res.items);
        setApiError(null);
        setSelectedEncounterId((prev) => {
          if (res.items.some((e: any) => e.id === prev || e.encounterNumber === prev)) return prev;
          return res.items[0]?.id || '';
        });
        return true;
      }
      throw new Error('The server returned an incomplete encounter list.');
    } catch (err: any) {
      if (err instanceof ApiError && (err.status === 401 || err.code === 'SESSION_CHANGED')) return false;
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        return refreshEncounters(retries - 1);
      }
      console.warn('Failed to load encounters from API after retries:', err);
      setEncounters((current) => {
        if (!current || current.length === 0) {
          setApiError(`Backend API communication error: ${err.message || 'Cannot fetch encounters'}`);
        }
        return current;
      });
      return false;
    } finally {
      setIsLoadingEncounters(false);
    }
  };

  const setActiveRole = (role: UserRole) => {
    apiClient
      .switchRole(role)
      .then((res: { success: boolean; user: ApiUser }) => {
        if (res?.success && res.user) {
          setCurrentUser(res.user);
          setActiveRoleState(res.user.role as UserRole);
        }
      })
      .catch((err: Error) => {
        console.warn('API switchRole sync notice:', err);
        setApiError(`Role switch synchronization failed on server: ${err.message}`);
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isVerifyingSession, setIsVerifyingSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [sessionCheck, setSessionCheck] = useState(0);
  const retrySession = () => setSessionCheck(value => value + 1);

  const sessionGeneration = useRef(0);
  const verifiedSession = useRef(false);
  function clearSessionState(reason?: 'expired') {
    const hadVerifiedSession = verifiedSession.current;
    verifiedSession.current = false;
    sessionGeneration.current++;
    setApiError(null);
    setSessionNotice(previous => reason === 'expired'
      ? hadVerifiedSession ? 'Your session expired. Sign in again to continue.' : previous
      : null);
    setIsAuthenticated(false); setCurrentUser(null); setEncounters([]);
    setSelectedEncounterId(''); setActiveRoute('COMMAND_CENTER'); setActiveRoleState('BILLING_SPECIALIST');
    setSessionError(null); setConfirmationState(null); setDossierEncounter(null);
    setIsDossierDrawerOpen(false); setIsActionDrawerOpen(false); setIsDoctorQuickSignOpen(false);
    setIsPromissoryModalOpen(false); setIsGatePassModalOpen(false); setIsWhyDoIOweThisOpen(false);
    setIsAddChargeModalOpen(false); setIsEditChargeModalOpen(false); setChargeToEdit(null);
    setIsAdmitPatientModalOpen(false); setIsEditEncounterModalOpen(false); setEncounterToEdit(null);
    setSearchQuery(''); setSelectedWhyItem(null); setIsSearchModalOpen(false);
    try { for (const key of ['medcore_auth', 'medcore_user', 'aqromed_auth', 'aqromed_user']) localStorage.removeItem(key); } catch {}
  }
  useEffect(() => apiClient.client.onSessionExpired(() => clearSessionState('expired')), []);

  // Authoritative Session Verification & Data Hydration on mount
  useEffect(() => {
    let isMounted = true;
    const generation = sessionGeneration.current;
    setIsVerifyingSession(true);
    setSessionError(null);
    apiClient
      .getMe()
      .then(async (res: { authenticated: boolean; user: ApiUser }) => {
        if (!isMounted || generation !== sessionGeneration.current) return;
        if (res?.authenticated && res.user) {
          verifiedSession.current = true;
          setIsAuthenticated(true);
          setCurrentUser(res.user);
          if (res.user.role) {
            setActiveRoleState(res.user.role as UserRole);
            apiClient.setDemoRole(res.user.role);
          }
          if (typeof window !== 'undefined') {
            localStorage.setItem('medcore_auth', 'true');
            localStorage.setItem('medcore_user', JSON.stringify(res.user));
          }
          if (!await refreshEncounters() && isMounted && generation === sessionGeneration.current) setSessionError('We could not load hospital records. Check your connection and try again.');
        } else {
          setIsAuthenticated(false);
          setCurrentUser(null);
          apiClient.setDemoRole(null);
        }
      })
      .catch((err: unknown) => {
        if (!isMounted || generation !== sessionGeneration.current) return;
        if (!(err instanceof ApiError && (err.status === 401 || err.code === 'SESSION_CHANGED'))) {
          setSessionError('We could not verify your session. Check your connection and try again.');
        }
      })
      .finally(() => { if (isMounted) setIsVerifyingSession(false); });

    return () => {
      isMounted = false;
    };
  }, [sessionCheck]);

  const login = async (credentials: { email: string; password: string; facilityCode?: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await apiClient.login(credentials);
      if (res?.success && res.user) {
        clearSessionState();
        verifiedSession.current = true;
        const generation = sessionGeneration.current;
        setIsVerifyingSession(true);
        setIsAuthenticated(true);
        setCurrentUser(res.user);
        if (typeof window !== 'undefined') {
          localStorage.setItem('medcore_auth', 'true');
          localStorage.setItem('medcore_user', JSON.stringify(res.user));
        }
        if (res.user.role) {
          setActiveRoleState(res.user.role as UserRole);
          apiClient.setDemoRole(res.user.role);
        }
        setApiError(null);
        if (!await refreshEncounters() && generation === sessionGeneration.current) setSessionError('We could not load hospital records. Check your connection and try again.');
        setIsVerifyingSession(false);
        return { success: true };
      }
      return { success: false, error: 'Login failed: Invalid server response' };
    } catch (err: any) {
      console.error('API login failure:', err);
      return { success: false, error: err.message || 'Authentication failed' };
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (err) {
      console.warn('API logout notice:', err);
    } finally {
      clearSessionState();
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

  // Financial state is accepted only from a confirmed server response.
  const acceptServerEncounter = (encounterId: string, response: any, generation: number) => {
    if (generation !== sessionGeneration.current) throw new ApiError('Your session changed. Sign in again.', 0, 'SESSION_CHANGED');
    if (!response?.success || !response.encounter?.encounterNumber) throw new Error('The hospital did not confirm this update. Refresh and try again.');
    setEncounters(prev => prev.map(enc => enc.id === encounterId || enc.encounterNumber === response.encounter.encounterNumber ? response.encounter : enc));
  };
  const confirmEncounterMutation = async (encounterId: string, label: string, mutation: () => Promise<any>) => {
    const generation = sessionGeneration.current;
    try { acceptServerEncounter(encounterId, await mutation(), generation); setApiError(null); }
    catch (error: unknown) {
      if (generation === sessionGeneration.current) setApiError(`${label}: ${error instanceof Error ? error.message : 'Please try again.'}`);
      throw error;
    }
  };
  const refreshServerEncounter = async (encounterId: string) => {
    const generation = sessionGeneration.current;
    const encounter = await apiClient.getEncounter(encounterId);
    acceptServerEncounter(encounterId, { success: true, encounter }, generation);
  };
  const advanceStage = (encounterId: string) => confirmEncounterMutation(encounterId, 'Could not advance discharge', () => apiClient.advanceStage(encounterId));
  const signDoctorFee = (encounterId: string, agreedFee: number) => confirmEncounterMutation(encounterId, 'Could not sign professional fee', () => apiClient.doctorQuickSign(encounterId, agreedFee));

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

  const applyAccreditedCeiling = (encounterId: string) => confirmEncounterMutation(encounterId, 'Could not apply accredited ceiling', () => apiClient.applyAccreditedCeiling(encounterId));
  const clearPharmacyRts = (encounterId: string) => confirmEncounterMutation(encounterId, 'Could not clear pharmacy audit', () => apiClient.clearPharmacyRts(encounterId));

  const approveHmoFinalLoa = async (encounterId: string) => {
    const enc = encounters.find((e) => e.id === encounterId);
    const generation = sessionGeneration.current;
    setApiError(null);
    try {
      const res = await apiClient.approveHmoFinalLoa(encounterId, {
        approvedAmount: enc?.hmo?.approvedAmount || enc?.waterfall?.hmoApprovedAmount || 0,
        disallowedConsumables: enc?.hmo?.disallowedConsumables || 0
      });
      if (generation !== sessionGeneration.current) {
        throw new ApiError('Your session changed. Sign in again to continue.', 0, 'SESSION_CHANGED');
      }
      if (res?.success && res.encounter?.hmo?.finalLoaStatus === 'APPROVED') {
        setEncounters((prev) =>
          prev.map((e) => (e.id === encounterId || e.encounterNumber === res.encounter.encounterNumber ? res.encounter : e))
        );
        setApiError(null);
        return;
      }
      throw new Error('The server did not confirm the HMO approval. Please refresh and try again.');
    } catch (err: unknown) {
      // ConfirmationModal owns retryable errors. Never resolve a rejected
      // approval or recreate the old global toast after session expiration.
      if (err instanceof ApiError && err.code === 'NETWORK_CONNECTION_ERROR') {
        throw new Error('Could not reach the hospital server. Check your connection and try again.');
      }
      throw err;
    }

  };

  const issueDigitalGatePass = (encounterId: string) => {
    const encounter = encounters.find(enc => enc.id === encounterId);
    if (!encounter?.dischargePass || encounter.stage !== 'CLEARED_GATE_PASS') {
      setApiError('Complete hospital settlement before opening the discharge pass.');
      return;
    }
    setSelectedEncounterId(encounterId);
    setIsGatePassModalOpen(true);
  };
  const verifyGatePass = async (encounterId: string) => {
    const generation = sessionGeneration.current;
    const pass = encounters.find(enc => enc.id === encounterId)?.dischargePass;
    try {
      if (!pass?.exitPin) throw new Error('Refresh the hospital discharge pass before verification.');
      const result = await apiClient.verifyExitPass(pass.passNumber, pass.exitPin);
      if (generation !== sessionGeneration.current) throw new Error('Your session changed.');
      if (!result?.verified || result.status !== 'VERIFIED_AT_LOBBY') throw new Error('The hospital did not confirm lobby verification.');
      await refreshServerEncounter(encounterId);
    } catch (error: unknown) {
      if (generation === sessionGeneration.current) setApiError(error instanceof Error ? error.message : 'Could not verify the discharge pass.');
      throw error;
    }
  };
  const settlePatientBalance = async (encounterId: string, channel: 'QR_PH' | 'GCASH' | 'MAYA' | 'PROMISSORY_NOTE') => {
    const enc = encounters.find(enc => enc.id === encounterId);
    if (!enc || enc.stage !== 'PENDING_SETTLEMENT') { setApiError('Wait for the hospital to finalize discharge checks before settlement.'); return; }
    setSelectedEncounterId(encounterId);
    if (channel === 'PROMISSORY_NOTE') { openPromissoryModal(encounterId); return; }
    const result = await processDemoPayment({ encounterId, amount: enc.remainingBalance ?? Math.max(0, enc.waterfall.netPatientDue - (enc.amountPaid ?? 0)),
      paymentRail: channel, payerName: enc.patient.fullName || enc.patient.maskedName, payerContactMasked: '0917-***-****' });
    if (!result.success) { setApiError(result.error || 'The hospital did not confirm payment.'); return; }
    setIsGatePassModalOpen(true);
  };

  const executePromissoryNote = async (
    encounterId: string,
    borrowerName: string,
    idType: GovernmentIdType,
    idNumber: string,
    months: 3 | 6 | 12,
    customPrincipal?: number
  ) => {
    const encTarget = encounters.find((e) => e.id === encounterId);
    const targetPrincipal = customPrincipal !== undefined && customPrincipal !== null
      ? customPrincipal
      : (promissoryCustomAmount !== null ? promissoryCustomAmount : (encTarget?.remainingBalance ?? Math.max(0, (encTarget?.waterfall.netPatientDue ?? 0) - (encTarget?.amountPaid ?? 0))));

    const identity = validateGovernmentId(idType, idNumber);
    if (!identity.valid) {
      setApiError(identity.error);
      throw new Error(identity.error);
    }
    const generation = sessionGeneration.current;
    setApiError(null);
    try {
      const res = await apiClient.executePromissoryNote(encounterId, {
        borrowerName,
        borrowerRelationship: 'GUARANTOR',
        borrowerIdType: idType,
        borrowerIdNumber: identity.normalized,
        installmentMonths: months,
        principalAmount: targetPrincipal
      });
      if (!res?.success || !res.promissoryNote?.id || !res.encounter) {
        throw new Error('The hospital did not confirm this payment plan. Please try again.');
      }
      acceptServerEncounter(encounterId, res, generation);
      setIsPromissoryModalOpen(false);
      if (res.dischargePass || res.encounter.dischargePass) setIsGatePassModalOpen(true);
    } catch (err: any) {
      setApiError(`Failed to execute promissory note on server: ${err.message || 'Unknown error'}`);
      throw err;
    }
  };

  const freezeDisputeItem = (encounterId: string, itemId: string, reason: string) => confirmEncounterMutation(encounterId, 'Could not file billing dispute', () => apiClient.fileDispute(encounterId, { chargeId: itemId, reason, disputeCategory: 'OTHER' }));

  const supervisoryWaiveItem = async (encounterId: string, itemId: string, notes: string) => {
    const encTarget = encounters.find((e) => e.id === encounterId);
    const targetDispute = encTarget?.disputes?.find((d) => d.itemId === itemId);
    if (!targetDispute?.id) {
      setApiError('This charge has no persisted dispute to waive. Refresh the encounter and try again.');
      return;
    }
    try {
      await confirmEncounterMutation(encounterId, 'Failed to execute supervisory waiver', () => apiClient.waiveDispute(targetDispute.id, notes));
    } catch { return; }

  };

  // Cross-tab messages are refresh hints, never an authoritative balance ledger.
  usePatientBillingSync(msg => {
    void refreshServerEncounter(msg.encounterId).catch(() => { /* Retain confirmed state on read failure. */ });
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
    const magicLink = `https://medcore.stjude.ph/clarify/${encounterId}?token=${token}`;
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

  const fileBillingDispute = async (encounterId: string, itemId: string, reason: string) => {
    await freezeDisputeItem(encounterId, itemId, reason);
    broadcastBillingSync({ type: 'DISPUTE_FILED', encounterId, itemId, reason });
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
    cardBrand?: 'VISA' | 'MASTERCARD';
    cardLast4?: string;
  }): Promise<{ success: boolean; paymentRecord?: DemoPaymentRecord; error?: string }> => {
    // Concurrent mutex guard
    if (inFlightPaymentsRef.current.has(params.encounterId)) {
      return { success: false, error: 'A payment is currently being processed for this statement. Please wait.' };
    }
    inFlightPaymentsRef.current.add(params.encounterId);
    const generation = sessionGeneration.current;

    try {
      const enc = encounters.find((e) => e.id === params.encounterId);
      if (!enc) {
        return { success: false, error: 'Encounter record not found.' };
      }

      if (enc.stage !== 'PENDING_SETTLEMENT') return { success: false, error: 'Wait for the hospital to complete discharge checks.' };
      const currentRemaining = enc.remainingBalance ?? Math.max(0, enc.waterfall.netPatientDue - (enc.amountPaid ?? 0));

      if (currentRemaining <= 0 && params.paymentRail !== 'PROMISSORY_NOTE') {
        return { success: false, error: 'This statement is already fully settled (Remaining Balance: ₱0.00).' };
      }

      if (params.amount <= 0) {
        return { success: false, error: 'Payment amount must be greater than ₱0.00.' };
      }

      if (Math.round(params.amount * 100) > Math.round(currentRemaining * 100)) {
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

      const txRef = crypto.randomUUID();

      let serverRes: any = null;
      try {
        serverRes = await apiClient.processPayment(
          enc.id,
          {
            amount: params.amount,
            paymentRail: params.paymentRail,
            payerName: params.payerName || enc.patient.fullName || enc.patient.maskedName || 'Patient Guarantor',
            payerContactMasked: params.payerContactMasked || '0917-***-****',
            cardBrand: params.cardBrand,
            cardLast4: params.cardLast4,
            bankName: params.bankName,
            notes: (params as any).notes || `Settlement via ${params.paymentRail}`
          },
          txRef
        );
      } catch (err: any) {
        console.error('API processPayment failure:', err);
        setApiError(`Payment processing failed on server: ${err.message || 'Unknown error'}`);
        return { success: false, error: err.message || 'Payment rejected by server' };
      }

      if (generation !== sessionGeneration.current) return { success: false, error: 'Your session changed. Sign in again.' };
      if (serverRes?.success && serverRes.payment?.id && serverRes.payment.status === 'SUCCESS' && serverRes.receipt?.officialReceiptNumber && serverRes.encounter) {
        const canonicalReceipt: PaymentReceipt = {
          id: serverRes.receipt?.id || `RCPT-${serverRes.payment.id.slice(0, 8)}`,
          paymentId: serverRes.payment.paymentReference,
          billId: serverRes.payment.statementNumber,
          amount: Number(serverRes.payment.amount),
          paymentMethod: serverRes.payment.paymentRail as DemoPaymentRail,
          date: new Date(serverRes.receipt?.issuedAt || serverRes.payment.settledAt || Date.now()).toISOString(),
          referenceNumber: serverRes.payment.channelReference,
          officialReceiptNumber: serverRes.payment.officialReceiptNumber,
          payerName: serverRes.receipt?.payerName || serverRes.payment.payerName,
          payerContactMasked: serverRes.receipt?.payerContactMasked || serverRes.payment.payerContactMasked || '',
          gatewayAuthCode: serverRes.receipt?.gatewayAuthCode || serverRes.payment.gatewayAuthCode,
          notes: serverRes.payment.notes || undefined,
          isSimulatedDemo: true
        };

        const paymentRecord: DemoPaymentRecord = {
          id: serverRes.payment.id,
          paymentId: serverRes.payment.paymentReference,
          billId: serverRes.payment.statementNumber,
          encounterId: enc.id,
          amount: Number(serverRes.payment.amount),
          currency: 'PHP',
          paymentRail: serverRes.payment.paymentRail as DemoPaymentRail,
          channelReference: serverRes.payment.channelReference,
          gatewayAuthCode: serverRes.payment.gatewayAuthCode,
          payerName: serverRes.payment.payerName,
          payerContactMasked: serverRes.payment.payerContactMasked || '',
          timestamp: new Date(serverRes.payment.settledAt || serverRes.payment.createdAt || Date.now()).toISOString(),
          status: serverRes.payment.status,
          officialReceiptNumber: serverRes.payment.officialReceiptNumber,
          isSimulatedDemo: true,
          notes: serverRes.payment.notes || undefined,
          receiptId: canonicalReceipt.id,
          receipt: canonicalReceipt
        };

        if (serverRes.encounter) {
          setEncounters((prev) =>
            prev.map((e) => (e.id === enc.id || e.encounterNumber === serverRes.encounter.encounterNumber ? serverRes.encounter : e))
          );
        }

        broadcastBillingSync({
          type: 'PAYMENT_SETTLED',
          encounterId: enc.id,
          payment: paymentRecord,
          remainingBalance: Number(serverRes.encounter?.remainingBalance ?? 0),
          isFullySettled: Number(serverRes.encounter?.remainingBalance ?? 0) === 0
        });

        return { success: true, paymentRecord };
      }

      return { success: false, error: 'The hospital did not confirm this payment. Check your payment history before trying again.' };
    } finally {
      inFlightPaymentsRef.current.delete(params.encounterId);
    }
  };

  // --- CHARGEMASTER CRUD IMPLEMENTATION ---
  const addChargeItem = (encounterId: string, itemData: any) => confirmEncounterMutation(encounterId, 'Could not add charge', () => apiClient.addChargeItem(encounterId, itemData));
  const editChargeItem = (encounterId: string, itemId: string, updates: any) => {
    const item = encounters.find(enc => enc.id === encounterId)?.items.find(item => item.id === itemId);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemId);
    return confirmEncounterMutation(encounterId, 'Could not update charge', () => apiClient.editChargeItem(isUuid ? itemId : item?.code || itemId, updates));
  };
  const deleteChargeItem = (encounterId: string, itemId: string) => {
    const enc = encounters.find(enc => enc.id === encounterId);
    const item = enc?.items.find(item => item.id === itemId);
    requestConfirmation({ title: 'Delete Chargemaster Item', description: `Remove "${item?.description || 'Item'}" from this hospital bill?`,
      confirmLabel: 'Delete Item', cancelLabel: 'Keep Item', variant: 'danger',
      onConfirm: () => confirmEncounterMutation(encounterId, 'Could not delete charge', () => apiClient.deleteChargeItem(/^[0-9a-f-]{36}$/i.test(itemId) ? itemId : item?.code || itemId)) });
  };

  // --- ENCOUNTER CRUD IMPLEMENTATION ---
  const admitPatient = async (data: any) => {
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

      if (!res?.success || !res.encounter) throw new Error('The hospital did not confirm admission.');
      setEncounters(prev => [res.encounter, ...prev]);
      setSelectedEncounterId(res.encounter.id);
    } catch (error: unknown) {
      setApiError(error instanceof Error ? error.message : 'Could not admit the patient.');
      throw error;
    }
  };

  const editEncounter = (encounterId: string, updates: any) => confirmEncounterMutation(encounterId, 'Could not update encounter', () => apiClient.editEncounter(encounterId, updates));

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
        const generation = sessionGeneration.current;
        try {
          const response = await apiClient.deleteEncounter(encounterId);
          if (generation !== sessionGeneration.current) throw new Error('Your session changed.');
          if (!response?.success) throw new Error('The hospital did not confirm encounter removal.');
          setEncounters(prev => prev.filter(enc => enc.id !== encounterId));
          if (selectedEncounterId === encounterId) setSelectedEncounterId(encounters.find(enc => enc.id !== encounterId)?.id || '');
        } catch (error: unknown) { setApiError(error instanceof Error ? error.message : 'Could not remove encounter.'); throw error; }
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
        // Auth & Session
        isAuthenticated,
        isVerifyingSession,
        sessionError,
        sessionNotice,
        retrySession,
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
        advanceStage,
        signDoctorFee,
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
        closeConfirmation,
        // Data Loading & API Error State
        isLoadingEncounters,
        apiError,
        clearApiError,
        refreshEncounters
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
