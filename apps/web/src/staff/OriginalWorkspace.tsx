import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { Spinner } from '../components/ui';
import { ApiRequestError, UNAUTHENTICATED_EVENT } from '../lib/api';
import { StaffContext, useStaffMeQuery } from './session';
import OriginalApp from '../v1/app/App';
export function OriginalWorkspace() {
  const me = useStaffMeQuery();
  const navigate = useNavigate();
  useEffect(() => {
    const expired = () => navigate('/staff/login?expired=1', { replace: true });
    window.addEventListener(UNAUTHENTICATED_EVENT, expired);
    return () => window.removeEventListener(UNAUTHENTICATED_EVENT, expired);
  }, [navigate]);
  if (me.isPending) return <Spinner label="Opening MedCore" />;
  if (me.isError)
    return me.error instanceof ApiRequestError && me.error.status === 401 ? (
      <Navigate to="/staff/login" replace />
    ) : (
      <p role="alert">Unable to load your staff session. Reload to retry.</p>
    );
  return (
    <StaffContext value={me.data}>
      <OriginalApp />
    </StaffContext>
  );
}
