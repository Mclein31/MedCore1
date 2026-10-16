import React, { useState } from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import { Lock } from '@/components/common/SolarIcons';

const demoAccounts = [
  { name: 'Elena Santos', role: 'Inpatient billing', email: 'elena.santos@stjude.ph' },
  { name: 'Arthur Delgado', role: 'CFO / RCM director', email: 'arthur.delgado@stjude.ph' },
  { name: 'Dr. Manuel Reyes', role: 'Attending physician', email: 'manuel.reyes@stjude.ph' },
  { name: 'Marco Valenzuela', role: 'HMO liaison', email: 'marco.valenzuela@stjude.ph' },
  { name: 'Grace Tan', role: 'PhilHealth claims', email: 'grace.tan@stjude.ph' },
  { name: 'Bert Aquino', role: 'Gate pass security', email: 'bert.aquino@stjude.ph' }
];

const inputClass =
  'block w-full h-11 px-3 rounded border border-[var(--border-control)] bg-white text-[15px] text-[var(--text-primary)] placeholder:text-slate-400 focus:outline-none focus:border-[#11806D] focus:ring-2 focus:ring-[#11806D]/25';

export const LoginScreen: React.FC = () => {
  const { login, sessionNotice, initialLoginEmail } = useMedCore();
  const [email, setEmail] = useState(initialLoginEmail);
  const [password, setPassword] = useState('');
  const [facilityCode] = useState('SJMC-MNL');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen w-full bg-white text-[var(--text-primary)] font-sans antialiased flex flex-col lg:flex-row selection:bg-[#11806D] selection:text-white">
      {/* Context column */}
      <aside className="lg:w-[40%] lg:max-w-xl bg-[var(--bg-app)] border-b lg:border-b-0 lg:border-r border-[var(--border-neutral)] px-6 py-6 sm:px-10 lg:px-12 lg:py-12 flex flex-col">
        <div className="flex items-center gap-3">
          <img src="/logo/MedCore_Badge_Logo.png" alt="MedCore" className="h-9 w-auto object-contain" />
          <span className="text-lg font-bold tracking-tight">MedCore</span>
        </div>

        <div className="hidden lg:block mt-auto mb-auto py-16">
          <h1 className="text-[2rem] leading-[1.15] font-bold tracking-tight max-w-[16ch]">
            Billing that is settled before the patient reaches the gate.
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-secondary)] max-w-[40ch]">
            PhilHealth, HMO and senior/PWD deductions applied in order, so cashiers and security see one final balance.
          </p>
        </div>

        <dl className="hidden lg:grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm border-t border-[var(--border-neutral)] pt-5">
          <dt className="text-[var(--text-muted)]">Facility</dt>
          <dd className="font-medium">St. Jude Medical Center Manila</dd>
          <dt className="text-[var(--text-muted)]">Code</dt>
          <dd className="font-mono">{facilityCode}</dd>
          <dt className="text-[var(--text-muted)]">Session</dt>
          <dd>Ends after 8 hours</dd>
        </dl>
      </aside>

      {/* Form column */}
      <main className="flex-1 flex flex-col px-6 py-10 sm:px-10 lg:px-16 lg:py-12">
        <div className="w-full max-w-md my-auto mx-auto lg:mx-0 lg:ml-[8%]">
          {sessionNotice && (
            <div role="alert" className="mb-6 border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              {sessionNotice}
            </div>
          )}

          <h2 className="text-2xl font-bold tracking-tight">Sign in</h2>
          <p className="mt-1.5 text-sm text-[var(--text-secondary)]">Use your St. Jude staff email.</p>

          {errorMessage && (
            <div role="alert" className="mt-6 border-l-4 border-rose-600 bg-rose-50 px-4 py-3 text-sm text-rose-900 break-words">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="login-email" className="block text-sm font-semibold mb-1.5">Email</label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@stjude.ph"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-semibold mb-1.5">Password</label>
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded bg-[#11806D] hover:bg-[#0D6A5A] active:bg-[#0B5A4C] text-white text-[15px] font-semibold transition-colors disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#11806D]"
            >
              {isLoading ? (
                <>
                  <span aria-hidden="true" className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Signing in…</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </form>

          <section className="mt-10" aria-labelledby="demo-accounts-heading">
            <h3 id="demo-accounts-heading" className="text-sm font-semibold">Demo accounts</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">Select one to fill in the email.</p>
            <ul className="mt-3 border-t border-[var(--border-neutral)]">
              {demoAccounts.map((acc) => {
                const isSelected = email === acc.email;
                return (
                  <li key={acc.email} className="border-b border-[var(--border-neutral)]">
                    <button
                      type="button"
                      onClick={() => handleQuickSelect(acc.email)}
                      aria-pressed={isSelected}
                      className={`w-full min-h-11 py-2 pl-3 pr-2 flex items-baseline justify-between gap-4 text-left text-sm cursor-pointer border-l-[3px] focus:outline-none focus-visible:bg-slate-100 ${
                        isSelected
                          ? 'border-[#11806D] bg-[#E7F4F0]'
                          : 'border-transparent hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-medium">{acc.name}</span>
                      <span className="text-[var(--text-secondary)] text-right">{acc.role}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <p className="mt-10 w-full max-w-md mx-auto lg:mx-0 lg:ml-[8%] text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
          <Lock className="w-3 h-3" aria-hidden="true" />
          <span>Protected under RA 10173 (Data Privacy Act of 2012)</span>
        </p>
      </main>
    </div>
  );
};
