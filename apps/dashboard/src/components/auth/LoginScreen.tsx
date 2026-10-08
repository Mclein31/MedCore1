import React, { useState } from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import { Building2, ShieldCheck, Lock, Mail, ArrowRight, UserCheck } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login, sessionNotice } = useMedCore();
  const [email, setEmail] = useState('elena.santos@stjude.ph');
  const [password, setPassword] = useState('HospitalRCM2026!');
  const [facilityCode, setFacilityCode] = useState('SJMC-MNL');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const demoAccounts = [
    {
      name: 'Elena Santos',
      roleTitle: 'Inpatient Billing Specialist',
      email: 'elena.santos@stjude.ph',
      badge: 'Billing Lead'
    },
    {
      name: 'Arthur Delgado',
      roleTitle: 'Hospital CFO / RCM Director',
      email: 'arthur.delgado@stjude.ph',
      badge: 'Executive CFO'
    },
    {
      name: 'Dr. Manuel Reyes',
      roleTitle: 'Attending Physician (FPCP)',
      email: 'manuel.reyes@stjude.ph',
      badge: 'Clinical MD'
    },
    {
      name: 'Marco Valenzuela',
      roleTitle: 'HMO Liaison Coordinator',
      email: 'marco.valenzuela@stjude.ph',
      badge: 'Commercial Payer'
    },
    {
      name: 'Grace Tan',
      roleTitle: 'PhilHealth Claims Auditor',
      email: 'grace.tan@stjude.ph',
      badge: 'Statutory Claims'
    },
    {
      name: 'Bert Aquino',
      roleTitle: 'Lobby Exit Security Officer',
      email: 'bert.aquino@stjude.ph',
      badge: 'Gate Pass Security'
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const result = await login({ email, password, facilityCode });
    if (!result.success) {
      setErrorMessage(result.error || 'Authentication failed. Please verify credentials.');
      setIsLoading(false);
    }
  };

  const handleQuickSelect = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('HospitalRCM2026!');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 font-sans antialiased relative overflow-hidden">
      {sessionNotice && <div role="alert" className="relative z-10 mb-4 w-full max-w-xl rounded-xl border border-amber-300 bg-amber-50 px-5 py-3 text-sm text-amber-950">{sessionNotice}</div>}
      {/* Background Subtle Tech Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      {/* Main Authentication Card */}
      <div className="w-full max-w-xl bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative z-10">
        {/* Header Bar */}
        <div className="bg-slate-950 px-8 py-6 text-white border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/logo/MedCore_Badge_Logo.png"
                alt="MedCore"
                className="h-10 w-auto max-h-10 object-contain brightness-110"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg tracking-tight text-white">
                    MedCore
                  </span>
                  <span className="text-[10px] font-bold text-blue-400 bg-blue-950/80 border border-blue-800 px-2 py-0.5 rounded">
                    v2.4 Enterprise
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>St. Jude Medical Center Manila (SJMC-MNL)</span>
                </div>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>PBKDF2 SHA-256</span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Hospital Command Sign-In</h2>
            <p className="text-xs text-slate-500 mt-1">
              Authorized hospital revenue cycle and clinical staff workstation terminal.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in duration-200">
              <div className="w-2 h-2 rounded-full bg-rose-600 shrink-0 mt-1" />
              <div className="flex-1 break-words leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Staff Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@stjude.ph"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <span className="text-[11px] text-slate-500 font-mono">Demo: HospitalRCM2026!</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Facility Identifier</span>
                  <span className="text-[10px] text-slate-400 font-normal">Single-Facility Context</span>
                </label>
                {/* Architectural Note: Defaults to San Jose Medical Center Manila ('SJMC-MNL'). Read-only for single-facility hospital deployment, extensible for future multi-tenant facility selector. */}
                <input
                  type="text"
                  value={facilityCode}
                  onChange={(e) => setFacilityCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono bg-slate-50 text-slate-700"
                  readOnly
                  title="San Jose Medical Center - Manila (SJMC-MNL): Default single-facility operational context"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Session Shift Life
                </label>
                <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-xs font-medium flex items-center justify-between">
                  <span>8 Hours</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Active</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating Station...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Hospital Workstation</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* 1-Click Quick Demo Switcher */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>1-Click Hospital Staff Personas:</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-400">Click to autofill credentials</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleQuickSelect(acc.email)}
                  className={`p-2.5 rounded-xl text-left border transition-all text-xs cursor-pointer ${
                    email === acc.email
                      ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="font-bold text-slate-900 truncate leading-tight">{acc.name}</div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">{acc.badge}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="bg-slate-50 px-8 py-3.5 border-t border-slate-200 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <span>Protected under RA 10173 (Data Privacy Act of 2012)</span>
          <span className="font-mono text-slate-400">HITP-MEDCORE-MANILA-092</span>
        </div>
      </div>
    </div>
  );
};
