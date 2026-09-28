import React, { useState } from 'react';
import { MedCoreProvider, useMedCore } from '@/context/MedCoreContext';
import { GlobalCommandBar } from '@/components/layout/GlobalCommandBar';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { SearchModal } from '@/components/layout/SearchModal';
import { WhyDoIOweThisDrawer } from '@/features/ledger';
import { ContextualActionDrawer, DischargeDossierDrawer } from '@/features/discharge';
import { PatientClarifyDrawer } from '@/features/patient-clarify';
import { DoctorQuickSignModal, DigitalPromissoryModal, DigitalGatePassModal } from '@/components/modals';

// 8 Task-Oriented Operational Route Pages
import {
  CommandCenterPage,
  DischargeClearancePage,
  EncountersLedgerPage,
  CoverageApprovalsPage,
  DisputesExceptionsPage,
  ClaimsEsoaPage,
  RcmAnalyticsPage,
  ConfigurationPage
} from '@/pages';

const MainLayout: React.FC = () => {
  const { activeRoute } = useMedCore();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const renderActiveView = () => {
    switch (activeRoute) {
      case 'COMMAND_CENTER':
        return <CommandCenterPage />;
      case 'DISCHARGE_CLEARANCE':
        return <DischargeClearancePage />;
      case 'ENCOUNTERS_LEDGER':
        return <EncountersLedgerPage />;
      case 'COVERAGE_APPROVALS':
        return <CoverageApprovalsPage />;
      case 'DISPUTES_EXCEPTIONS':
        return <DisputesExceptionsPage />;
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
    <div className="h-screen w-screen overflow-hidden bg-slate-100 text-slate-900 flex flex-col font-sans select-none antialiased">
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
      <PatientClarifyDrawer />
      <WhyDoIOweThisDrawer />
      <ContextualActionDrawer />
      <DoctorQuickSignModal />
      <DigitalPromissoryModal />
      <DigitalGatePassModal />
    </div>
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
