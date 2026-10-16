import type { Permission } from '@medcore/domain';
import { ROLE_LABELS } from '@medcore/domain';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BedDouble,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  FileCheck2,
  House,
  Layers,
  LogOut,
  ScrollText,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  UserRound,
  Users as UsersIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import badge from '../assets/logo-badge.png';
import { cx, Spinner } from '../components/ui';
import { api, ApiRequestError, UNAUTHENTICATED_EVENT } from '../lib/api';
import type { Analytics } from '../lib/types';
import { useStaffMeQuery } from './session';

interface NavItem {
  to: string;
  label: string;
  icon: typeof House;
  permission?: Permission;
  end?: boolean;
  badge?: 'clearance' | 'disputes';
}

// Grouped as in the v1 dashboard: daily operations, statutory and finance, governance.
const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Daily Operations',
    items: [
      { to: '/staff', label: 'Overview', icon: House, permission: 'encounter:read', end: true },
      {
        to: '/staff/encounters',
        label: 'Encounters & Ledgers',
        icon: Layers,
        permission: 'encounter:read',
        badge: 'clearance',
      },
      {
        to: '/staff/disputes',
        label: 'Approvals & Disputes',
        icon: ShieldAlert,
        permission: 'dispute:read',
        badge: 'disputes',
      },
      { to: '/staff/patients', label: 'Patients', icon: UsersIcon, permission: 'patient:read' },
      { to: '/staff/beds', label: 'Census & Beds', icon: BedDouble, permission: 'bed:read' },
      { to: '/staff/lobby', label: 'Lobby Exit Check', icon: DoorOpen, permission: 'gatepass:verify' },
    ],
  },
  {
    title: 'Statutory & Finance',
    items: [{ to: '/staff/claims', label: 'Claims & eSOA XML', icon: FileCheck2, permission: 'claim:read' }],
  },
  {
    title: 'Governance & Admin',
    items: [
      { to: '/staff/users', label: 'Staff Accounts', icon: UserCog, permission: 'staff:manage' },
      { to: '/staff/audit', label: 'Audit Log', icon: ScrollText, permission: 'audit:read' },
      { to: '/staff/account', label: 'My Account', icon: ShieldCheck },
    ],
  },
];

const CLEARANCE_STAGES = [
  'MGH_DECLARED',
  'DOCTOR_PF_PENDING',
  'PHARMACY_RTS_AUDIT',
  'HMO_FINAL_LOA',
  'PENDING_SETTLEMENT',
] as const;

export function StaffLayout() {
  const me = useStaffMeQuery();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const canAnalytics = me.data?.permissions.includes('analytics:read') ?? false;
  const analytics = useQuery({
    queryKey: ['analytics'],
    queryFn: () => api<Analytics>('/v1/staff/analytics/summary'),
    enabled: canAnalytics,
    refetchInterval: 30_000,
  });

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
  // Lobby security only verifies passes: send them straight to that screen.
  if (location.pathname === '/staff' && !permissions.includes('encounter:read')) {
    return (
      <Navigate to={permissions.includes('gatepass:verify') ? '/staff/lobby' : '/staff/account'} replace />
    );
  }

  const counts = {
    clearance: analytics.data ? CLEARANCE_STAGES.reduce((n, s) => n + (analytics.data.stages[s] ?? 0), 0) : 0,
    disputes: analytics.data?.openDisputes.count ?? 0,
  };
  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) => !item.permission || permissions.includes(item.permission)),
  })).filter((g) => g.items.length > 0);

  const signOut = async () => {
    try {
      await api('/v1/auth/staff/logout', { method: 'POST', body: {} });
    } finally {
      queryClient.clear();
      navigate('/staff/login', { replace: true });
    }
  };

  return (
    <div className="flex h-dvh flex-col bg-canvas">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="workspace-toolbar sticky top-0 z-30 grid h-12 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 sm:px-4 xl:grid-cols-[minmax(0,1fr)_minmax(160px,640px)_minmax(0,1fr)]">
        <div className="flex shrink-0 items-center gap-2">
          <img src={badge} alt="" aria-hidden className="h-7 w-auto" />
          <div>
            <span className="block text-base leading-none font-extrabold tracking-tight text-ink">
              MedCore
            </span>
            <span className="mt-0.5 hidden items-center gap-1 text-[11px] text-subtle lg:flex">
              <Building2 aria-hidden className="size-2.5" />
              {facility.name}
            </span>
          </div>
        </div>
        {permissions.includes('encounter:read') ? <GlobalSearch /> : <span />}
        <AccountMenu
          name={user.fullName}
          role={ROLE_LABELS[user.role]}
          onAccount={() => navigate('/staff/account')}
          onSignOut={signOut}
        />
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          aria-label="Workspace navigation"
          className={cx(
            'hidden shrink-0 flex-col justify-between border-r border-line pt-3 transition-[width] duration-200 md:flex',
            collapsed ? 'w-16' : 'w-64',
          )}
        >
          <nav aria-label="Main" className="space-y-3 overflow-y-auto overscroll-contain p-2">
            {groups.map((group) => (
              <div key={group.title} className="space-y-1">
                {!collapsed && (
                  <p className="px-3 pt-4 pb-2 text-[11px] font-medium text-subtle">{group.title}</p>
                )}
                {group.items.map(({ to, label, icon: Icon, end, badge: badgeKind }) => {
                  const count = badgeKind ? counts[badgeKind] : 0;
                  return (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      title={collapsed ? label : undefined}
                      aria-label={collapsed ? label : undefined}
                      className={({ isActive }) =>
                        cx(
                          'sidebar-link flex items-center gap-3 text-xs font-semibold transition-colors',
                          collapsed ? 'mx-auto size-10 justify-center' : 'w-full px-3 py-2',
                          !isActive && 'text-slate-600 hover:bg-slate-100 hover:text-ink',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            aria-hidden
                            className={cx(
                              'size-[18px] shrink-0',
                              isActive ? 'text-brand-800' : 'text-subtle',
                            )}
                          />
                          {!collapsed && (
                            <span className="flex min-w-0 flex-1 items-center justify-between">
                              <span className="truncate">{label}</span>
                              {count > 0 && (
                                <span
                                  className={cx(
                                    'tabular rounded-full px-2 py-0.5 text-[10px] font-bold',
                                    isActive ? 'bg-white/80 text-brand-800' : 'bg-rose-100 text-rose-700',
                                  )}
                                >
                                  {count}
                                </span>
                              )}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="shrink-0 border-t border-line p-2">
            <div
              className={cx('flex items-center px-1 py-1', collapsed ? 'justify-center' : 'justify-between')}
            >
              {!collapsed && (
                <span className="text-[10px] font-medium text-subtle">RA 9439 · RA 9994/10754</span>
              )}
              <button
                type="button"
                onClick={() => setCollapsed((v) => !v)}
                className="rounded-lg p-1.5 text-subtle hover:bg-slate-100 hover:text-ink"
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
              </button>
            </div>
          </div>
        </aside>

        <main id="main" className="min-w-0 flex-1 overflow-y-auto">
          {/* Narrow screens: the sidebar becomes a scrollable strip. */}
          <nav
            aria-label="Main"
            className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2 md:hidden"
          >
            {groups
              .flatMap((g) => g.items)
              .map(({ to, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className="sidebar-link flex shrink-0 items-center px-3 text-xs font-semibold text-slate-600"
                >
                  {label}
                </NavLink>
              ))}
          </nav>
          <div className="mx-auto max-w-[1400px] px-4 pt-7 pb-10 sm:px-7">
            <Outlet context={me.data} />
          </div>
        </main>
      </div>
    </div>
  );
}

function GlobalSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/staff/encounters?q=${encodeURIComponent(term)}` : '/staff/encounters');
  };
  return (
    <form role="search" onSubmit={submit} className="min-w-0">
      <label className="flex h-8 items-center gap-2 rounded-lg border border-control bg-white px-2.5 text-sm focus-within:border-brand-600">
        <Search aria-hidden className="size-4 shrink-0 text-subtle" />
        <span className="sr-only">Search stays</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search patients, MRNs, bills…"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle"
          maxLength={80}
        />
      </label>
    </form>
  );
}

function AccountMenu({
  name,
  role,
  onAccount,
  onSignOut,
}: {
  name: string;
  role: string;
  onAccount: () => void;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div ref={root} className="relative justify-self-end">
      <button
        ref={trigger}
        type="button"
        aria-label="Staff account menu"
        aria-expanded={open}
        aria-controls="staff-account-menu"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-slate-100"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800">
          {initials}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-xs font-semibold text-ink">{name}</span>
          <span className="mt-0.5 block text-[10px] text-subtle">{role}</span>
        </span>
        <ChevronDown aria-hidden className="size-3.5 text-subtle" />
      </button>
      {open && (
        <div
          id="staff-account-menu"
          className="absolute top-full right-0 z-50 mt-2 w-60 rounded-xl border border-line bg-white p-2 shadow-xl"
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onAccount();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <UserRound aria-hidden className="size-4" />
            Account and security
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="mt-1 flex w-full items-center gap-2 border-t border-line-subtle px-2 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50"
          >
            <LogOut aria-hidden className="size-4" />
            Sign out and lock workstation
          </button>
        </div>
      )}
    </div>
  );
}
