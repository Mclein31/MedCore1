interface MobilePrincipal {
  role: string;
  mobileDemoAdmin?: boolean;
}
export function isMobileDemoAdmin(user: MobilePrincipal | null | undefined): boolean {
  return user?.role === 'HOSPITAL_CFO' && user.mobileDemoAdmin === true;
}
export function canUseMobile(user: MobilePrincipal): boolean {
  return user.role === 'PATIENT_GUARANTOR' || isMobileDemoAdmin(user);
}
export function paymentAccountNamespace(user: MobilePrincipal & { id: string }, patientId?: string): string {
  return isMobileDemoAdmin(user) ? `${user.id}.${patientId || 'unresolved'}` : user.id;
}
