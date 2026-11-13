import { useAuth } from '../lib/auth';

// The hospital name comes from the signed-in session (`/auth/patient/me` → facility.name).
// /api/health reports only liveness, so there is nothing to fetch for it.
export function useFacilityName() {
  const { user } = useAuth();
  return user?.facilityName || 'Your hospital';
}
