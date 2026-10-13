import React, { useState, useEffect, Suspense, lazy } from 'react';
import { MedCoreProvider, useMedCore } from '@/context/MedCoreContext';
import { GlobalCommandBar } from '@/components/layout/GlobalCommandBar';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { WhyDoIOweThisDrawer } from '@/features/ledger';
import { ContextualActionDrawer, DischargeDossierDrawer } from '@/features/discharge';
import { PatientPortalStandalone } from '@/features/patient-clarify';
import {
  DoctorQuickSignModal,
  DigitalPromissoryModal,
  DigitalGatePassModal,
  ConfirmationModal,
  AddEditChargeModal,
  AdmitPatientModal,
  EditEncounterModal
} from '@/components/modals';
import { LoginScreen } from '@/components/auth/LoginScreen';
import { PrintDocumentContainer } from '@/components/printing';
import { SmsDeliveryToast } from '@/components/notifications/SmsDeliveryToast';
import { AlertCircle, X, RefreshCw, Activity } from '@/components/common/SolarIcons';

// Code-Split 8 Task-Oriented Operational Route Pages for optimal bundle size and startup performance
const CommandCenterPage = lazy(() => import('@/pages/CommandCenterPage').then(m => ({ default: m.CommandCenterPage })));
const DischargeClearancePage = lazy(() => import('@/pages/DischargeClearancePage').then(m => ({ default: m.DischargeClearancePage })));
const EncountersLedgerPage = lazy(() => import('@/pages/EncountersLedgerPage').then(m => ({ default: m.EncountersLedgerPage })));
const ApprovalsDisputesPage = lazy(() => import('@/pages/ApprovalsDisputesPage').then(m => ({ default: m.ApprovalsDisputesPage })));
const ClaimsEsoaPage = lazy(() => import('@/pages/ClaimsEsoaPage').then(m => ({ default: m.ClaimsEsoaPage })));
const RcmAnalyticsPage = lazy(() => import('@/pages/RcmAnalyticsPage').then(m => ({ default: m.RcmAnalyticsPage })));
const ConfigurationPage = lazy(() => import('@/pages/ConfigurationPage').then(m => ({ default: m.ConfigurationPage })));

// Page Loading Skeleton Fallback for Smooth Route Transitions
const PageFallback: React.FC = () => (
  <div className="flex-1 p-6 space-y-4 animate-pulse overflow-y-auto">
    <div className="h-8 w-64 bg-slate-200 rounded-lg" />
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="h-24 bg-slate-200 rounded-xl" />
      <div className="h-24 bg-slate-200 rounded-xl" />
      <div className="h-24 bg-slate-200 rounded-xl" />
      <div className="h-24 bg-slate-200 rounded-xl" />
    </div>
    <div className="h-96 bg-slate-200 rounded-2xl" />
  </div>
);

// Resilient Error Boundary to catch uncaught component errors and provide instant recovery
export interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[MedCore Uncaught Runtime Exception]', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full bg-white rounded-2xl border border-rose-200 p-8 shadow-lg text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">Application Error</h1>
            <p className="text-xs text-slate-600">
              A client-side error occurred while rendering the workspace.
            </p>
            {this.state.error?.message && (
              <div className="text-left bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 overflow-x-auto">
                {this.state.error.message}
              </div>
            )}
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="rounded-xl border border-slate-200 bg-white text-slate-700 px-4 py-2 text-xs font-medium hover:bg-slate-50 transition-colors"
              >
                Recover View
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="rounded-xl bg-teal-700 text-white px-5 py-2 text-xs font-medium hover:bg-teal-800 transition-colors"
              >
                Reload Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const MainLayout: React.FC = () => {
  const {
    activeRoute,
    activeRole,
    isAuthenticated,
    isVerifyingSession,
    sessionError,
    retrySession,
    setActiveRoute,
    selectEncounter,
    encounters,
    isLoadingEncounters,
    confirmationState,
    closeConfirmation,
    apiError,
    clearApiError
  } = useMedCore();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches
  );
  useEffect(() => {
    const compact = window.matchMedia('(max-width: 900px)');
    const update = () => setIsSidebarCollapsed(compact.matches);
    compact.addEventListener('change', update);
    return () => compact.removeEventListener('change', update);
  }, []);

  // Hash-based routing listener for magic links like #/clarify/enc-8812 or #/patient-portal
  useEffect(() => {
    const handleHashChange = () => {
      if (!isAuthenticated) return;
      const hash = window.location.hash;
      if (hash.startsWith('#/clarify/')) {
        const id = hash.replace('#/clarify/', '').split('?')[0];
        if (id && encounters.some((e) => e.id === id)) {
          selectEncounter(id);
        }
        setActiveRoute('PATIENT_PORTAL');
      } else if (hash === '#/patient-portal') {
        setActiveRoute('PATIENT_PORTAL');
      }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [encounters, selectEncounter, setActiveRoute, isAuthenticated]);

  const renderApiErrorToast = () => {
    if (!apiError || !isAuthenticated) return null;
    return (
      <div className="fixed bottom-5 right-5 z-[3000] max-w-md bg-rose-50 border border-rose-300 text-rose-900 px-4 py-3 rounded-2xl shadow-xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div className="flex-1 text-xs">
          <div className="font-bold text-rose-950">Backend API Sync Notice</div>
          <div className="mt-0.5 text-rose-800 break-words">{apiError}</div>
        </div>
        <button
          type="button"
          onClick={clearApiError}
          className="text-rose-400 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-100 transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  };

  // Graceful non-blocking session verification state
  if (isVerifyingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-10 h-10 mx-auto rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
            <RefreshCw className="w-5 h-5 animate-spin" />
          </div>
          <h1 className="text-base font-semibold text-slate-800">Verifying session…</h1>
          <p className="text-xs text-slate-500">Checking credentials with the hospital authentication server.</p>
        </div>
      </div>
    );
  }

  // Session verification error for unauthenticated visitors
  if (sessionError && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="text-center space-y-4 max-w-sm bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <AlertCircle className="w-10 h-10 mx-auto text-amber-600" />
          <h1 className="text-base font-semibold text-slate-900">Session Verification Unavailable</h1>
          <p className="text-xs text-slate-600">{sessionError}</p>
          <button
            type="button"
            onClick={retrySession}
            className="rounded-xl bg-teal-700 text-white px-5 py-2.5 text-xs font-semibold hover:bg-teal-800 transition-colors w-full"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Cached browser flags are never proof of an authenticated session.
  if (!isAuthenticated) {
    return (
      <>
        <LoginScreen />
        {confirmationState && (
          <ConfirmationModal
            isOpen={confirmationState.isOpen}
            title={confirmationState.title}
            description={confirmationState.description}
            confirmLabel={confirmationState.confirmLabel}
            cancelLabel={confirmationState.cancelLabel}
            variant={confirmationState.variant}
            contextInfo={confirmationState.contextInfo}
            onConfirm={async () => {
              await confirmationState.onConfirm();
              closeConfirmation();
            }}
            onCancel={() => {
              if (confirmationState.onCancel) {
                confirmationState.onCancel();
              }
              closeConfirmation();
            }}
          />
        )}
        {renderApiErrorToast()}
      </>
    );
  }

  // If authenticated and encounters are still loading without any cached records, display smooth synchronizing state
  if (encounters.length === 0 && isLoadingEncounters) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-xs text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="text-base font-bold text-slate-900">Synchronizing Hospital Census</h1>
          <p className="text-xs text-slate-500">Connecting to hospital records and verifying real-time encounter telemetry…</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-teal-600 h-full w-2/3 animate-pulse rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  // When patient portal route or guarantor role is active, render the dedicated patient portal experience
  if (activeRoute === 'PATIENT_PORTAL' || activeRole === 'PATIENT_GUARANTOR') {
    return (
      <>
        <div id="medcore-app-root" className="min-h-screen w-full bg-slate-100 text-slate-900 flex flex-col font-sans antialiased">
          <PatientPortalStandalone />
          <WhyDoIOweThisDrawer />
          <DoctorQuickSignModal />
          <DigitalPromissoryModal />
          <DigitalGatePassModal />
        </div>
        {confirmationState && (
          <ConfirmationModal
            isOpen={confirmationState.isOpen}
            title={confirmationState.title}
            description={confirmationState.description}
            confirmLabel={confirmationState.confirmLabel}
            cancelLabel={confirmationState.cancelLabel}
            variant={confirmationState.variant}
            contextInfo={confirmationState.contextInfo}
            requiresValidationFriction={confirmationState.requiresValidationFriction}
            validationKeyword={confirmationState.validationKeyword}
            onConfirm={async () => {
              await confirmationState.onConfirm();
              closeConfirmation();
            }}
            onCancel={() => {
              if (confirmationState.onCancel) {
                confirmationState.onCancel();
              }
              closeConfirmation();
            }}
          />
        )}
        <PrintDocumentContainer />
        {renderApiErrorToast()}
      </>
    );
  }

  const renderActiveView = () => {
    switch (activeRoute) {
      case 'COMMAND_CENTER':
        return <CommandCenterPage />;
      case 'DISCHARGE_CLEARANCE':
        return <DischargeClearancePage />;
      case 'ENCOUNTERS_LEDGER':
        return <EncountersLedgerPage />;
      case 'COVERAGE_APPROVALS':
      case 'DISPUTES_EXCEPTIONS':
        return <ApprovalsDisputesPage />;
      case 'CLAIMS_ESOA':
        return <ClaimsEsoaPage />;
      case 'RCM_ANALYTICS':
        return <RcmAnalyticsPage />;
      case 'CONFIGURATION':
        return <ConfigurationPage />;
      default:
        return <CommandCenterPage />;
    }
  };

  return (
    <>
      <div id="medcore-app-root" className="workspace-shell h-screen w-full overflow-hidden bg-slate-100 text-slate-900 flex flex-col font-sans antialiased">
        {/* LEVEL 1: Global Context & Command Bar */}
        <GlobalCommandBar />

        {/* Main Body: Operational Workflow Sidebar + Active Task View */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <SidebarNav
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setIsSidebarCollapsed}
          />
          <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
            <Suspense fallback={<PageFallback />}>
              {renderActiveView()}
            </Suspense>
          </main>
        </div>

        {/* Modals, Overlays & Slide-Over Drawers */}
        <DischargeDossierDrawer />
        <WhyDoIOweThisDrawer />
        <ContextualActionDrawer />
        <DoctorQuickSignModal />
        <DigitalPromissoryModal />
        <DigitalGatePassModal />
        <AddEditChargeModal />
        <AdmitPatientModal />
        <EditEncounterModal />
      </div>
      {confirmationState && (
        <ConfirmationModal
          isOpen={confirmationState.isOpen}
          title={confirmationState.title}
          description={confirmationState.description}
          confirmLabel={confirmationState.confirmLabel}
          cancelLabel={confirmationState.cancelLabel}
          variant={confirmationState.variant}
          contextInfo={confirmationState.contextInfo}
          requiresValidationFriction={confirmationState.requiresValidationFriction}
          validationKeyword={confirmationState.validationKeyword}
          onConfirm={async () => {
            await confirmationState.onConfirm();
            closeConfirmation();
          }}
          onCancel={() => {
            if (confirmationState.onCancel) {
              confirmationState.onCancel();
            }
            closeConfirmation();
          }}
        />
      )}
      <PrintDocumentContainer />
      <SmsDeliveryToast />
      {renderApiErrorToast()}
    </>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <MedCoreProvider>
        <MainLayout />
      </MedCoreProvider>
    </ErrorBoundary>
  );
};

export default App;
