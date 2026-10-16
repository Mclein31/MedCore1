import { useQueryClient } from '@tanstack/react-query';
import { KeyRound, Smartphone } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { Logo } from '../components/Logo';
import { QrCode } from '../components/QrCode';
import { Alert, Button, Field, Input } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import type { LoginResult } from '../lib/types';
import { STAFF_ME_KEY, useStaffMeQuery } from './session';

type Step =
  | { kind: 'password' }
  | { kind: 'mfa'; challenge: string }
  | { kind: 'enroll'; challenge: string; secret?: string; uri?: string }
  | { kind: 'recovery'; codes: string[] };

export function StaffLogin() {
  const [step, setStep] = useState<Step>({ kind: 'password' });
  const [params] = useSearchParams();
  const me = useStaffMeQuery();
  if (me.isSuccess && step.kind !== 'recovery') return <Navigate to="/staff" replace />;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Logo subtitle="Hospital staff" />
        <div className="mt-8 rounded-xl border border-line bg-surface p-6">
          {params.get('expired') && step.kind === 'password' && (
            <div className="mb-4">
              <Alert tone="info">Your session ended. Please sign in again.</Alert>
            </div>
          )}
          {step.kind === 'password' && <PasswordStep onNext={setStep} />}
          {step.kind === 'mfa' && (
            <MfaStep challenge={step.challenge} onRestart={() => setStep({ kind: 'password' })} />
          )}
          {step.kind === 'enroll' && (
            <EnrollStep
              challenge={step.challenge}
              onDone={(codes) => setStep({ kind: 'recovery', codes })}
              onRestart={() => setStep({ kind: 'password' })}
            />
          )}
          {step.kind === 'recovery' && <RecoveryCodes codes={step.codes} />}
        </div>
        <p className="mt-6 text-center text-xs text-subtle">
          Access is logged. Never share your password or codes.
        </p>
      </div>
    </main>
  );
}

function PasswordStep({ onNext }: { onNext: (step: Step) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api<LoginResult>('/v1/auth/staff/login', {
        method: 'POST',
        body: { email, password },
      });
      setPassword('');
      if (result.status === 'MFA_REQUIRED') onNext({ kind: 'mfa', challenge: result.challenge });
      else if (result.status === 'MFA_ENROLLMENT_REQUIRED')
        onNext({ kind: 'enroll', challenge: result.challenge });
      else {
        await queryClient.invalidateQueries({ queryKey: STAFF_ME_KEY });
        navigate('/staff', { replace: true });
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <h1 className="text-lg font-semibold">Sign in</h1>
      {error && <Alert>{error}</Alert>}
      <Field label="Work email">
        {(f) => (
          <Input
            {...f}
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
      </Field>
      <Field label="Password">
        {(f) => (
          <Input
            {...f}
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
      </Field>
      <Button type="submit" busy={busy} disabled={!email || !password}>
        Continue
      </Button>
      <p className="text-xs text-subtle">
        Forgot your password? Ask your hospital administrator to send you a new sign-in link.
      </p>
    </form>
  );
}

function MfaStep({ challenge, onRestart }: { challenge: string; onRestart: () => void }) {
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api<LoginResult>('/v1/auth/staff/mfa/verify', {
        method: 'POST',
        body: { challenge, code: code.trim() },
      });
      await queryClient.invalidateQueries({ queryKey: STAFF_ME_KEY });
      navigate('/staff', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Smartphone aria-hidden className="size-5 text-brand-700" />
        <h1 className="text-lg font-semibold">Two-step sign-in</h1>
      </div>
      <p className="text-sm text-muted">
        {useRecovery
          ? 'Enter one of your saved recovery codes. Each works once.'
          : 'Enter the 6-digit code from your authenticator app.'}
      </p>
      {error && <Alert>{error}</Alert>}
      <Field label={useRecovery ? 'Recovery code' : 'Authentication code'}>
        {(f) => (
          <Input
            {...f}
            autoFocus
            autoComplete="one-time-code"
            inputMode={useRecovery ? 'text' : 'numeric'}
            pattern={useRecovery ? undefined : '[0-9]*'}
            maxLength={useRecovery ? 14 : 6}
            placeholder={useRecovery ? 'XXXX-XXXX-XXXX' : '123456'}
            value={code}
            onChange={(e) =>
              setCode(useRecovery ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, ''))
            }
            className="tabular tracking-widest"
          />
        )}
      </Field>
      <Button type="submit" busy={busy} disabled={useRecovery ? code.length < 14 : code.length !== 6}>
        Verify
      </Button>
      <div className="flex justify-between text-sm">
        <button
          type="button"
          className="font-medium text-brand-800"
          onClick={() => {
            setUseRecovery(!useRecovery);
            setCode('');
          }}
        >
          {useRecovery ? 'Use authenticator code' : 'Use a recovery code'}
        </button>
        <button type="button" className="text-subtle" onClick={onRestart}>
          Start over
        </button>
      </div>
    </form>
  );
}

function EnrollStep({
  challenge,
  onDone,
  onRestart,
}: {
  challenge: string;
  onDone: (codes: string[]) => void;
  onRestart: () => void;
}) {
  const [setup, setSetup] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      setSetup(
        await api<{ secret: string; otpauthUri: string }>('/v1/auth/staff/mfa/enroll/start', {
          method: 'POST',
          body: { challenge },
        }),
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api<LoginResult>('/v1/auth/staff/mfa/enroll/confirm', {
        method: 'POST',
        body: { challenge, code },
      });
      if (result.status === 'SIGNED_IN') onDone(result.recoveryCodes ?? []);
    } catch (err) {
      setError(errorMessage(err));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  if (!setup) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <KeyRound aria-hidden className="size-5 text-brand-700" />
          <h1 className="text-lg font-semibold">Set up two-step sign-in</h1>
        </div>
        <p className="text-sm text-muted">
          Staff accounts need an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password
          or similar). It takes a minute.
        </p>
        {error && <Alert>{error}</Alert>}
        <Button onClick={start} busy={busy}>
          Begin setup
        </Button>
        <button type="button" className="text-sm text-subtle" onClick={onRestart}>
          Start over
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={confirm} className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Scan this code</h1>
      <p className="text-sm text-muted">Open your authenticator app, add an account, and scan the code.</p>
      <div className="flex justify-center">
        <QrCode value={setup.otpauthUri} label="Authenticator setup QR code" />
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer font-medium text-brand-800">
          Can’t scan? Enter the key instead
        </summary>
        <p className="mt-2 break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs tracking-wider">
          {setup.secret.match(/.{1,4}/g)?.join(' ')}
        </p>
      </details>
      {error && <Alert>{error}</Alert>}
      <Field label="6-digit code from the app">
        {(f) => (
          <Input
            {...f}
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="tabular tracking-widest"
          />
        )}
      </Field>
      <Button type="submit" busy={busy} disabled={code.length !== 6}>
        Turn on two-step sign-in
      </Button>
    </form>
  );
}

function RecoveryCodes({ codes }: { codes: string[] }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Save your recovery codes</h1>
      <Alert tone="warn">
        These are shown only once. If you lose your phone, each code lets you sign in one time. Store them
        somewhere safe, like a password manager.
      </Alert>
      <ul className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 font-mono text-sm">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={saved}
          onChange={(e) => setSaved(e.target.checked)}
          className="size-4 accent-brand-700"
        />
        I saved these codes
      </label>
      <Button
        disabled={!saved}
        onClick={async () => {
          await queryClient.invalidateQueries({ queryKey: STAFF_ME_KEY });
          navigate('/staff', { replace: true });
        }}
      >
        Continue to MedCore
      </Button>
    </div>
  );
}
