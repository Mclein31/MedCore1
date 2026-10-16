import { checkPassword } from '@medcore/domain';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Logo } from '../components/Logo';
import { Alert, Button, Field, Input } from '../components/ui';
import { api, errorMessage } from '../lib/api';

let capturedToken: string | null = null;

/**
 * The invite token arrives in the URL fragment, which is never sent to any server
 * or in Referer headers. Read it once, then wipe it from the address bar and history.
 */
function captureToken(): string {
  if (capturedToken === null) {
    capturedToken = new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '';
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
  }
  return capturedToken;
}

export function AcceptInvite() {
  const [token] = useState(captureToken);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [doneEmail, setDoneEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const policy = password ? checkPassword(password, { email: '' }) : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError('The two passwords do not match.');
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ email: string }>('/v1/auth/staff/accept-invite', {
        method: 'POST',
        body: { token, password },
      });
      setDoneEmail(res.email);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Logo subtitle="Hospital staff" />
        <div className="mt-8 rounded-xl border border-line bg-surface p-6">
          {!token ? (
            <Alert>This link is incomplete. Open the link from your invitation email again.</Alert>
          ) : doneEmail ? (
            <div className="flex flex-col gap-4">
              <Alert tone="good">Your password is set for {doneEmail}.</Alert>
              <Link
                to="/staff/login"
                className="text-sm font-medium text-brand-800 underline underline-offset-4"
              >
                Sign in and set up two-step sign-in
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <h1 className="text-lg font-semibold">Choose your password</h1>
              <p className="text-sm text-muted">
                Use at least 12 characters. A short phrase of unrelated words works well.
              </p>
              {error && <Alert>{error}</Alert>}
              <Field label="New password" error={policy && !policy.ok ? policy.reason : undefined}>
                {(f) => (
                  <Input
                    {...f}
                    type="password"
                    autoComplete="new-password"
                    maxLength={128}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                )}
              </Field>
              <Field label="Confirm password">
                {(f) => (
                  <Input
                    {...f}
                    type="password"
                    autoComplete="new-password"
                    maxLength={128}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                )}
              </Field>
              <Button type="submit" busy={busy} disabled={!policy?.ok || !confirm}>
                Set password
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
