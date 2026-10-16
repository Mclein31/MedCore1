import { CreateStaffBody, ROLE_LABELS, STAFF_ROLES, type StaffRole } from '@medcore/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Dialog,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
  Table,
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { when } from '../../lib/format';
import type { StaffUser } from '../../lib/types';
import { useStaff } from '../session';

type Row = StaffUser & { invitePending: boolean; lockedUntil: string | null };

export function Users() {
  const { user: me } = useStaff();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const users = useQuery({
    queryKey: ['staff-users'],
    queryFn: () => api<{ items: Row[] }>('/v1/staff/users'),
  });
  const act = useMutation({
    mutationFn: ({
      path,
      method = 'POST',
      body = {},
    }: {
      path: string;
      method?: 'POST' | 'PATCH';
      body?: unknown;
      done: string;
    }) => api(`/v1/staff/users${path}`, { method, body }),
    onSuccess: (_d, vars) => {
      setNotice(vars.done);
      queryClient.invalidateQueries({ queryKey: ['staff-users'] });
    },
  });

  return (
    <>
      <PageHeader
        title="Staff accounts"
        subtitle="Accounts are created by invitation only. Every change here is audited and ends the person's sessions."
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <Plus aria-hidden className="size-4" />
            Invite staff
          </Button>
        }
      />
      {notice && (
        <div className="mb-4">
          <Alert tone="good">{notice}</Alert>
        </div>
      )}
      {act.isError && (
        <div className="mb-4">
          <Alert>{errorMessage(act.error)}</Alert>
        </div>
      )}
      <Card>
        {users.isPending && <Spinner />}
        {users.isError && <Alert>{errorMessage(users.error)}</Alert>}
        {users.data && (
          <Table head={['Name', 'Role', 'Status', 'Two-step', 'Last sign-in', '']} caption="Staff accounts">
            {users.data.items.map((u) => {
              const locked = u.lockedUntil && new Date(u.lockedUntil) > new Date();
              return (
                <tr key={u.id}>
                  <td className="px-3 py-2.5">
                    <p className="font-medium">{u.fullName}</p>
                    <p className="text-xs text-subtle">{u.email}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    {u.id === me.id ? (
                      ROLE_LABELS[u.role]
                    ) : (
                      <Select
                        aria-label={`Role of ${u.fullName}`}
                        className="h-8 w-auto text-xs"
                        value={u.role}
                        onChange={(e) =>
                          act.mutate({
                            path: `/${u.id}`,
                            method: 'PATCH',
                            body: { role: e.target.value },
                            done: `${u.fullName} is now ${ROLE_LABELS[e.target.value as StaffRole]}.`,
                          })
                        }
                      >
                        {STAFF_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </Select>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {!u.isActive ? (
                      <Badge tone="neutral">Deactivated</Badge>
                    ) : locked ? (
                      <Badge tone="bad">Locked</Badge>
                    ) : u.invitePending ? (
                      <Badge tone="info">Invite pending</Badge>
                    ) : (
                      <Badge tone="good">Active</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {u.mfaEnabled ? <Badge tone="good">On</Badge> : <Badge tone="warn">Not set up</Badge>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-subtle">{when(u.lastLoginAt)}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    {u.id !== me.id && (
                      <div className="flex justify-end gap-1">
                        {locked && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              act.mutate({ path: `/${u.id}/unlock`, done: `${u.fullName} was unlocked.` })
                            }
                          >
                            Unlock
                          </Button>
                        )}
                        {u.isActive && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              act.mutate({
                                path: `/${u.id}/send-invite`,
                                done: `A new sign-in link was emailed to ${u.email}.`,
                              })
                            }
                          >
                            {u.invitePending ? 'Resend invite' : 'Reset password'}
                          </Button>
                        )}
                        {u.mfaEnabled && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              act.mutate({
                                path: `/${u.id}/reset-mfa`,
                                done: `${u.fullName} will set up two-step sign-in again.`,
                              })
                            }
                          >
                            Reset two-step
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant={u.isActive ? 'ghost' : 'secondary'}
                          onClick={() =>
                            act.mutate({
                              path: `/${u.id}`,
                              method: 'PATCH',
                              body: { isActive: !u.isActive },
                              done: `${u.fullName} was ${u.isActive ? 'deactivated' : 'reactivated'}.`,
                            })
                          }
                        >
                          {u.isActive ? 'Deactivate' : 'Reactivate'}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} onDone={setNotice} />
    </>
  );
}

function InviteDialog({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    email: '',
    fullName: '',
    role: 'BILLING_SPECIALIST',
    title: '',
    prcLicense: '',
  });
  const body = { ...form, prcLicense: form.prcLicense || undefined };
  const valid = CreateStaffBody.safeParse(body).success;
  const invite = useMutation({
    mutationFn: () => api('/v1/staff/users', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-users'] });
      onDone(`Invitation emailed to ${form.email}. The link works once and expires in 72 hours.`);
      setForm({ email: '', fullName: '', role: 'BILLING_SPECIALIST', title: '', prcLicense: '' });
      onClose();
    },
  });
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Invite a staff member"
      description="They choose their own password from the emailed link, then set up two-step sign-in."
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          invite.mutate();
        }}
      >
        {invite.isError && <Alert>{errorMessage(invite.error)}</Alert>}
        <Field label="Full name">
          {(f) => (
            <Input
              {...f}
              value={form.fullName}
              maxLength={120}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          )}
        </Field>
        <Field label="Work email">
          {(f) => (
            <Input
              {...f}
              type="email"
              value={form.email}
              maxLength={254}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          )}
        </Field>
        <Field label="Role" hint="Grant the least access the job needs.">
          {(f) => (
            <Select {...f} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Job title">
          {(f) => (
            <Input
              {...f}
              value={form.title}
              maxLength={80}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          )}
        </Field>
        {form.role === 'ATTENDING_PHYSICIAN' && (
          <Field label="PRC license number">
            {(f) => (
              <Input
                {...f}
                inputMode="numeric"
                value={form.prcLicense}
                maxLength={7}
                onChange={(e) => setForm({ ...form, prcLicense: e.target.value.replace(/\D/g, '') })}
              />
            )}
          </Field>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" busy={invite.isPending} disabled={!valid}>
            Send invitation
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
