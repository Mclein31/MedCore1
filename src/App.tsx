import React, { useState } from 'react';
import { MedCoreProvider, useMedCore } from './context/MedCoreContext';
import { GlobalCommandBar } from './components/layout/GlobalCommandBar';
import { SidebarNav } from './components/layout/SidebarNav';
import { WhyDoIOweThisDrawer } from './components/ledger/WhyDoIOweThisDrawer';
import { ContextualActionDrawer } from './components/actions/ContextualActionDrawer';
import { DoctorQuickSignModal } from './components/actions/DoctorQuickSignModal';
import { DigitalPromissoryModal } from './components/actions/DigitalPromissoryModal';
import { DigitalGatePassModal } from './components/actions/DigitalGatePassModal';
import { DischargeDossierDrawer } from './components/discharge/DischargeDossierDrawer';
import { PatientClarifyDrawer } from './components/discharge/PatientClarifyDrawer';

// 8 Task-Oriented Operational Views
import { CommandCenterView } from './views/CommandCenterView';
import { DischargeClearanceView } from './views/DischargeClearanceView';
import { EncountersLedgerView } from './views/EncountersLedgerView';
import { CoverageApprovalsView } from './views/CoverageApprovalsView';
import { DisputesExceptionsView } from './views/DisputesExceptionsView';
import { ClaimsEsoaView } from './views/ClaimsEsoaView';
import { RcmAnalyticsView } from './views/RcmAnalyticsView';
import { ConfigurationView } from './views/ConfigurationView';

const MainLayout: React.FC = () => {
  const { activeRoute } = useMedCore();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const renderActiveView = () => {
    switch (activeRoute) {
      case 'COMMAND_CENTER':
        return <CommandCenterView />;
      case 'DISCHARGE_CLEARANCE':
        return <DischargeClearanceView />;
      case 'ENCOUNTERS_LEDGER':
        return <EncountersLedgerView />;
      case 'COVERAGE_APPROVALS':
        return <CoverageApprovalsView />;
      case 'DISPUTES_EXCEPTIONS':
        return <DisputesExceptionsView />;
      case 'CLAIMS_ESOA':
        return <ClaimsEsoaView />;
      case 'RCM_ANALYTICS':
        return <RcmAnalyticsView />;
      case 'CONFIGURATION':
        return <ConfigurationView />;
      default:
        return <CommandCenterView />;
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
