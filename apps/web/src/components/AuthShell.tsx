import type { ReactNode } from 'react';
import badge from '../assets/logo-badge.png';
import wordmark from '../assets/logo-text.png';

/** The v1 split sign-in layout: a quiet context column on the left, the form on the right. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full flex-col bg-white lg:flex-row">
      <aside className="flex flex-col border-b border-line bg-canvas px-6 py-6 sm:px-10 lg:w-[40%] lg:max-w-xl lg:border-r lg:border-b-0 lg:px-12 lg:py-12">
        <div className="flex min-w-0 items-center">
          <img src={badge} alt="" aria-hidden className="h-20 w-auto shrink-0 object-contain sm:h-24" />
          <div className="-ml-4 min-w-0">
            <img src={wordmark} alt="MedCore" className="w-44 max-w-full object-contain sm:w-56" />
          </div>
        </div>
        <div className="my-auto hidden py-16 lg:block">
          <p className="max-w-[16ch] text-[2rem] leading-[1.15] font-bold tracking-tight">
            Billing that is settled before the patient reaches the gate.
          </p>
          <p className="mt-5 max-w-[40ch] text-[15px] leading-relaxed text-muted">
            PhilHealth, HMO and senior/PWD deductions applied in order, so cashiers and security see one final
            balance.
          </p>
        </div>
        <dl className="hidden grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-line pt-5 text-sm lg:grid">
          <dt className="text-subtle">Access</dt>
          <dd className="font-medium">Hospital staff, by invitation</dd>
          <dt className="text-subtle">Sign-in</dt>
          <dd>Password and authenticator app</dd>
          <dt className="text-subtle">Session</dt>
          <dd>Ends after 8 hours, or 30 minutes idle</dd>
        </dl>
      </aside>
      <main className="flex flex-1 flex-col px-6 py-10 sm:px-10 lg:px-16 lg:py-12">
        <div className="mx-auto my-auto w-full max-w-md lg:mx-0 lg:ml-[8%]">{children}</div>
        <p className="mx-auto mt-10 w-full max-w-md text-xs text-muted lg:mx-0 lg:ml-[8%]">
          Protected under RA 10173 (Data Privacy Act of 2012). Access is logged; never share your password or
          codes.
        </p>
      </main>
    </div>
  );
}
