import { ArrowRight, Building2, HeartPulse } from 'lucide-react';
import { Link } from 'react-router';
import { Logo } from '../components/Logo';

export function Landing() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-4 py-12">
      <Logo />
      <h1 className="mt-8 text-3xl font-semibold tracking-tight text-ink">Clear bills. Faster discharge.</h1>
      <p className="mt-3 max-w-xl text-muted">
        MedCore reconciles hospital, PhilHealth and HMO amounts to the centavo, clears patients for discharge,
        and gives families a plain-language bill they can pay or plan for.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <EntryCard
          to="/portal/sign-in"
          icon={<HeartPulse aria-hidden className="size-5" />}
          title="Patients and families"
          body="See your bill, ask about a charge, pay, or set up a 0% interest plan."
        />
        <EntryCard
          to="/staff/login"
          icon={<Building2 aria-hidden className="size-5" />}
          title="Hospital staff"
          body="Discharge clearance, billing, claims and the lobby exit check."
        />
      </div>
    </main>
  );
}

function EntryCard({
  to,
  icon,
  title,
  body,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-xl border border-line bg-surface p-5 transition-colors hover:border-brand-200 hover:bg-brand-50/40"
    >
      <div className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-800">
        {icon}
      </div>
      <p className="mt-4 flex items-center gap-1 font-semibold text-ink">
        {title}
        <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
      </p>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </Link>
  );
}
