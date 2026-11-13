import type { NavRoute } from '@/v1/types/navigation';

/*
 * One importer per code-split workspace page. App.tsx builds its React.lazy pages from
 * these, and the sidebar calls prefetchRoute on hover/focus, so a page's code is usually
 * already loaded by the time it is clicked and the route skeleton never flashes.
 */
export const routeChunks = {
  COMMAND_CENTER: () => import('@/v1/pages/CommandCenterPage'),
  DISCHARGE_CLEARANCE: () => import('@/v1/pages/DischargeClearancePage'),
  ENCOUNTERS_LEDGER: () => import('@/v1/pages/EncountersLedgerPage'),
  COVERAGE_APPROVALS: () => import('@/v1/pages/ApprovalsDisputesPage'),
  CLAIMS_ESOA: () => import('@/v1/pages/ClaimsEsoaPage'),
  RCM_ANALYTICS: () => import('@/v1/pages/RcmAnalyticsPage'),
  CONFIGURATION: () => import('@/v1/pages/ConfigurationPage'),
} satisfies Partial<Record<NavRoute, () => Promise<unknown>>>;

/** Modals that are only code-split, not route pages. Warmed on idle so opening them never waits. */
const modalChunks = [
  () => import('@/v1/features/analytics/components/ExecutiveReportModal'),
  () => import('@/v1/components/ai/ClaimsPreflightScrubberModal'),
  () => import('@/v1/components/ai/HmoAppealGeneratorModal'),
];

const requested = new Set<() => Promise<unknown>>();
function warm(load: () => Promise<unknown>) {
  if (requested.has(load)) return;
  requested.add(load);
  // A failed prefetch is retried by React.lazy on the real navigation.
  load().catch(() => requested.delete(load));
}

export function prefetchRoute(route: NavRoute) {
  const load =
    route === 'DISPUTES_EXCEPTIONS'
      ? routeChunks.COVERAGE_APPROVALS
      : routeChunks[route as keyof typeof routeChunks];
  if (load) warm(load);
}

/** Loads every workspace page and modal chunk once the browser is idle. Returns a cancel function. */
export function prefetchWorkspaceOnIdle(): () => void {
  const loads = [...Object.values(routeChunks), ...modalChunks];
  const idle = (callback: () => void) =>
    typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback(callback, { timeout: 4000 })
      : window.setTimeout(callback, 1500);
  const cancel = (id: number) =>
    typeof window.cancelIdleCallback === 'function' ? window.cancelIdleCallback(id) : window.clearTimeout(id);
  let id = 0;
  // One chunk per idle period, so prefetching never competes with the census render.
  const next = () => {
    const load = loads.shift();
    if (!load) return;
    warm(load);
    id = idle(next);
  };
  id = idle(next);
  return () => cancel(id);
}
