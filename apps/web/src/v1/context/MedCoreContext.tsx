import type { ApiUser } from '@/v1/api';
import { apiClient, ApiError } from '@/v1/api';
import { notificationsApi } from '@/v1/api/notifications';
import type { ConfirmationContextInfo, ConfirmationModalVariant } from '@/v1/components/modals';
import type { DemoPaymentRail, DemoPaymentRecord } from '@/v1/features/patient-clarify';
import { broadcastBillingSync, usePatientBillingSync } from '@/v1/features/patient-clarify';
import type { PrintDocumentConfig } from '@/v1/services/printEngine';
import { printEngine } from '@/v1/services/printEngine';
import { validateGovernmentId, type GovernmentIdType } from '@/v1/shared/governmentId';
import type { StaffNotification } from '@/v1/shared/notifications';
import type { SmsDispatchResponse, SmsDispatchResult } from '@/v1/shared/sms';
import type { ChargemasterItem, Encounter, PaymentReceipt } from '@/v1/types/domain';
import type { NavRoute, UserRole } from '@/v1/types/navigation';
import { formatPhp } from '@/v1/utils/formatters';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

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
    itemContext?: { description?: string; itemId?: string } | string,
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
  nudgeDoctor: (encounterId: string) => Promise<void>;
  notifyPatientSms: (
    encounterId: string,
    templateType?: 'BILL_READY' | 'INTAKE_ORIENTATION',
  ) => Promise<void>;
  lastSmsDispatch: SmsDispatchResult | null;
  clearLastSmsDispatch: () => void;
  isSmsSending: (encounterId: string) => boolean;
  applyAccreditedCeiling: (encounterId: string) => Promise<void>;
  clearPharmacyRts: (encounterId: string) => Promise<void>;
  approveHmoFinalLoa: (encounterId: string) => Promise<void>;
  settlePatientBalance: (
    encounterId: string,
    channel: 'QR_PH' | 'GCASH' | 'MAYA' | 'PROMISSORY_NOTE',
  ) => Promise<void>;
  issueDigitalGatePass: (encounterId: string) => Promise<void>;
  verifyGatePass: (encounterId: string) => Promise<void>;
  signDoctorFee: (encounterId: string, agreedFee: number) => Promise<void>;
  executePromissoryNote: (
    encounterId: string,
    borrowerName: string,
    idType: GovernmentIdType,
    idNumber: string,
    months: 3 | 6 | 12,
    customPrincipal?: number,
  ) => Promise<void>;
  freezeDisputeItem: (encounterId: string, itemId: string, reason: string) => Promise<void>;
  supervisoryWaiveItem: (encounterId: string, itemId: string, notes: string) => void;

  // Patient Billing & Demo Settlement
  finalizeBill: (encounterId: string) => Promise<void>;
  sendBillToPatient: (encounterId: string) => Promise<void>;
  recordPatientViewed: (encounterId: string) => Promise<void>;
  fileBillingDispute: (encounterId: string, itemId: string, reason: string) => Promise<void>;
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
  initialLoginEmail: string;
  beginAccountSwitch: (email?: string) => Promise<void>;
  notifications: StaffNotification[];
  unreadNotificationCount: number;
  notificationError: string | null;
  refreshNotifications: () => Promise<void>;
  markNotificationsRead: (ids: string[]) => Promise<void>;
  login: (credentials: {
    email: string;
    password: string;
    facilityCode?: string;
  }) => Promise<{ success: boolean; error?: string }>;
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
  deleteChargeItem: (encounterId: string, itemId: string) => Promise<void>;
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
  refreshEncounters: (retries?: number, silent?: boolean) => Promise<boolean>;
}

const MedCoreContext = createContext<MedCoreContextType | undefined>(undefined);

export const MedCoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string>('');
  const [activeRoute, setActiveRoute] = useState<NavRoute>(
    () =>
      (({
        '/staff/account': 'ACCOUNT',
        '/staff/patients': 'PATIENTS',
        '/staff/users': 'STAFF_USERS',
        '/staff/audit': 'AUDIT_LOG',
        '/staff/lobby': 'LOBBY',
      })[window.location.pathname] as NavRoute) ?? 'COMMAND_CENTER',
  );
  const [activeRole, setActiveRoleState] = useState<UserRole>('BILLING_SPECIALIST');

  // API Loading & Error State
  const [isLoadingEncounters, setIsLoadingEncounters] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const clearApiError = () => setApiError(null);
  const [lastSmsDispatch, setLastSmsDispatch] = useState<SmsDispatchResult | null>(null);
  const [smsSending, setSmsSending] = useState<string[]>([]);
  const smsPending = useRef(new Map<string, Promise<void>>());
  const smsRetryKeys = useRef(new Map<string, string>());
  const smsIdentity = useRef('');
  const clearLastSmsDispatch = () => setLastSmsDispatch(null);
  const isSmsSending = (id: string) => smsSending.includes(id);

  const encounterRevision = useRef(0);
  const censusPending = useRef<{ generation: number; request: Promise<boolean> } | null>(null);
  const refreshEncounters = async (retries = 2, silent = false): Promise<boolean> => {
    const generation = sessionGeneration.current;
    if (censusPending.current?.generation === generation) return censusPending.current.request;
    const revision = encounterRevision.current;
    const request = (async () => {
      if (!silent) setIsLoadingEncounters(true);
      try {
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            const res = await apiClient.getEncounters();
            if (generation !== sessionGeneration.current || revision !== encounterRevision.current)
              return false;
            if (!Array.isArray(res?.items))
              throw new Error('The hospital returned incomplete encounter records.');
            setEncounters(res.items);
            return true;
          } catch (error: unknown) {
            if (
              generation !== sessionGeneration.current ||
              (error instanceof ApiError && (error.status === 401 || error.code === 'SESSION_CHANGED'))
            )
              return false;
            if (attempt < retries) {
              await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
              continue;
            }
            if (!silent)
              setApiError(error instanceof Error ? error.message : 'Could not refresh hospital records.');
          }
        }
        return false;
      } finally {
        if (generation === sessionGeneration.current && !silent) setIsLoadingEncounters(false);
      }
    })();
    censusPending.current = { generation, request };
    try {
      return await request;
    } finally {
      if (censusPending.current?.request === request) censusPending.current = null;
    }
  };

  const setActiveRole = (_role: UserRole) => {
    setApiError('Role changes require an administrator.');
  };

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'WARNING' | 'BREACH' | 'DISPUTED'>('ALL');

  // Modals & Drawers
  const [isActionDrawerOpen, setIsActionDrawerOpen] = useState(false);
  const [isPromissoryModalOpen, setIsPromissoryModalOpen] = useState(false);
  const [promissoryCustomAmount, setPromissoryCustomAmount] = useState<number | null>(null);
  const [promissoryItemContext, setPromissoryItemContext] = useState<{
    description?: string;
    itemId?: string;
  } | null>(null);
  const [isDoctorQuickSignOpen, setIsDoctorQuickSignOpen] = useState(false);
  const [isGatePassModalOpen, setIsGatePassModalOpen] = useState(false);
  const [isWhyDoIOweThisOpen, setIsWhyDoIOweThisOpen] = useState(false);
  const [selectedWhyItem, setSelectedWhyItem] = useState<ChargemasterItem | null>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isDossierDrawerOpen, setIsDossierDrawerOpen] = useState(false);
  const [dossierEncounter, setDossierEncounter] = useState<Encounter | null>(null);

  // Centralized Confirmation Modal State
  const [confirmationState, setConfirmationState] = useState<
    (ConfirmModalRequest & { isOpen: boolean }) | null
  >(null);

  const requestConfirmation = (request: ConfirmModalRequest) => {
    setConfirmationState({
      ...request,
      isOpen: true,
    });
  };

  const closeConfirmation = () => {
    setConfirmationState(null);
  };

  // Auth & Session State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  smsIdentity.current = `${currentUser?.id || ''}:${currentUser?.facilityId || ''}:${currentUser?.role || ''}`;
  useEffect(() => {
    setLastSmsDispatch(null);
  }, [currentUser?.id, currentUser?.facilityId, currentUser?.role]);
  const [isVerifyingSession, setIsVerifyingSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [sessionCheck, setSessionCheck] = useState(0);
  const retrySession = () => setSessionCheck((value) => value + 1);

  const sessionGeneration = useRef(0);
  const [initialLoginEmail, setInitialLoginEmail] = useState('');
  const [notifications, setNotifications] = useState<StaffNotification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const seenNotifications = useRef(new Set<string>());
  const notificationPending = useRef<{ generation: number; request: Promise<void> } | null>(null);
  const verifiedSession = useRef(false);
  function clearSessionState(reason?: 'expired') {
    const hadVerifiedSession = verifiedSession.current;
    verifiedSession.current = false;
    setIsVerifyingSession(false);
    sessionGeneration.current++;
    encounterRevision.current++;
    seenNotifications.current = new Set();
    setNotifications([]);
    setUnreadNotificationCount(0);
    setNotificationError(null);
    setApiError(null);
    setLastSmsDispatch(null);
    setSmsSending([]);
    smsPending.current.clear();
    smsRetryKeys.current.clear();
    setSessionNotice((previous) =>
      reason === 'expired'
        ? hadVerifiedSession
          ? 'Your session expired. Sign in again to continue.'
          : previous
        : null,
    );
    setIsAuthenticated(false);
    setCurrentUser(null);
    setEncounters([]);
    setSelectedEncounterId('');
    setActiveRoute('COMMAND_CENTER');
    setActiveRoleState('BILLING_SPECIALIST');
    setSessionError(null);
    setConfirmationState(null);
    setDossierEncounter(null);
    setIsDossierDrawerOpen(false);
    setIsActionDrawerOpen(false);
    setIsDoctorQuickSignOpen(false);
    setIsPromissoryModalOpen(false);
    setIsGatePassModalOpen(false);
    setIsWhyDoIOweThisOpen(false);
    setIsAddChargeModalOpen(false);
    setIsEditChargeModalOpen(false);
    setChargeToEdit(null);
    setIsAdmitPatientModalOpen(false);
    setIsEditEncounterModalOpen(false);
    setEncounterToEdit(null);
    setSearchQuery('');
    setSelectedWhyItem(null);
    setIsSearchModalOpen(false);
  }
  useEffect(() => apiClient.client.onSessionExpired(() => clearSessionState('expired')), []);

  // Authoritative Session Verification & Data Hydration on mount
  useEffect(() => {
    let isMounted = true;
    const generation = sessionGeneration.current;
    setIsVerifyingSession(true);
    setSessionError(null);

    // Resilient fallback timeout in case server connection hangs
    const timeoutId = setTimeout(() => {
      if (isMounted && generation === sessionGeneration.current) {
        setIsVerifyingSession(false);
        setSessionError('Session verification timed out. Check your connection and try again.');
      }
    }, 10000);

    apiClient
      .getMe()
      .then(async (res: { authenticated: boolean; user: ApiUser | null }) => {
        if (!isMounted || generation !== sessionGeneration.current) return;
        if (res?.authenticated && res.user) {
          verifiedSession.current = true;
          setIsAuthenticated(true);
          setCurrentUser(res.user);
          if (res.user.role) {
            setActiveRoleState(res.user.role as UserRole);
            apiClient.setDemoRole(res.user.role);
          }
          // Unblock the session view immediately so dashboard renders with cached/skeleton state
          if (isMounted) setIsVerifyingSession(false);
          if (!res.user.permissions.includes('encounter:read')) {
            setIsLoadingEncounters(false);
            setActiveRoute('LOBBY');
            return;
          }
          void refreshEncounters(2, false).then((ok) => {
            if (!ok && isMounted && generation === sessionGeneration.current && encounters.length === 0) {
              setApiError('Unable to synchronize real-time hospital records. Click Refresh to retry.');
            }
          });
        } else {
          setIsAuthenticated(false);
          setCurrentUser(null);
          apiClient.setDemoRole(null);
          if (isMounted) setIsVerifyingSession(false);
        }
      })
      .catch((err: unknown) => {
        if (!isMounted || generation !== sessionGeneration.current) return;
        if (!(err instanceof ApiError && (err.status === 401 || err.code === 'SESSION_CHANGED'))) {
          setSessionError('We could not verify your session. Check your connection and try again.');
        }
        if (isMounted) setIsVerifyingSession(false);
      })
      .finally(() => {
        clearTimeout(timeoutId);
        if (isMounted && generation === sessionGeneration.current) {
          setIsVerifyingSession(false);
        }
      });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [sessionCheck]);

  const login = async (_credentials: { email: string; password: string; facilityCode?: string }) => ({
    success: false,
    error: 'Use the v2 staff sign-in page.',
  });

  const logout = async () => {
    const request = apiClient.logout();
    apiClient.setAuthToken(null);
    apiClient.setDemoRole(null);
    clearSessionState();
    try {
      await request;
    } finally {
      window.location.assign('/staff/login');
    }
  };
  const beginAccountSwitch = async (email = '') => {
    setInitialLoginEmail(email);
    const request = logout();
    setSessionNotice('Sign in to the selected staff account to continue.');
    await request;
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

  const openEditChargeModal = (_item: ChargemasterItem) => {
    setApiError('Charge editing is unavailable. Remove with a reason and add the corrected charge.');
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
    setEncounterToEdit(enc || encounters.find((e) => e.id === selectedEncounterId) || encounters[0]);
    setIsEditEncounterModalOpen(true);
  };

  const closeEditEncounterModal = () => {
    setIsEditEncounterModalOpen(false);
    setEncounterToEdit(null);
  };

  // In-flight mutex lock to prevent concurrent double-processing of payments per encounter
  const paymentRetryKeys = useRef(new Map<string, string>());
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

  const selectedEncounter = encounters.find((e) => e.id === selectedEncounterId) || encounters[0];

  const selectEncounter = (id: string) => {
    setSelectedEncounterId(id);
  };

  const openActionDrawer = () => setIsActionDrawerOpen(true);
  const closeActionDrawer = () => setIsActionDrawerOpen(false);

  const openPromissoryModal = (
    encounterId?: string,
    customAmount?: number,
    itemContext?: { description?: string; itemId?: string } | string,
  ) => {
    if (encounterId) {
      setSelectedEncounterId(encounterId);
    } else {
      const current = encounters.find((e) => e.id === selectedEncounterId);
      if (!current || current.waterfall.netPatientDue <= 0) {
        const firstEligible = encounters.find((e) => e.waterfall.netPatientDue > 0);
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
    if (generation !== sessionGeneration.current)
      throw new ApiError('Your session changed. Sign in again.', 0, 'SESSION_CHANGED');
    if (!response?.success || !response.encounter?.encounterNumber)
      throw new Error('The hospital did not confirm this update. Refresh and try again.');
    if (response.smsNotification?.dispatch) setLastSmsDispatch(response.smsNotification.dispatch);
    encounterRevision.current++;
    setEncounters((prev) =>
      prev.some((enc) => enc.id === encounterId || enc.encounterNumber === response.encounter.encounterNumber)
        ? prev.map((enc) =>
            enc.id === encounterId || enc.encounterNumber === response.encounter.encounterNumber
              ? response.encounter
              : enc,
          )
        : [...prev, response.encounter],
    );
  };
  const confirmEncounterMutation = async (
    encounterId: string,
    label: string,
    mutation: () => Promise<any>,
  ) => {
    const generation = sessionGeneration.current;
    try {
      acceptServerEncounter(encounterId, await mutation(), generation);
      setApiError(null);
    } catch (error: unknown) {
      if (generation === sessionGeneration.current)
        setApiError(`${label}: ${error instanceof Error ? error.message : 'Please try again.'}`);
      throw error;
    }
  };
  const refreshServerEncounter = async (encounterId: string) => {
    const generation = sessionGeneration.current;
    const revision = encounterRevision.current;
    const encounter = await apiClient.getEncounter(encounterId);
    if (revision !== encounterRevision.current) return;
    acceptServerEncounter(encounterId, { success: true, encounter }, generation);
  };
  const advanceStage = (encounterId: string) =>
    confirmEncounterMutation(encounterId, 'Could not advance discharge', () =>
      apiClient.advanceStage(encounterId),
    );
  const signDoctorFee = (encounterId: string, agreedFee: number) =>
    confirmEncounterMutation(encounterId, 'Could not sign professional fee', () =>
      apiClient.doctorQuickSign(encounterId, agreedFee),
    );

  const dispatchSms = (
    encounterId: string,
    type: string,
    mutation: (requestKey: string) => Promise<SmsDispatchResponse>,
  ): Promise<void> => {
    const operation = `${type}:${encounterId}`;
    const pending = smsPending.current.get(operation);
    if (pending) return pending;
    const generation = sessionGeneration.current;
    const identity = smsIdentity.current;
    const requestKey = smsRetryKeys.current.get(operation) || crypto.randomUUID();
    smsRetryKeys.current.set(operation, requestKey);
    setSmsSending((previous) => [...new Set([...previous, encounterId])]);
    setApiError(null);
    setLastSmsDispatch(null);
    const request = (async () => {
      try {
        const response = await mutation(requestKey);
        if (generation !== sessionGeneration.current || identity !== smsIdentity.current) return;
        if (
          !response.success ||
          !response.dispatch?.isSimulated ||
          response.dispatch.provider !== 'SIMULATOR'
        )
          throw new Error('The server did not confirm a sandbox SMS.');
        setLastSmsDispatch(response.dispatch);
        smsRetryKeys.current.delete(operation);
        // Delivery has already succeeded. A read refresh failure must not encourage a resend.
        await refreshServerEncounter(encounterId).catch(() => {});
      } catch (error) {
        if (generation === sessionGeneration.current) {
          setApiError(error instanceof Error ? error.message : 'Could not simulate this SMS.');
          if (error instanceof ApiError && error.status >= 400 && error.status < 500)
            smsRetryKeys.current.delete(operation);
        }
      } finally {
        if (generation === sessionGeneration.current) {
          smsPending.current.delete(operation);
          if (![...smsPending.current.keys()].some((key) => key.endsWith(`:${encounterId}`)))
            setSmsSending((previous) => previous.filter((id) => id !== encounterId));
        }
      }
    })();
    smsPending.current.set(operation, request);
    return request;
  };
  const nudgeDoctor = (id: string) =>
    dispatchSms(id, 'DOCTOR_PF_NUDGE', (key) => apiClient.nudgeDoctor(id, key));
  const notifyPatientSms = (id: string, type: 'BILL_READY' | 'INTAKE_ORIENTATION' = 'BILL_READY') =>
    dispatchSms(id, type, (key) => apiClient.notifyPatientSms(id, type, key));

  const applyAccreditedCeiling = (encounterId: string) =>
    confirmEncounterMutation(encounterId, 'Could not apply accredited ceiling', () =>
      apiClient.applyAccreditedCeiling(encounterId),
    );
  const clearPharmacyRts = (encounterId: string) =>
    confirmEncounterMutation(encounterId, 'Could not clear pharmacy audit', () =>
      apiClient.clearPharmacyRts(encounterId),
    );

  const approveHmoFinalLoa = async (encounterId: string) => {
    const enc = encounters.find((e) => e.id === encounterId);
    const generation = sessionGeneration.current;
    setApiError(null);
    try {
      const res = await apiClient.approveHmoFinalLoa(encounterId, {
        approvedAmount: enc?.hmo?.approvedAmount || enc?.waterfall?.hmoApprovedAmount || 0,
        disallowedConsumables: enc?.hmo?.disallowedConsumables || 0,
      });
      if (generation !== sessionGeneration.current) {
        throw new ApiError('Your session changed. Sign in again to continue.', 0, 'SESSION_CHANGED');
      }
      if (res?.success && ['APPROVED', 'REJECTED'].includes(res.encounter?.hmo?.finalLoaStatus)) {
        acceptServerEncounter(encounterId, res, generation);
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

  const issueDigitalGatePass = async (encounterId: string) => {
    const encounter = encounters.find((enc) => enc.id === encounterId);
    const generation = sessionGeneration.current;
    if (encounter?.stage === 'PENDING_SETTLEMENT' && Number(encounter.remainingBalance) === 0) {
      try {
        const res = await apiClient.patients.releaseGatePass(encounterId);
        if (!res?.success || res.encounter?.stage !== 'CLEARED_GATE_PASS' || !res.encounter.dischargePass)
          throw new Error('The hospital did not confirm the discharge pass.');
        acceptServerEncounter(encounterId, res, generation);
      } catch (error) {
        if (generation === sessionGeneration.current)
          setApiError(error instanceof Error ? error.message : 'Could not release the discharge pass.');
        throw error;
      }
    } else if (!encounter?.dischargePass || encounter.stage !== 'CLEARED_GATE_PASS') {
      setApiError('Complete hospital settlement before opening the discharge pass.');
      return;
    }
    const fetched = await apiClient.patients.releaseGatePass(encounterId);
    acceptServerEncounter(encounterId, fetched, generation);
    if (generation !== sessionGeneration.current) return;
    setSelectedEncounterId(encounterId);
    setIsGatePassModalOpen(true);
  };
  const verifyGatePass = async (encounterId: string) => {
    const generation = sessionGeneration.current;
    const pass = encounters.find((enc) => enc.id === encounterId)?.dischargePass;
    try {
      if (!pass?.exitPin) throw new Error('Refresh the hospital discharge pass before verification.');
      const result = await apiClient.verifyExitPass(pass.passNumber, pass.exitPin);
      if (generation !== sessionGeneration.current) throw new Error('Your session changed.');
      if (!result?.verified || result.status !== 'VERIFIED_AT_LOBBY')
        throw new Error('The hospital did not confirm lobby verification.');
      await refreshServerEncounter(encounterId);
    } catch (error: unknown) {
      if (generation === sessionGeneration.current)
        setApiError(error instanceof Error ? error.message : 'Could not verify the discharge pass.');
      throw error;
    }
  };
  const settlePatientBalance = async (
    encounterId: string,
    channel: 'QR_PH' | 'GCASH' | 'MAYA' | 'PROMISSORY_NOTE',
  ) => {
    const enc = encounters.find((enc) => enc.id === encounterId);
    if (!enc || enc.stage !== 'PENDING_SETTLEMENT') {
      setApiError('Wait for the hospital to finalize discharge checks before settlement.');
      return;
    }
    setSelectedEncounterId(encounterId);
    if (channel === 'PROMISSORY_NOTE') {
      openPromissoryModal(encounterId);
      return;
    }
    const result = await processDemoPayment({
      encounterId,
      amount: enc.remainingBalance ?? Math.max(0, enc.waterfall.netPatientDue - (enc.amountPaid ?? 0)),
      paymentRail: channel,
      payerName: enc.patient.fullName || enc.patient.maskedName,
      payerContactMasked: '0917-***-****',
    });
    if (!result.success) {
      setApiError(result.error || 'The hospital did not confirm payment.');
      return;
    }
    setIsGatePassModalOpen(true);
  };

  const executePromissoryNote = async (
    encounterId: string,
    borrowerName: string,
    idType: GovernmentIdType,
    idNumber: string,
    months: 3 | 6 | 12,
    customPrincipal?: number,
  ) => {
    const encTarget = encounters.find((e) => e.id === encounterId);
    const targetPrincipal =
      customPrincipal !== undefined && customPrincipal !== null
        ? customPrincipal
        : promissoryCustomAmount !== null
          ? promissoryCustomAmount
          : (encTarget?.remainingBalance ??
            Math.max(0, (encTarget?.waterfall.netPatientDue ?? 0) - (encTarget?.amountPaid ?? 0)));

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
        principalAmount: targetPrincipal,
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

  const freezeDisputeItem = (encounterId: string, itemId: string, reason: string) =>
    confirmEncounterMutation(encounterId, 'Could not file billing dispute', () =>
      apiClient.fileDispute(encounterId, { chargeId: itemId, reason, disputeCategory: 'OTHER' }),
    );

  const supervisoryWaiveItem = async (encounterId: string, itemId: string, notes: string) => {
    const encTarget = encounters.find((e) => e.id === encounterId);
    const targetDispute = encTarget?.disputes?.find((d) => d.itemId === itemId);
    if (!targetDispute?.id) {
      setApiError('This charge has no persisted dispute to waive. Refresh the encounter and try again.');
      return;
    }
    try {
      await confirmEncounterMutation(encounterId, 'Failed to execute supervisory waiver', () =>
        apiClient.waiveDispute(targetDispute.id, notes),
      );
    } catch {
      return;
    }
  };

  // Cross-tab messages are refresh hints, never an authoritative balance ledger.
  usePatientBillingSync((msg) => {
    void refreshServerEncounter(msg.encounterId).catch(() => {
      /* Retain confirmed state on read failure. */
    });
  });

  const finalizeBill = (encounterId: string) =>
    confirmEncounterMutation(encounterId, 'Could not finalize bill', () =>
      apiClient.finalizeBill(encounterId),
    );
  const sendBillToPatient = (encounterId: string) =>
    confirmEncounterMutation(encounterId, 'Could not send bill', () => apiClient.sendBill(encounterId));
  const recordPatientViewed = (encounterId: string) =>
    confirmEncounterMutation(encounterId, 'Could not record bill view', () =>
      apiClient.recordBillViewed(encounterId),
    );

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
      return {
        success: false,
        error: 'A payment is currently being processed for this statement. Please wait.',
      };
    }
    inFlightPaymentsRef.current.add(params.encounterId);
    const generation = sessionGeneration.current;

    try {
      const enc = encounters.find((e) => e.id === params.encounterId);
      if (!enc) {
        return { success: false, error: 'Encounter record not found.' };
      }

      if (enc.stage !== 'PENDING_SETTLEMENT')
        return { success: false, error: 'Wait for the hospital to complete discharge checks.' };
      const currentRemaining =
        enc.remainingBalance ?? Math.max(0, enc.waterfall.netPatientDue - (enc.amountPaid ?? 0));

      if (currentRemaining <= 0 && params.paymentRail !== 'PROMISSORY_NOTE') {
        return {
          success: false,
          error: 'This statement is already fully settled (Remaining Balance: ₱0.00).',
        };
      }

      if (params.amount <= 0) {
        return { success: false, error: 'Payment amount must be greater than ₱0.00.' };
      }

      if (Math.round(params.amount * 100) > Math.round(currentRemaining * 100)) {
        return {
          success: false,
          error: `Payment cannot exceed remaining balance (${formatPhp(currentRemaining)}).`,
        };
      }

      if (params.failureSimulated) {
        return {
          success: false,
          error:
            'Simulated Gateway Decline: Insufficient test funds or network timeout. No demo funds deducted.',
        };
      }

      const intent = JSON.stringify([
        params.encounterId,
        params.amount,
        params.paymentRail,
        params.payerName,
      ]);
      const txRef = paymentRetryKeys.current.get(intent) ?? crypto.randomUUID();
      paymentRetryKeys.current.set(intent, txRef);

      let serverRes: any = null;
      try {
        serverRes = await apiClient.processPayment(
          enc.id,
          {
            amount: params.amount,
            paymentRail: params.paymentRail,
            payerName:
              params.payerName || enc.patient.fullName || enc.patient.maskedName || 'Patient Guarantor',
            payerContactMasked: params.payerContactMasked || '0917-***-****',
            cardBrand: params.cardBrand,
            cardLast4: params.cardLast4,
            bankName: params.bankName,
            notes: (params as any).notes || `Settlement via ${params.paymentRail}`,
          },
          txRef,
        );
      } catch (err: any) {
        console.error('API processPayment failure:', err);
        setApiError(`Payment processing failed on server: ${err.message || 'Unknown error'}`);
        return { success: false, error: err.message || 'Payment rejected by server' };
      }

      if (generation !== sessionGeneration.current)
        return { success: false, error: 'Your session changed. Sign in again.' };
      if (
        serverRes?.success &&
        serverRes.payment?.id &&
        serverRes.payment.status === 'SUCCESS' &&
        serverRes.receipt?.officialReceiptNumber &&
        serverRes.encounter
      ) {
        const canonicalReceipt: PaymentReceipt = {
          id: serverRes.receipt?.id || `RCPT-${serverRes.payment.id.slice(0, 8)}`,
          paymentId: serverRes.payment.paymentReference,
          billId: serverRes.payment.statementNumber,
          amount: Number(serverRes.payment.amount),
          paymentMethod: serverRes.payment.paymentRail as DemoPaymentRail,
          date: new Date(
            serverRes.receipt?.issuedAt || serverRes.payment.settledAt || Date.now(),
          ).toISOString(),
          referenceNumber: serverRes.payment.channelReference,
          officialReceiptNumber: serverRes.payment.officialReceiptNumber,
          payerName: serverRes.receipt?.payerName || serverRes.payment.payerName,
          payerContactMasked:
            serverRes.receipt?.payerContactMasked || serverRes.payment.payerContactMasked || '',
          gatewayAuthCode: serverRes.receipt?.gatewayAuthCode || serverRes.payment.gatewayAuthCode,
          notes: serverRes.payment.notes || undefined,
          isSimulatedDemo: serverRes.payment.isSimulatedDemo,
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
          timestamp: new Date(
            serverRes.payment.settledAt || serverRes.payment.createdAt || Date.now(),
          ).toISOString(),
          status: serverRes.payment.status,
          officialReceiptNumber: serverRes.payment.officialReceiptNumber,
          isSimulatedDemo: serverRes.payment.isSimulatedDemo,
          notes: serverRes.payment.notes || undefined,
          receiptId: canonicalReceipt.id,
          receipt: canonicalReceipt,
        };

        acceptServerEncounter(enc.id, serverRes, generation);
        paymentRetryKeys.current.delete(intent);

        broadcastBillingSync({
          type: 'PAYMENT_SETTLED',
          encounterId: enc.id,
          payment: paymentRecord,
          remainingBalance: Number(serverRes.encounter?.remainingBalance ?? 0),
          isFullySettled: Number(serverRes.encounter?.remainingBalance ?? 0) === 0,
        });

        return { success: true, paymentRecord };
      }

      return {
        success: false,
        error: 'The hospital did not confirm this payment. Check your payment history before trying again.',
      };
    } finally {
      inFlightPaymentsRef.current.delete(params.encounterId);
    }
  };

  // --- CHARGEMASTER CRUD IMPLEMENTATION ---
  const addChargeItem = (encounterId: string, itemData: any) =>
    confirmEncounterMutation(encounterId, 'Could not add charge', () =>
      apiClient.addChargeItem(encounterId, itemData),
    );
  const editChargeItem = (encounterId: string, itemId: string, updates: any) => {
    const item = encounters.find((enc) => enc.id === encounterId)?.items.find((item) => item.id === itemId);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemId);
    return confirmEncounterMutation(encounterId, 'Could not update charge', () =>
      apiClient.editChargeItem(isUuid ? itemId : item?.code || itemId, updates),
    );
  };
  const deleteChargeItem = (encounterId: string, itemId: string) => {
    const enc = encounters.find((enc) => enc.id === encounterId);
    const item = enc?.items.find((item) => item.id === itemId);
    return confirmEncounterMutation(encounterId, 'Could not delete charge', () =>
      apiClient.deleteChargeItem(/^[0-9a-f-]{36}$/i.test(itemId) ? itemId : item?.code || itemId),
    );
  };

  // --- ENCOUNTER CRUD IMPLEMENTATION ---
  const admitPatient = async (data: any) => {
    const generation = sessionGeneration.current;
    const identity = smsIdentity.current;
    setApiError(null);
    try {
      const res = await apiClient.createEncounter(data);

      if (identity !== smsIdentity.current)
        throw new ApiError('Your session changed. Sign in again.', 0, 'SESSION_CHANGED');
      if (!res?.success || !res.encounter) throw new Error('The hospital did not confirm admission.');
      acceptServerEncounter(res.encounter.id, res, generation);
      setSelectedEncounterId(res.encounter.id);
    } catch (error: unknown) {
      if (generation === sessionGeneration.current && identity === smsIdentity.current)
        setApiError(error instanceof Error ? error.message : 'Could not admit the patient.');
      throw error;
    }
  };

  const editEncounter = (encounterId: string, updates: any) =>
    confirmEncounterMutation(encounterId, 'Could not update encounter', () =>
      apiClient.editEncounter(encounterId, updates),
    );

  const deleteEncounter = (encounterId: string) => {
    const enc = encounters.find((e) => e.id === encounterId) || selectedEncounter;
    const pName = enc?.patient.fullName || enc?.patient.maskedName || 'Patient';
    const encNum = enc?.encounterNumber || encounterId;
    const bed = enc?.roomBed || enc?.bedNumber || 'Assigned Bed';

    requestConfirmation({
      title: 'Void Inpatient Encounter',
      description: `Cancel encounter ${encNum} for ${pName}. A reason is required. The API blocks cancellation when financial records prevent voiding.`,
      confirmLabel: 'Void Encounter',
      cancelLabel: 'Keep Encounter',
      variant: 'danger',
      contextInfo: [
        { label: 'Patient Name', value: pName },
        { label: 'Encounter Number', value: encNum },
        { label: 'Room / Bed', value: bed },
        { label: 'Net Patient Due', value: formatPhp(enc?.waterfall.netPatientDue || 0) },
      ],
      onConfirm: async () => {
        const generation = sessionGeneration.current;
        try {
          const response = await apiClient.deleteEncounter(encounterId);
          if (generation !== sessionGeneration.current) throw new Error('Your session changed.');
          if (!response?.success) throw new Error('The hospital did not confirm encounter removal.');
          encounterRevision.current++;
          setEncounters((prev) => prev.filter((enc) => enc.id !== encounterId));
          if (selectedEncounterId === encounterId)
            setSelectedEncounterId(encounters.find((enc) => enc.id !== encounterId)?.id || '');
        } catch (error: unknown) {
          setApiError(error instanceof Error ? error.message : 'Could not remove encounter.');
          throw error;
        }
      },
    });
  };

  const refreshNotifications = async () => {
    const generation = sessionGeneration.current;
    if (!isAuthenticated || currentUser?.role === 'PATIENT_GUARANTOR') return;
    if (notificationPending.current?.generation === generation) return notificationPending.current.request;
    const request = (async () => {
      try {
        const feed = await notificationsApi.getFeed();
        if (generation !== sessionGeneration.current) return;
        setNotifications(feed.notifications);
        setUnreadNotificationCount(feed.unreadCount);
        setNotificationError(null);
        seenNotifications.current = new Set(feed.notifications.map((item) => item.id));
      } catch (error: unknown) {
        if (generation === sessionGeneration.current)
          setNotificationError(error instanceof Error ? error.message : 'Could not load hospital updates.');
      }
    })();
    notificationPending.current = { generation, request };
    try {
      await request;
    } finally {
      if (notificationPending.current?.request === request) notificationPending.current = null;
    }
  };
  const markNotificationsRead = async (ids: string[]) => {
    const generation = sessionGeneration.current;
    try {
      await notificationsApi.markRead(ids);
      if (generation !== sessionGeneration.current) return;
      // Never decrement the badge until the server confirms its persisted read state.
      if (notificationPending.current?.generation === generation) await notificationPending.current.request;
      await refreshNotifications();
    } catch (error: unknown) {
      if (generation === sessionGeneration.current)
        setNotificationError(
          error instanceof Error ? error.message : 'Could not mark notifications as read.',
        );
      throw error;
    }
  };
  const pollingRef = useRef({ refreshNotifications, refreshEncounters });
  pollingRef.current = { refreshNotifications, refreshEncounters };
  const lastPollTime = useRef<number>(0);
  useEffect(() => {
    if (!isAuthenticated || currentUser?.role === 'PATIENT_GUARANTOR') return;
    const poll = (force = false) => {
      const now = Date.now();
      if (!force && now - lastPollTime.current < 5000) return; // Debounce rapid focus/tab switches
      if (document.visibilityState === 'visible') {
        lastPollTime.current = now;
        void pollingRef.current.refreshNotifications();
        void pollingRef.current.refreshEncounters(0, true);
      }
    };
    poll(true);
    const interval = setInterval(() => poll(true), 15000);
    const onFocus = () => poll(false);
    const onVisibility = () => poll(false);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isAuthenticated, currentUser?.id]);

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
        initialLoginEmail,
        beginAccountSwitch,
        notifications,
        unreadNotificationCount,
        notificationError,
        refreshNotifications,
        markNotificationsRead,
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
        notifyPatientSms,
        lastSmsDispatch,
        clearLastSmsDispatch,
        isSmsSending,
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
        refreshEncounters,
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
