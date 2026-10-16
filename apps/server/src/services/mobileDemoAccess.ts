// One explicitly provisioned presentation principal. Public registration cannot
// assign the CFO role; client headers/flags never grant this capability.
// The capability is off unless MOBILE_DEMO_ENABLED=true is set for the deployment.
export const MOBILE_DEMO_USERNAME = 'mobile.admin.demo';
export const MOBILE_DEMO_EMAIL = 'mobile.admin.demo@example.test';
export function mobileDemoEnabled(env?: { MOBILE_DEMO_ENABLED?: string } | null): boolean {
  const value = env?.MOBILE_DEMO_ENABLED ?? (typeof process !== 'undefined' ? process.env.MOBILE_DEMO_ENABLED : undefined);
  return value === 'true';
}
export function mobileDemoCapability(user: { username: string; role: string }, env?: { MOBILE_DEMO_ENABLED?: string } | null): boolean {
  return mobileDemoEnabled(env) && user.username === MOBILE_DEMO_USERNAME && user.role === 'HOSPITAL_CFO';
}
