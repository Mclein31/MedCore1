import React, { useState, useEffect } from 'react';
import { useMedCore } from '../../context/MedCoreContext';
import { UserRole } from '../../types/navigation';
import {
  Search,
  Building2,
  Clock,
  Sun,
  Moon,
  ShieldAlert,
  UserCheck,
  ChevronDown
} from 'lucide-react';

export const GlobalCommandBar: React.FC = () => {
  const {
    activeRole,
    setActiveRole,
    isDarkMode,
    toggleDarkMode,
    openSearchModal,
    encounters
  } = useMedCore();

  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }) + ' PST'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const roles: { role: UserRole; name: string; title: string }[] = [
    { role: 'BILLING_SPECIALIST', name: 'Elena Santos', title: 'Inpatient Billing Specialist' },
    { role: 'HMO_COORDINATOR', name: 'Marco Valenzuela', title: 'HMO Liaison Coordinator' },
    { role: 'CLAIMS_ENCODER', name: 'Grace Tan', title: 'PhilHealth Claims Auditor' },
    { role: 'HOSPITAL_CFO', name: 'Arthur Delgado', title: 'Hospital CFO / RCM Director' },
    { role: 'ATTENDING_PHYSICIAN', name: 'Dr. Manuel Reyes', title: 'Attending Specialist (FPCP)' },
    { role: 'PATIENT_GUARANTOR', name: 'Ramon Dela Cruz', title: 'Patient Family Guarantor' },
    { role: 'LOBBY_SECURITY', name: 'Kuya Bert', title: 'Lobby Exit Security Officer' }
  ];

  const currentRoleObj = roles.find((r) => r.role === activeRole) || roles[0];

  const warningCount = encounters.filter((e) => e.slaStatus === 'WARNING').length;
  const breachCount = encounters.filter((e) => e.slaStatus === 'BREACH').length;

  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md px-4 flex items-center justify-between z-30 sticky top-0">
      {/* Left: Hospital Context & Global Logo */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-brand-navy dark:bg-brand-blue flex items-center justify-center text-white font-bold tracking-wider text-xs shadow-sm">
            MC
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-sm tracking-tight text-slate-900 dark:text-slate-100">
              <span>MedCore</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold border border-sky-500/20">
                PROD
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              <Building2 className="w-3 h-3 text-slate-400" />
              <span>St. Jude Medical Center — Manila</span>
            </div>
          </div>
        </div>

        {/* Operational PST Clock */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs font-mono text-slate-700 dark:text-slate-300">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{currentTime || '14:32:05 PST'}</span>
        </div>

        {/* Global SLA Alert Badge */}
        <div className="hidden lg:flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <ShieldAlert className="w-3 h-3" />
            <span>{warningCount} SLA Warnings (&gt;25m)</span>
          </div>
          {breachCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 animate-pulse">
              <span>{breachCount} SLA Breaches (&gt;40m)</span>
            </div>
          )}
        </div>
      </div>

      {/* Center: Universal Command Palette Search Trigger (Cmd + K) */}
      <button
        onClick={openSearchModal}
        className="hidden sm:flex items-center justify-between w-64 md:w-80 px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 transition-colors shadow-inner"
      >
        <div className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span>Search MRN, patient, claim, bed...</span>
        </div>
        <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 shadow-sm">
          ⌘K
        </kbd>
      </button>

      {/* Right: Role Switcher, Dark Mode, Profile */}
      <div className="flex items-center gap-2.5">
        {/* Role Switcher Dropdown */}
        <div className="relative group">
          <button className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-xs transition-colors">
            <UserCheck className="w-3.5 h-3.5 text-brand-blue" />
            <div className="text-left hidden md:block">
              <div className="font-medium text-slate-800 dark:text-slate-200 leading-tight">
                {currentRoleObj.name}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                {currentRoleObj.title}
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Role Dropdown Menu */}
          <div className="absolute right-0 mt-1 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl p-1.5 hidden group-hover:block z-50">
            <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Switch Operational Role View
            </div>
            {roles.map((r) => (
              <button
                key={r.role}
                onClick={() => setActiveRole(r.role)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center justify-between ${
                  activeRole === r.role
                    ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 font-medium'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div>
                  <div>{r.name}</div>
                  <div className="text-[10px] text-slate-400">{r.title}</div>
                </div>
                {activeRole === r.role && (
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-blue" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleDarkMode}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 rounded-md text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-navy to-brand-blue flex items-center justify-center text-white text-xs font-semibold shadow-sm border border-white/20">
          ES
        </div>
      </div>
    </header>
  );
};
