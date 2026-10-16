import { useQueryClient } from '@tanstack/react-query';
import { MailCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Logo } from '../components/Logo';
import { Alert, Button, cx, Field, Input } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { PATIENT_ME_KEY } from './PortalLayout';

const DEFAULT_FACILITY = (import.meta.env.VITE_FACILITY_CODE as string | undefined) ?? 'SJMC-MNL';

type Mode = 'LOGIN' | 'REGISTER';

export function PortalSignIn() {
  const [mode, setMode] = useState<Mode>('REGISTER');
  const [facilityCode, setFacilityCode] = useState(DEFAULT_FACILITY);
  const [email, setEmail] = useState('');
  const [mrn, setMrn] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const identity =
    mode === 'LOGIN'
      ? { purpose: mode, facilityCode, email }
      : { purpose: mode, facilityCode, mrn: mrn.trim().toUpperCase(), dateOfBirth };

  const request = async (e?: FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/v1/auth/patient/code/request', { method: 'POST', body: identity });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/v1/auth/patient/code/verify', { method: 'POST', body: { ...identity, code } });
      await queryClient.invalidateQueries({ queryKey: PATIENT_ME_KEY });
      navigate('/portal', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Logo subtitle="Patients and families" />
        <div className="mt-8 rounded-xl border border-line bg-surface p-6">
          {!sent ? (
            <form onSubmit={request} className="flex flex-col gap-4">
              <h1 className="text-lg font-semibold">See your hospital bill</h1>
              <div
                role="tablist"
                aria-label="How do you want to sign in?"
                className="grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm"
              >
                {(['REGISTER', 'LOGIN'] as Mode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={mode === m}
                    onClick={() => {
                      setMode(m);
                      setError(null);
                    }}
                    className={cx(
                      'rounded-md px-3 py-1.5 font-medium',
                      mode === m ? 'bg-white text-ink shadow-sm' : 'text-muted',
                    )}
                  >
                    {m === 'REGISTER' ? 'First time' : 'Returning'}
                  </button>
                ))}
              </div>
              {error && <Alert>{error}</Alert>}
              {mode === 'REGISTER' ? (
                <>
                  <p className="text-sm text-muted">
                    Use the record number on your admission slip or wristband. We email a code to the address
                    the hospital has on file.
                  </p>
                  <Field label="Hospital record number (MRN)">
                    {(f) => (
                      <Input
                        {...f}
                        autoComplete="off"
                        value={mrn}
                        maxLength={32}
                        onChange={(e) => setMrn(e.target.value)}
                      />
                    )}
                  </Field>
                  <Field label="Patient’s date of birth">
                    {(f) => (
                      <Input
                        {...f}
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                      />
                    )}
                  </Field>
                </>
              ) : (
                <Field label="Email address">
                  {(f) => (
                    <Input
                      {...f}
                      type="email"
                      autoComplete="email"
                      value={email}
                      maxLength={254}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  )}
                </Field>
              )}
              <details className="text-sm">
                <summary className="cursor-pointer text-subtle">Different hospital?</summary>
                <div className="mt-2">
                  <Field label="Hospital code">
                    {(f) => (
                      <Input
                        {...f}
                        value={facilityCode}
                        maxLength={32}
                        onChange={(e) => setFacilityCode(e.target.value.toUpperCase())}
                      />
                    )}
                  </Field>
                </div>
              </details>
              <Button type="submit" busy={busy} disabled={mode === 'LOGIN' ? !email : !mrn || !dateOfBirth}>
                Email me a code
              </Button>
            </form>
          ) : (
            <form onSubmit={verify} className="flex flex-col gap-4">
              <MailCheck aria-hidden className="size-6 text-brand-700" />
              <h1 className="text-lg font-semibold">Check your email</h1>
              <p className="text-sm text-muted">
                If the details match the hospital’s records, a 6-digit code is on its way to the email on
                file. It expires in 10 minutes.
              </p>
              {error && <Alert>{error}</Alert>}
              <Field label="6-digit code">
                {(f) => (
                  <Input
                    {...f}
                    autoFocus
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    className="tabular tracking-[0.3em]"
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  />
                )}
              </Field>
              <Button type="submit" busy={busy} disabled={code.length !== 6}>
                Sign in
              </Button>
              <div className="flex justify-between text-sm">
                <button
                  type="button"
                  className="font-medium text-brand-800"
                  onClick={() => request()}
                  disabled={busy}
                >
                  Send a new code
                </button>
                <button
                  type="button"
                  className="text-subtle"
                  onClick={() => {
                    setSent(false);
                    setCode('');
                    setError(null);
                  }}
                >
                  Change details
                </button>
              </div>
              <p className="text-xs text-subtle">
                No email? The billing desk can add or correct it after checking your ID.
              </p>
            </form>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-subtle">
          Hospital staff will never ask you for this code.
        </p>
      </div>
    </main>
  );
}
