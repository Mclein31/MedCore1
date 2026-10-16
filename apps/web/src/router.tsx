import { createBrowserRouter, Navigate } from 'react-router';
import { Landing } from './pages/Landing';
import { NotFound } from './pages/NotFound';

// Each area is its own chunk: patients never download the staff console, and vice versa.
const staff = () => import('./staff/routes');
const portal = () => import('./portal/routes');

export const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
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
  { path: '/portal/sign-in', lazy: async () => ({ Component: (await portal()).PortalSignIn }) },
  {
    path: '/portal',
    lazy: async () => ({ Component: (await portal()).PortalLayout }),
    children: [
      { index: true, lazy: async () => ({ Component: (await portal()).PortalStays }) },
      { path: 'stays/:id', lazy: async () => ({ Component: (await portal()).PortalStay }) },
    ],
  },
  { path: '/login', element: <Navigate to="/staff/login" replace /> },
  { path: '*', element: <NotFound /> },
]);
