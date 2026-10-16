import { createBrowserRouter, Navigate } from 'react-router';
import { NotFound } from './pages/NotFound';

// The web app is the hospital staff console only. Patients use the MedCore mobile app.
const staff = () => import('./staff/routes');

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/staff" replace /> },
  { path: '/staff/login', lazy: async () => ({ Component: (await staff()).StaffLogin }) },
  { path: '/staff/accept-invite', lazy: async () => ({ Component: (await staff()).AcceptInvite }) },
  {
    path: '/staff',
    lazy: async () => ({ Component: (await staff()).StaffLayout }),
    children: [
      { index: true, lazy: async () => ({ Component: (await staff()).Dashboard }) },
      { path: 'encounters', lazy: async () => ({ Component: (await staff()).Encounters }) },
      { path: 'encounters/:id', lazy: async () => ({ Component: (await staff()).EncounterPage }) },
      { path: 'patients', lazy: async () => ({ Component: (await staff()).Patients }) },
      { path: 'disputes', lazy: async () => ({ Component: (await staff()).Disputes }) },
      { path: 'claims', lazy: async () => ({ Component: (await staff()).Claims }) },
      { path: 'beds', lazy: async () => ({ Component: (await staff()).Beds }) },
      { path: 'lobby', lazy: async () => ({ Component: (await staff()).Lobby }) },
      { path: 'users', lazy: async () => ({ Component: (await staff()).Users }) },
      { path: 'audit', lazy: async () => ({ Component: (await staff()).AuditLog }) },
      { path: 'account', lazy: async () => ({ Component: (await staff()).Account }) },
    ],
  },
  { path: '/login', element: <Navigate to="/staff/login" replace /> },
  { path: '*', element: <NotFound /> },
]);
