import type { Permission } from '@medcore/domain';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router';
import { api } from '../lib/api';
import type { StaffMe } from '../lib/types';

export const STAFF_ME_KEY = ['staff', 'me'] as const;

export function useStaffMeQuery() {
  return useQuery({
    queryKey: STAFF_ME_KEY,
    queryFn: () => api<StaffMe>('/v1/auth/staff/me'),
    staleTime: 60_000,
  });
}

/** The signed-in staff member, provided by StaffLayout to every page under /staff. */
export function useStaff() {
  const me = useOutletContext<StaffMe>();
  const can = (permission: Permission) => me.permissions.includes(permission);
  return { ...me, can };
}
