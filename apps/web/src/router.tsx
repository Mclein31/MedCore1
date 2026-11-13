import { createBrowserRouter, Navigate } from 'react-router';
import { NotFound } from './pages/NotFound';
import { WorkspaceShellSkeleton } from './v1/components/common/Skeletons';

// The web app is the hospital staff console only. Patients use the MedCore mobile app.
// Each entry point loads only its own module, so the sign-in page does not pull in every staff page.
const login = () => import('./staff/Login');
const acceptInvite = () => import('./staff/AcceptInvite');
const workspace = () => import('./staff/OriginalWorkspace');

// While someone is on the sign-in page, fetch the workspace code in the background so the
// dashboard opens without waiting on it after a successful sign-in.
function prefetchWorkspaceWhenIdle() {
  const run = () => void workspace().catch(() => {});
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 3000 });
  else window.setTimeout(run, 1200);
}

// Lazy entry pages render nothing while their small code chunk loads (as before).
const HydrateFallback = () => null;
// The workspace shows its own frame immediately on a direct load or reload.
const WorkspaceFallback = () => <WorkspaceShellSkeleton />;

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/staff" replace /> },
  {
    path: '/staff/login',
    HydrateFallback,
    lazy: async () => {
      const { StaffLogin } = await login();
      prefetchWorkspaceWhenIdle();
      return { Component: StaffLogin };
    },
  },
  {
    path: '/staff/accept-invite',
    HydrateFallback,
    lazy: async () => ({ Component: (await acceptInvite()).AcceptInvite }),
  },
  {
    path: '/staff/*',
    HydrateFallback: WorkspaceFallback,
    lazy: async () => ({ Component: (await workspace()).OriginalWorkspace }),
  },
  { path: '/login', element: <Navigate to="/staff/login" replace /> },
  { path: '*', element: <NotFound /> },
]);
