import React, { useState } from 'react';
import { MedCoreProvider, useMedCore } from './context/MedCoreContext';
import { GlobalCommandBar } from './components/layout/GlobalCommandBar';
import { SidebarNav } from './components/layout/SidebarNav';
import { SearchModal } from './components/layout/SearchModal';
import { WhyDoIOweThisDrawer } from './components/ledger/WhyDoIOweThisDrawer';
import { ContextualActionDrawer } from './components/actions/ContextualActionDrawer';
import { DoctorQuickSignModal } from './components/actions/DoctorQuickSignModal';
import { DigitalPromissoryModal } from './components/actions/DigitalPromissoryModal';
import { DigitalGatePassModal } from './components/actions/DigitalGatePassModal';

// Views
import { CommandCenterView } from './views/CommandCenterView';
import { GuideView } from './views/GuideView';
import { VerifyView } from './views/VerifyView';
import { ReconcileView } from './views/ReconcileView';
import { RewardView } from './views/RewardView';
import { ReportView } from './views/ReportView';
import { ImproveView } from './views/ImproveView';
import { DisputeDeskView } from './views/DisputeDeskView';
import { PatientClarifyView } from './views/PatientClarifyView';
import { SettingsView } from './views/SettingsView';

const MainLayout: React.FC = () => {
  const { activeRoute } = useMedCore();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const renderActiveView = () => {
    switch (activeRoute) {
      case 'COMMAND_CENTER':
        return <CommandCenterView />;
      case 'GUIDE':
        return <GuideView />;
      case 'VERIFY':
        return <VerifyView />;
      case 'RECONCILE':
        return <ReconcileView />;
      case 'REWARD':
        return <RewardView />;
      case 'REPORT':
        return <ReportView />;
      case 'IMPROVE':
        return <ImproveView />;
      case 'DISPUTE_DESK':
        return <DisputeDeskView />;
      case 'PATIENT_CLARIFY':
        return <PatientClarifyView />;
      case 'SETTINGS':
        return <SettingsView />;
      default:
        return <CommandCenterView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#070D18] text-slate-900 dark:text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* TIER 1: Global Command Bar */}
      <GlobalCommandBar />

      {/* Main Body: Sidebar + Active Route View */}
      <div className="flex-1 flex overflow-hidden">
        <SidebarNav
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {renderActiveView()}
        </main>
      </div>

      {/* Modals, Drawers & Overlays */}
      <SearchModal />
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
