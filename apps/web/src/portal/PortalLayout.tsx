import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Link, Navigate, Outlet, useNavigate } from 'react-router';
import { Logo } from '../components/Logo';
import { Spinner } from '../components/ui';
import { api, ApiRequestError, UNAUTHENTICATED_EVENT } from '../lib/api';

export const PATIENT_ME_KEY = ['patient', 'me'] as const;

export function PortalLayout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const me = useQuery({
    queryKey: PATIENT_ME_KEY,
    queryFn: () => api<{ email: string; facility: { name: string; code: string } }>('/v1/auth/patient/me'),
  });

  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail !== 'patient') return;
      queryClient.clear();
      navigate('/portal/sign-in', { replace: true });
    };
    window.addEventListener(UNAUTHENTICATED_EVENT, handler);
    return () => window.removeEventListener(UNAUTHENTICATED_EVENT, handler);
  }, [navigate, queryClient]);

  if (me.isPending) return <Spinner />;
  if (me.isError) {
    if (me.error instanceof ApiRequestError && me.error.status === 401)
      return <Navigate to="/portal/sign-in" replace />;
    return <Spinner label="Reconnecting" />;
  }

  const signOut = async () => {
    try {
      await api('/v1/auth/patient/logout', { method: 'POST', body: {} });
    } finally {
      queryClient.clear();
      navigate('/portal/sign-in', { replace: true });
    }
  };

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/portal">
            <Logo subtitle={me.data.facility.name} />
          </Link>
          <button type="button" onClick={signOut} className="text-sm font-medium text-brand-800">
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-3xl px-4 pb-10 text-xs text-subtle">
        Signed in as {me.data.email}. Questions about your bill? Visit the billing desk or use “Question this
        charge”.
      </footer>
    </div>
  );
}
