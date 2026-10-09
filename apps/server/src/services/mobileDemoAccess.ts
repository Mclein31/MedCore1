// One explicitly provisioned presentation principal. Public registration cannot
// assign the CFO role; client headers/flags never grant this capability.
export const MOBILE_DEMO_USERNAME = 'mobile.admin.demo';
export const MOBILE_DEMO_EMAIL = 'mobile.admin.demo@example.test';
export function mobileDemoCapability(user: { username: string; role: string }): boolean {
  return user.username === MOBILE_DEMO_USERNAME && user.role === 'HOSPITAL_CFO';
}
