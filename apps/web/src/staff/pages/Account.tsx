import { checkPassword, ROLE_LABELS } from '@medcore/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Badge, Button, Card, Field, Input, PageHeader, Spinner, Table } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { when } from '../../lib/format';
import { useStaff } from '../session';

interface SessionRow {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
}

export function Account() {
  const { user, facility } = useStaff();
  return (
    <>
      <PageHeader
        title="Your account"
        subtitle={`${user.email} · ${ROLE_LABELS[user.role]} · ${facility.name}`}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Sessions />
        <ChangePassword email={user.email} fullName={user.fullName} />
        {user.mfaEnabled && <RecoveryCodes />}
      </div>
    </>
  );
}

function Sessions() {
  const queryClient = useQueryClient();
  const sessions = useQuery({
    queryKey: ['my-sessions'],
    queryFn: () => api<{ items: SessionRow[] }>('/v1/auth/staff/sessions'),
  });
  const revokeOthers = useMutation({
    mutationFn: () =>
      api<{ revoked: number }>('/v1/auth/staff/sessions/revoke-others', { method: 'POST', body: {} }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-sessions'] }),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => api(`/v1/auth/staff/sessions/${id}/revoke`, { method: 'POST', body: {} }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-sessions'] }),
  });
  return (
    <Card
      title="Where you are signed in"
      actions={
        <Button
          size="sm"
          variant="secondary"
          onClick={() => revokeOthers.mutate()}
          busy={revokeOthers.isPending}
        >
          Sign out everywhere else
        </Button>
      }
    >
      {sessions.isPending && <Spinner />}
      {(sessions.isError || revoke.isError) && <Alert>{errorMessage(sessions.error ?? revoke.error)}</Alert>}
      {revokeOthers.isSuccess && (
        <Alert tone="good">Signed out of {revokeOthers.data.revoked} other session(s).</Alert>
      )}
      {sessions.data && (
        <Table head={['Device', 'Last active', '']} caption="Active sessions">
          {sessions.data.items.map((s) => (
            <tr key={s.id}>
              <td className="max-w-56 px-3 py-2.5">
                <p className="truncate text-xs">{s.userAgent ?? 'Unknown device'}</p>
                <p className="text-xs text-subtle">
                  {s.ip ?? 'unknown IP'} · since {when(s.createdAt)}
                </p>
              </td>
              <td className="px-3 py-2.5 text-xs">{when(s.lastSeenAt)}</td>
              <td className="px-3 py-2.5 text-right">
                {s.current ? (
                  <Badge tone="brand">This device</Badge>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => revoke.mutate(s.id)}>
                    Sign out
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </Card>
  );
}

function ChangePassword({ email, fullName }: { email: string; fullName: string }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const policy = next ? checkPassword(next, { email, fullName }) : null;
  const change = useMutation({
    mutationFn: () =>
      api('/v1/auth/staff/password', {
        method: 'POST',
        body: { currentPassword: current, newPassword: next },
      }),
    onSuccess: () => {
      setCurrent('');
      setNext('');
    },
  });
  return (
    <Card title="Change password">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          change.mutate();
        }}
      >
        {change.isError && <Alert>{errorMessage(change.error)}</Alert>}
        {change.isSuccess && (
          <Alert tone="good">Password changed. Your other sessions were signed out.</Alert>
        )}
        <Field label="Current password">
          {(f) => (
            <Input
              {...f}
              type="password"
              autoComplete="current-password"
              maxLength={128}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          )}
        </Field>
        <Field
          label="New password"
          hint="At least 12 characters. Not your name or email."
          error={policy && !policy.ok ? policy.reason : undefined}
        >
          {(f) => (
            <Input
              {...f}
              type="password"
              autoComplete="new-password"
              maxLength={128}
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          )}
        </Field>
        <Button type="submit" busy={change.isPending} disabled={!current || !policy?.ok}>
          Change password
        </Button>
      </form>
    </Card>
  );
}

function RecoveryCodes() {
  const [code, setCode] = useState('');
  const regen = useMutation({
    mutationFn: () =>
      api<{ recoveryCodes: string[] }>('/v1/auth/staff/mfa/recovery-codes', {
        method: 'POST',
        body: { code },
      }),
    onSettled: () => setCode(''),
  });
  return (
    <Card title="Recovery codes">
      {regen.data ? (
        <div className="flex flex-col gap-3">
          <Alert tone="warn">Your old codes no longer work. Save these now; they are not shown again.</Alert>
          <ul className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 font-mono text-sm">
            {regen.data.recoveryCodes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            regen.mutate();
          }}
        >
          <p className="text-sm text-muted">
            Lost your recovery codes? Make a new set. The old ones stop working.
          </p>
          {regen.isError && <Alert>{errorMessage(regen.error)}</Alert>}
          <Field label="Current code from your authenticator app">
            {(f) => (
              <Input
                {...f}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
            )}
          </Field>
          <Button type="submit" variant="secondary" busy={regen.isPending} disabled={code.length !== 6}>
            Make new recovery codes
          </Button>
        </form>
      )}
    </Card>
  );
}
