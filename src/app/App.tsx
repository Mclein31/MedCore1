import React, { useState, useEffect } from 'react';
import { MedCoreProvider, useMedCore } from '@/context/MedCoreContext';
import { GlobalCommandBar } from '@/components/layout/GlobalCommandBar';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { SearchModal } from '@/components/layout/SearchModal';
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

// 8 Task-Oriented Operational Route Pages
import {
  CommandCenterPage,
  DischargeClearancePage,
  EncountersLedgerPage,
  ApprovalsDisputesPage,
  CoverageApprovalsPage,
  DisputesExceptionsPage,
  ClaimsEsoaPage,
  RcmAnalyticsPage,
  ConfigurationPage
} from '@/pages';

import { AlertCircle, X } from 'lucide-react';

const MainLayout: React.FC = () => {
  const {
    activeRoute,
    activeRole,
    isAuthenticated,
    setActiveRoute,
    setActiveRole,
    selectEncounter,
    encounters,
    confirmationState,
    closeConfirmation,
    apiError,
    clearApiError
  } = useMedCore();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Hash-based routing listener for magic links like #/clarify/enc-8812 or #/patient-portal
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/clarify/')) {
        const id = hash.replace('#/clarify/', '').split('?')[0];
        if (id && encounters.some((e) => e.id === id)) {
          selectEncounter(id);
        }
        setActiveRoute('PATIENT_PORTAL');
        setActiveRole('PATIENT_GUARANTOR');
      } else if (hash === '#/patient-portal') {
        setActiveRoute('PATIENT_PORTAL');
        setActiveRole('PATIENT_GUARANTOR');
      }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [encounters, selectEncounter, setActiveRoute, setActiveRole]);

  const renderApiErrorToast = () => {
    if (!apiError) return null;
    return (
      <div className="fixed bottom-5 right-5 z-70 max-w-md bg-rose-50 border border-rose-300 text-rose-900 px-4 py-3 rounded-2xl shadow-xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
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

  // If user is not authenticated and not on patient portal, present the enterprise login screen
  if (!isAuthenticated && activeRoute !== 'PATIENT_PORTAL' && activeRole !== 'PATIENT_GUARANTOR') {
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

  // When patient portal route or guarantor role is active, render the dedicated patient portal experience
  if (activeRoute === 'PATIENT_PORTAL' || activeRole === 'PATIENT_GUARANTOR') {
    return (
      <>
        <div id="medcore-app-root" className="min-h-screen w-full bg-slate-100 text-slate-900 flex flex-col font-sans antialiased">
          <PatientPortalStandalone />
          <SearchModal />
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
      <div id="medcore-app-root" className="h-screen w-full overflow-hidden bg-slate-100 text-slate-900 flex flex-col font-sans antialiased">
        {/* LEVEL 1: Global Context & Command Bar */}
        <GlobalCommandBar />

        {/* Main Body: Operational Workflow Sidebar + Active Task View */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <SidebarNav
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setIsSidebarCollapsed}
          />
          <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
            {renderActiveView()}
          </main>
        </div>

        {/* Modals, Overlays & Slide-Over Drawers */}
        <SearchModal />
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
      {renderApiErrorToast()}
    </>
  );
};

export const App: React.FC = () => {
  return (
    <MedCoreProvider>
      <MainLayout />
    </MedCoreProvider>
  );
};

export default App;
