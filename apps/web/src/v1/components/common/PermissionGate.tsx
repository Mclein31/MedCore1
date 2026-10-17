import type { Permission } from '@medcore/domain';
import type { ReactNode } from 'react';
import { useStaff } from '../../../staff/session';
export function PermissionGate({ permission, children }: { permission: Permission; children: ReactNode }) {
  return useStaff().can(permission) ? children : null;
}
