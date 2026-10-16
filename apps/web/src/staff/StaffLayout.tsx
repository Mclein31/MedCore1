import type { Permission } from '@medcore/domain';
import { ROLE_LABELS } from '@medcore/domain';
import { useQueryClient } from '@tanstack/react-query';
import {
  BedDouble,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquareWarning,
  ScrollText,
  ShieldCheck,
  UserCog,
  Users as UsersIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { Logo } from '../components/Logo';
import { Button, cx, Spinner } from '../components/ui';
import { api, ApiRequestError, UNAUTHENTICATED_EVENT } from '../lib/api';
import { useStaffMeQuery } from './session';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: Permission;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: '/staff', label: 'Overview', icon: LayoutDashboard, permission: 'encounter:read', end: true },
  { to: '/staff/encounters', label: 'Stays', icon: ClipboardList, permission: 'encounter:read' },
  { to: '/staff/patients', label: 'Patients', icon: UsersIcon, permission: 'patient:read' },
  { to: '/staff/disputes', label: 'Disputes', icon: MessageSquareWarning, permission: 'dispute:read' },
  { to: '/staff/claims', label: 'Claims', icon: FileText, permission: 'claim:read' },
  { to: '/staff/beds', label: 'Beds', icon: BedDouble, permission: 'bed:read' },
  { to: '/staff/lobby', label: 'Lobby exit check', icon: ShieldCheck, permission: 'gatepass:verify' },
  { to: '/staff/users', label: 'Staff accounts', icon: UserCog, permission: 'staff:manage' },
  { to: '/staff/audit', label: 'Audit log', icon: ScrollText, permission: 'audit:read' },
];

export function StaffLayout() {
  const me = useStaffMeQuery();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const onUnauthenticated = (e: Event) => {
      if ((e as CustomEvent).detail !== 'staff') return;
      queryClient.clear();
      navigate('/staff/login?expired=1', { replace: true });
    };
    window.addEventListener(UNAUTHENTICATED_EVENT, onUnauthenticated);
    return () => window.removeEventListener(UNAUTHENTICATED_EVENT, onUnauthenticated);
  }, [navigate, queryClient]);

  if (me.isPending) return <Spinner label="Opening MedCore" />;
  if (me.isError) {
    if (me.error instanceof ApiRequestError && me.error.status === 401)
      return <Navigate to="/staff/login" replace />;
    return <Spinner label="Reconnecting" />;
  }
  const { user, facility, permissions } = me.data;
  const items = NAV.filter((item) => !item.permission || permissions.includes(item.permission));
  // Lobby security only verifies passes: send them straight to that screen.
  if (location.pathname === '/staff' && !permissions.includes('encounter:read')) {
    return (
      <Navigate to={permissions.includes('gatepass:verify') ? '/staff/lobby' : '/staff/account'} replace />
    );
  }

  const signOut = async () => {
    setSigningOut(true);
    try {
      await api('/v1/auth/staff/logout', { method: 'POST', body: {} });
    } finally {
      queryClient.clear();
      navigate('/staff/login', { replace: true });
    }
  };

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <aside className="border-b border-line bg-surface lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-4 py-4">
          <Logo subtitle={facility.name} />
        </div>
        <nav
          aria-label="Main"
          className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible"
        >
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cx(
                  'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-brand-50 text-brand-800' : 'text-muted hover:bg-slate-50 hover:text-ink',
                )
              }
            >
              <Icon aria-hidden className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden border-t border-line p-3 lg:block">
          <NavLink to="/staff/account" className="block rounded-lg px-3 py-2 hover:bg-slate-50">
            <p className="truncate text-sm font-medium text-ink">{user.fullName}</p>
            <p className="truncate text-xs text-subtle">{ROLE_LABELS[user.role]}</p>
          </NavLink>
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 w-full justify-start"
            onClick={signOut}
            busy={signingOut}
          >
            <LogOut aria-hidden className="size-4" />
            Sign out
          </Button>
        </div>
      </aside>
      <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-6xl">
          <Outlet context={me.data} />
        </div>
        <div className="mt-10 flex items-center justify-between border-t border-line pt-4 text-xs text-subtle lg:hidden">
          <NavLink to="/staff/account">{user.fullName}</NavLink>
          <button type="button" onClick={signOut} className="font-medium text-brand-800">
            Sign out
          </button>
        </div>
      </main>
    </div>
  );
}
