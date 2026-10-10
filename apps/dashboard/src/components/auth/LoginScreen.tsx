import React, { useState } from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import { Building2, ShieldCheck, Lock, Mail, ArrowRight, UserCheck, Check, Sparkles } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login, sessionNotice, initialLoginEmail } = useMedCore();
  const [email, setEmail] = useState(initialLoginEmail);
  const [password, setPassword] = useState(sessionNotice ? '' : 'HospitalRCM2026!');
  const [facilityCode, setFacilityCode] = useState('SJMC-MNL');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const demoAccounts = [
    {
      name: 'Elena Santos',
      roleTitle: 'Inpatient Billing Specialist',
      email: 'elena.santos@stjude.ph',
      badge: 'Billing Lead',
      initials: 'ES',
      color: 'teal'
    },
    {
      name: 'Arthur Delgado',
      roleTitle: 'Hospital CFO / RCM Director',
      email: 'arthur.delgado@stjude.ph',
      badge: 'Executive CFO',
      initials: 'AD',
      color: 'navy'
    },
    {
      name: 'Dr. Manuel Reyes',
      roleTitle: 'Attending Physician (FPCP)',
      email: 'manuel.reyes@stjude.ph',
      badge: 'Clinical MD',
      initials: 'MR',
      color: 'sky'
    },
    {
      name: 'Marco Valenzuela',
      roleTitle: 'HMO Liaison Coordinator',
      email: 'marco.valenzuela@stjude.ph',
      badge: 'Commercial Payer',
      initials: 'MV',
      color: 'indigo'
    },
    {
      name: 'Grace Tan',
      roleTitle: 'PhilHealth Claims Auditor',
      email: 'grace.tan@stjude.ph',
      badge: 'Statutory Claims',
      initials: 'GT',
      color: 'emerald'
    },
    {
      name: 'Bert Aquino',
      roleTitle: 'Lobby Exit Security Officer',
      email: 'bert.aquino@stjude.ph',
      badge: 'Gate Pass Security',
      initials: 'BA',
      color: 'amber'
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
    <div className="min-h-screen w-full bg-[#0A1D33] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 font-sans antialiased relative overflow-hidden selection:bg-[#11806D] selection:text-white">
      {/* Ambient Radial Background Glows (matching mobile LaunchScreen / preload) */}
      <div className="absolute -top-40 -left-40 w-[32rem] h-[32rem] rounded-full bg-[#18385E]/70 blur-[110px] pointer-events-none" />
      <div className="absolute -bottom-48 -right-48 w-[36rem] h-[36rem] rounded-full bg-[#0F2A4A] blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] rounded-full bg-[#11806D]/10 blur-[130px] pointer-events-none" />

      {/* Decorative Network & Ribbon Geometry */}
      <svg
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-none opacity-35"
        viewBox="0 0 1440 900"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <path d="M-100 820L1540 220" stroke="rgba(255,255,255,0.03)" strokeWidth="120" />
        <path d="M-80 870L1560 270" stroke="#11806D" strokeOpacity="0.08" strokeWidth="60" />

        <path d="M140 240h80v-45h60" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" fill="none" />
        <circle cx="280" cy="195" r="4.5" fill="#11806D" />
        <circle cx="280" cy="195" r="9" fill="#11806D" fillOpacity="0.25" />

        <path d="M1260 660h-75v45h-65" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" fill="none" />
        <circle cx="1120" cy="705" r="4.5" fill="#0284C7" />
        <circle cx="1120" cy="705" r="9" fill="#0284C7" fillOpacity="0.25" />

        <circle cx="95" cy="480" r="3" fill="#38BDF8" fillOpacity="0.4" />
        <circle cx="1340" cy="360" r="3" fill="#11806D" fillOpacity="0.4" />
      </svg>

      {/* Subtle fine technical grid with center radial mask */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_right,#18385E_1px,transparent_1px),linear-gradient(to_bottom,#18385E_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_50%,#000_60%,transparent_100%)] opacity-25 pointer-events-none"
      />

      {/* Session Expired / Status Notice */}
      {sessionNotice && (
        <div
          role="alert"
          className="relative z-10 mb-4 w-full max-w-5xl rounded-lg border border-amber-300/80 bg-amber-50/95 backdrop-blur-md px-5 py-3.5 text-xs sm:text-sm text-amber-950 shadow-lg flex items-center gap-3 animate-in fade-in"
        >
          <div className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
          <span className="flex-1 font-medium">{sessionNotice}</span>
        </div>
      )}

      {/* Main Authentication Container: Responsive Split-Screen Layout */}
      <div className="w-full max-w-5xl bg-white text-slate-900 rounded-3xl shadow-[0_30px_70px_-15px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.12)] border border-slate-200/90 overflow-hidden relative z-10 grid grid-cols-1 lg:grid-cols-12 transition-all">
        
        {/* Left Side: Visual Brand Panel (Mobile Preload Orbital Emblem + Onboarding Messaging) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#0F2A4A] via-[#0A1D33] to-[#08182B] text-white p-6 sm:p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-white/10">
          {/* Subtle concentric orbital arcs from mobile LaunchScreen */}
          <svg
            aria-hidden="true"
            className="absolute -right-16 -top-16 w-64 h-64 opacity-25 pointer-events-none"
            viewBox="0 0 200 200"
            fill="none"
          >
            <circle cx="100" cy="100" r="88" stroke="white" strokeWidth="1" strokeDasharray="5 7" opacity="0.5" />
            <circle cx="100" cy="100" r="70" stroke="#11806D" strokeWidth="2" strokeDasharray="70 140" />
            <circle cx="100" cy="100" r="50" stroke="white" strokeWidth="1" opacity="0.3" />
            <circle cx="100" cy="30" r="4" fill="#38BDF8" />
            <circle cx="170" cy="100" r="3.5" fill="#11806D" />
          </svg>

          {/* Top Branding Section - Plain enlarged logo without container background */}
          <div className="relative z-10">
            <div className="flex items-center gap-3.5">
              <img
                src="/logo/MedCore_Badge_Logo.png"
                alt="MedCore"
                className="h-11 w-auto object-contain drop-shadow-[0_2px_12px_rgba(17,128,109,0.5)] shrink-0"
              />
              <div>
                <span className="font-extrabold text-xl tracking-tight text-white block">
                  MedCore
                </span>
                <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-0.5 font-medium">
                  <Building2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>St. Jude Medical Center Manila</span>
                </div>
              </div>
            </div>

            {/* Desktop Visual Feature Narrative (Preload & Onboarding Narrative) */}
            <div className="hidden lg:flex flex-col mt-12 space-y-6">
              {/* Central Shield Graphic with Orbital Glow - Plain enlarged logo without container background */}
              <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
                <svg
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full animate-[spin_24s_linear_infinite]"
                  viewBox="0 0 144 144"
                  fill="none"
                >
                  <circle cx="72" cy="72" r="66" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
                  <circle cx="72" cy="72" r="54" stroke="#11806D" strokeWidth="2" strokeDasharray="90 260" strokeLinecap="round" />
                  <circle cx="72" cy="6" r="4.5" fill="#11806D" />
                  <circle cx="72" cy="138" r="3.5" fill="#38BDF8" />
                </svg>
                <img
                  src="/logo/MedCore_Badge_Logo.png"
                  alt="MedCore Shield"
                  className="w-24 h-24 object-contain drop-shadow-[0_4px_16px_rgba(17,128,109,0.6)] relative z-10"
                />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Hospital Care, Clearly Connected.
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
                  Unified revenue cycle terminal coordinating statutory claims, patient billing transparency, and verified exit passes.
                </p>
              </div>

              {/* Bento Feature Badges - Plain text only, less round corners */}
              <div className="space-y-2.5 pt-2">
                <div className="p-3 rounded-md bg-white/5 border border-white/10 backdrop-blur-xs">
                  <div className="text-left text-xs min-w-0">
                    <div className="font-bold text-white truncate">Cryptographic Workstation Vault</div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">PBKDF2 SHA-256 session isolation</div>
                  </div>
                </div>

                <div className="p-3 rounded-md bg-white/5 border border-white/10 backdrop-blur-xs">
                  <div className="text-left text-xs min-w-0">
                    <div className="font-bold text-white truncate">SJMC-MNL Operational Scope</div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">Single-facility hospital context (SJMC-MNL)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Left Status (no green dot, no stepper dots) */}
          <div className="relative z-10 pt-6 mt-6 border-t border-white/10 flex items-center justify-between">
            <div className="text-[11px] text-slate-300 font-medium">
              <span>SJMC Hospital Workstation Active</span>
            </div>
          </div>
        </div>

        {/* Right Side: Primary Sign-In Form & Persona Switcher */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 lg:p-10 flex flex-col justify-between space-y-6">
          <div>
            {/* Header & Subtitle */}
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Hospital Command Sign-In</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Authorized revenue cycle, medical and administrative terminal access.
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in duration-200">
                <div className="w-2 h-2 rounded-full bg-rose-600 shrink-0 mt-1" />
                <div className="flex-1 break-words leading-relaxed">{errorMessage}</div>
              </div>
            )}

            {/* Sign-In Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Staff Email Address
                </label>
                <div className="relative group">
                  <Mail className="w-4 h-4 text-slate-400 group-focus-within:text-[#11806D] transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@stjude.ph"
                    className="w-full pl-10 pr-4 py-2.5 rounded-md border border-slate-200 bg-slate-50/70 text-slate-900 text-sm font-medium placeholder:text-slate-400 hover:bg-slate-50 hover:border-slate-300 focus:bg-white focus:outline-none focus:border-[#11806D] focus:ring-4 focus:ring-[#11806D]/10 transition-all duration-150"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-[#11806D] transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-md border border-slate-200 bg-slate-50/70 text-slate-900 text-sm font-medium placeholder:text-slate-400 hover:bg-slate-50 hover:border-slate-300 focus:bg-white focus:outline-none focus:border-[#11806D] focus:ring-4 focus:ring-[#11806D]/10 transition-all duration-150"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Facility Identifier</span>
                    <span className="text-[10px] text-slate-400 font-normal">Single-Facility</span>
                  </label>
                  <div className="w-full px-3.5 py-2.5 rounded-md border border-slate-200 bg-slate-50 text-slate-700 text-sm font-mono flex items-center justify-between">
                    <span>{facilityCode}</span>
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Session Shift Life
                  </label>
                  <div className="w-full px-3.5 py-2.5 rounded-md border border-slate-200 bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-between">
                    <span>8 Hours</span>
                  </div>
                </div>
              </div>

              {/* Primary Action Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-5 rounded-md bg-gradient-to-r from-[#0F6D5F] to-[#11806D] hover:from-[#0D5E52] hover:to-[#0F6D5F] text-white font-bold text-sm transition-all duration-150 shadow-[0_2px_8px_rgba(17,128,109,0.3)] hover:shadow-[0_4px_16px_rgba(17,128,109,0.4)] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authenticating Station...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Hospital Workstation</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* 1-Click Hospital Staff Personas - Less round corners */}
            <div className="pt-5 mt-5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[#11806D]" />
                  <span>1-Click Hospital Staff Personas:</span>
                </span>
                <span className="text-[10px] font-semibold text-slate-400">Click to autofill credentials</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {demoAccounts.map((acc) => {
                  const isSelected = email === acc.email;
                  return (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => handleQuickSelect(acc.email)}
                      className={`p-2.5 rounded-md text-left border transition-all text-xs cursor-pointer relative group flex flex-col justify-between ${
                        isSelected
                          ? 'bg-[#E7F4F0]/80 border-[#11806D] ring-2 ring-[#11806D]/20 shadow-xs text-slate-900'
                          : 'bg-slate-50/70 hover:bg-white hover:border-slate-300 border-slate-200/90 text-slate-700 hover:shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 w-full">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {/* Avatar Initial Pill */}
                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              isSelected
                                ? 'bg-[#11806D] text-white'
                                : 'bg-slate-200/80 text-slate-600 group-hover:bg-[#E7F4F0] group-hover:text-[#11806D]'
                            }`}
                          >
                            {acc.initials}
                          </div>
                          <div className="font-bold text-slate-900 truncate leading-tight text-xs">
                            {acc.name}
                          </div>
                        </div>

                        {isSelected && (
                          <Check className="w-3 h-3 text-[#11806D] shrink-0" />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-1.5 font-medium pl-6.5">
                        {acc.badge}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer: Regulatory Notice */}
          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>Protected under RA 10173 (Data Privacy Act of 2012)</span>
          </div>
        </div>

      </div>

      {/* System Status Footer */}
      <div className="mt-6 flex items-center gap-2 text-slate-400 text-xs tracking-wide">
        <span className="font-medium text-[11px] text-slate-400">
          MedCore Enterprise Healthcare Station • St. Jude Medical Center Manila (SJMC-MNL)
        </span>
      </div>
    </div>
  );
};


