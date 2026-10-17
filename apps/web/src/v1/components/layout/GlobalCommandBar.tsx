import { Building2, ChevronDown, LogOut } from '@/v1/components/common/SolarIcons';
import { useMedCore } from '@/v1/context/MedCoreContext';
import React, { useEffect, useRef, useState } from 'react';
import { NotificationCenter } from '../notifications/NotificationCenter';
import { UniversalSearch } from './UniversalSearch';
export const GlobalCommandBar: React.FC = () => {
  const { currentUser, logout, requestConfirmation } = useMedCore();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
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
  return (
    <header className="workspace-toolbar no-print h-12 border-b border-slate-200 bg-white px-3 sm:px-4 grid grid-cols-[auto_minmax(0,1fr)_auto] xl:grid-cols-[minmax(0,1fr)_minmax(160px,640px)_minmax(0,1fr)] items-center gap-3 z-30 sticky top-0 shadow-2xs">
      <div className="flex items-center gap-2 shrink-0">
        <img src="/logo/MedCore_Badge_Logo.png" alt="MedCore" className="h-7 w-auto" />
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 leading-none">
              MedCore
            </span>
            <span className="hidden sm:block text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 rounded">
              v2.4
            </span>
          </div>
          <div className="hidden lg:flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
            <Building2 className="h-2.5 w-2.5" aria-hidden="true" />
            {currentUser?.facilityName || 'St. Jude Medical Center Manila'}
          </div>
        </div>
      </div>
      <UniversalSearch />
      <div className="flex items-center justify-self-end gap-2">
        <NotificationCenter />
        <div ref={root} className="relative">
          <button
            ref={trigger}
            type="button"
            aria-label="Staff account menu"
            aria-expanded={open}
            aria-controls="staff-account-menu"
            onClick={() => setOpen((value) => !value)}
            className="flex items-center gap-2 rounded-lg border border-transparent px-2 py-1 text-sm hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-teal-soft text-xs font-semibold text-brand-teal-dark">
              {(currentUser?.fullName || 'Staff')
                .split(' ')
                .map((name: string) => name[0])
                .join('')
                .slice(0, 2)}
            </span>
            <span className="hidden sm:block text-left">
              <span className="block text-xs font-semibold text-slate-900">
                {currentUser?.fullName || 'Staff account'}
              </span>
              <span className="mt-0.5 block text-[10px] text-slate-500">
                {currentUser?.title || currentUser?.role?.replace(/_/g, ' ')}
              </span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          </button>
          {open && (
            <div
              id="staff-account-menu"
              className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
            >
              <p className="px-2 py-2 text-xs font-semibold text-slate-900">{currentUser?.email}</p>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  requestConfirmation({
                    title: 'Sign Out & Lock Workstation',
                    description: 'End this staff session and lock the workstation?',
                    confirmLabel: 'Sign Out',
                    variant: 'warning',
                    onConfirm: logout,
                  });
                }}
                className="mt-1 flex w-full items-center gap-2 border-t border-slate-100 px-2 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <LogOut className="h-4 w-4" />
                Sign Out &amp; Lock Workstation
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
