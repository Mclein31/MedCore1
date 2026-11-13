import { BridgeInputDialog } from '../api/BridgeInputDialog';
import { AlertCircle, X } from '@/v1/components/common/SolarIcons';
import { GlobalCommandBar } from '@/v1/components/layout/GlobalCommandBar';
import { SidebarNav } from '@/v1/components/layout/SidebarNav';
import {
  AddEditChargeModal,
  AdmitPatientModal,
  ConfirmationModal,
  DigitalGatePassModal,
  DigitalPromissoryModal,
  DoctorQuickSignModal,
  EditEncounterModal,
} from '@/v1/components/modals';
import { SmsDeliveryToast } from '@/v1/components/notifications/SmsDeliveryToast';
import { PrintDocumentContainer } from '@/v1/components/printing';
import { MedCoreProvider, useMedCore } from '@/v1/context/MedCoreContext';
import { ContextualActionDrawer, DischargeDossierDrawer } from '@/v1/features/discharge';
import { WhyDoIOweThisDrawer } from '@/v1/features/ledger';
import { RouteSkeleton, WorkspaceShellSkeleton } from '@/v1/components/common/Skeletons';
import { useExitSnapshotRef } from '@/v1/utils/exitSnapshot';
import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { Account } from '../../staff/pages/Account';
import { prefetchWorkspaceOnIdle, routeChunks } from './routeChunks';
import { AuditLog } from '../../staff/pages/AuditLog';
import { Lobby } from '../../staff/pages/Lobby';
import { Patients } from '../../staff/pages/Patients';
import { Users } from '../../staff/pages/Users';

// Code-Split 8 Task-Oriented Operational Route Pages for optimal bundle size and startup performance
const CommandCenterPage = lazy(() =>
  routeChunks.COMMAND_CENTER().then((m) => ({ default: m.CommandCenterPage })),
);
const DischargeClearancePage = lazy(() =>
  routeChunks.DISCHARGE_CLEARANCE().then((m) => ({ default: m.DischargeClearancePage })),
);
const EncountersLedgerPage = lazy(() =>
  routeChunks.ENCOUNTERS_LEDGER().then((m) => ({ default: m.EncountersLedgerPage })),
);
const ApprovalsDisputesPage = lazy(() =>
  routeChunks.COVERAGE_APPROVALS().then((m) => ({ default: m.ApprovalsDisputesPage })),
);
const ClaimsEsoaPage = lazy(() => routeChunks.CLAIMS_ESOA().then((m) => ({ default: m.ClaimsEsoaPage })));
const RcmAnalyticsPage = lazy(() =>
  routeChunks.RCM_ANALYTICS().then((m) => ({ default: m.RcmAnalyticsPage })),
);
const ConfigurationPage = lazy(() =>
  routeChunks.CONFIGURATION().then((m) => ({ default: m.ConfigurationPage })),
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
    isAuthenticated,
    isVerifyingSession,
    sessionError,
    retrySession,
    encounters,
    isLoadingEncounters,
    confirmationState,
    closeConfirmation,
    apiError,
    clearApiError,
    currentUser,
  } = useMedCore();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches,
  );
  const toastExitRef = useExitSnapshotRef<HTMLDivElement>('toast');
  const workspaceReady = isAuthenticated && !isVerifyingSession;
  // Warm the remaining page and modal chunks once the workspace is up, so navigation never waits on code.
  useEffect(() => (workspaceReady ? prefetchWorkspaceOnIdle() : undefined), [workspaceReady]);
  useEffect(() => {
    const compact = window.matchMedia('(max-width: 900px)');
    const update = () => setIsSidebarCollapsed(compact.matches);
    compact.addEventListener('change', update);
    return () => compact.removeEventListener('change', update);
  }, []);

  const renderApiErrorToast = () => {
    if (!apiError || !isAuthenticated) return null;
    return (
      <div
        ref={toastExitRef}
        className="fixed bottom-5 right-5 z-[3000] max-w-md bg-rose-50 border border-rose-300 text-rose-900 px-4 py-3 rounded-2xl shadow-xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2"
      >
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

  // Session verification shows the workspace frame, not a separate full-screen loader.
  if (isVerifyingSession) return <WorkspaceShellSkeleton label="Verifying session" />;

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
  if (!isAuthenticated) return <Navigate to="/staff/login" replace />;

  // First census load: keep the real toolbar and sidebar on screen and hold the page area
  // with a placeholder shaped like the page that is about to appear.
  const isSyncingCensus = encounters.length === 0 && isLoadingEncounters;

  const renderActiveView = () => {
    const required: Partial<Record<typeof activeRoute, string>> = {
      COMMAND_CENTER: 'encounter:read',
      DISCHARGE_CLEARANCE: 'encounter:read',
      ENCOUNTERS_LEDGER: 'encounter:read',
      COVERAGE_APPROVALS: 'dispute:read',
      DISPUTES_EXCEPTIONS: 'dispute:read',
      CLAIMS_ESOA: 'claim:read',
      RCM_ANALYTICS: 'analytics:read',
      CONFIGURATION: 'encounter:read',
      STAFF_USERS: 'staff:manage',
      AUDIT_LOG: 'audit:read',
      PATIENTS: 'patient:read',
      LOBBY: 'gatepass:verify',
    };
    if (required[activeRoute] && !currentUser?.permissions?.includes(required[activeRoute]))
      return <p className="p-6 text-slate-600">This workspace is unavailable for your staff permissions.</p>;

    switch (activeRoute) {
      case 'STAFF_USERS':
        return (
          <div className="p-6 overflow-auto">
            <Users />
          </div>
        );
      case 'AUDIT_LOG':
        return (
          <div className="p-6 overflow-auto">
            <AuditLog />
          </div>
        );
      case 'ACCOUNT':
        return (
          <div className="p-6 overflow-auto">
            <Account />
          </div>
        );
      case 'PATIENTS':
        return (
          <div className="p-6 overflow-auto">
            <Patients />
          </div>
        );
      case 'LOBBY':
        return (
          <div className="p-6 overflow-auto">
            <Lobby />
          </div>
        );
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
      <div
        id="medcore-app-root"
        className="workspace-shell h-screen w-full overflow-hidden bg-slate-100 text-slate-900 flex flex-col font-sans antialiased"
      >
        {/* LEVEL 1: Global Context & Command Bar */}
        <GlobalCommandBar />

        {/* Main Body: Operational Workflow Sidebar + Active Task View */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <SidebarNav isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
          <main className="workspace-main flex-1 flex flex-col min-w-0 h-full overflow-hidden">
            {isSyncingCensus ? (
              <RouteSkeleton route={activeRoute} />
            ) : (
              <Suspense fallback={<RouteSkeleton route={activeRoute} />}>{renderActiveView()}</Suspense>
            )}
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
      <BridgeInputDialog />
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
