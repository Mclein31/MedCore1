import { createBrowserRouter, Navigate } from 'react-router';
import { NotFound } from './pages/NotFound';

// The web app is the hospital staff console only. Patients use the MedCore mobile app.
const staff = () => import('./staff/routes');

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/staff" replace /> },
  { path: '/staff/login', lazy: async () => ({ Component: (await staff()).StaffLogin }) },
  { path: '/staff/accept-invite', lazy: async () => ({ Component: (await staff()).AcceptInvite }) },
  {
    path: '/staff/*',
    lazy: async () => ({ Component: (await import('./staff/OriginalWorkspace')).OriginalWorkspace }),
  },
  { path: '/login', element: <Navigate to="/staff/login" replace /> },
  { path: '*', element: <NotFound /> },
]);
