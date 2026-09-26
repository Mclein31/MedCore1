import React, { useState, useEffect } from 'react';
import { useMedCore } from '../../context/MedCoreContext';
import { UserRole } from '../../types/navigation';
import {
  ChevronDown,
  Bell,
  Calendar,
  Clock,
  Building2
} from 'lucide-react';

export const GlobalCommandBar: React.FC = () => {
  const {
    activeRole,
    setActiveRole,
    encounters
  } = useMedCore();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

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
      setCurrentDate(
        now.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
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
    { role: 'LOBBY_SECURITY', name: 'Bert Aquino', title: 'Lobby Exit Security Officer' }
  ];

  const currentRoleObj = roles.find((r) => r.role === activeRole) || roles[0];

  const warningCount = encounters.filter((e) => e.slaStatus === 'WARNING').length;
  const breachCount = encounters.filter((e) => e.slaStatus === 'BREACH').length;

  return (
    <header className="h-14 border-b border-slate-200 bg-white px-5 flex items-center justify-between z-30 sticky top-0 shadow-2xs">
      {/* Left: Brand & Facility Context */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
            <span className="text-base tracking-tight font-black">M</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-slate-900 leading-none">
                MedCore
              </span>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded leading-none">
                v2.4
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500 mt-1 leading-none">
              <Building2 className="w-3 h-3 text-slate-400" />
              <span>St. Jude Medical Center Manila</span>
            </div>
          </div>
        </div>

        {/* Live Clock & Philippine Standard Time (Inspo 1 Comlogik style) */}
        <div className="hidden xl:flex items-center gap-3 pl-5 border-l border-slate-200 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentDate || 'Mon, Jul 20, 2026'}</span>
          </div>
          <span className="text-slate-300">·</span>
          <div className="flex items-center gap-1.5 font-mono font-semibold text-slate-700">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentTime || '14:32:05 PST'}</span>
          </div>
          <span className="text-slate-300">·</span>
          <div>
            {breachCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                <span>{breachCount} SLA {breachCount === 1 ? 'breach' : 'breaches'}</span>
              </span>
            ) : warningCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>{warningCount} approaching SLA limit</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                <span>All discharges on schedule</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Notification & Operational Role (Inspo 1 & 3 style) */}
      <div className="flex items-center gap-3">
        {/* Notification Bell with Badge */}
        <div
          className="relative p-2 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
          title="Notifications & Alerts"
        >
          <Bell className="w-4 h-4" />
          {warningCount + breachCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-600 ring-2 ring-white"></span>
          )}
        </div>

        {/* Role Selector & Profile */}
        <div className="relative group">
          <button className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-sm transition-colors border border-transparent hover:border-slate-200">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs ring-1 ring-blue-200">
              {currentRoleObj.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div className="text-left hidden sm:block">
              <div className="font-semibold text-slate-900 leading-tight text-xs sm:text-sm">
                {currentRoleObj.name}
              </div>
              <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                {currentRoleObj.title}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          {/* Role Dropdown Menu */}
          <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 hidden group-hover:block z-50">
            <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
              Switch operational role
            </div>
            {roles.map((r) => (
              <button
                key={r.role}
                onClick={() => setActiveRole(r.role)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                  activeRole === r.role
                    ? 'bg-blue-50 text-blue-900 font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-[11px] text-slate-500">{r.title}</div>
                </div>
                {activeRole === r.role && (
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};
