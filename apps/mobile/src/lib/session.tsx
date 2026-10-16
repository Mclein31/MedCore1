import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, onSignedOut, tokens } from './api';
import type { CodeIdentity } from './apiClient';

type Status = 'restoring' | 'signedOut' | 'signedIn';

interface Session {
  status: Status;
  /** Set when the server ended the session, so sign-in can say why. */
  expired: boolean;
  verify: (identity: CodeIdentity, code: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('restoring');
  const [expired, setExpired] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    tokens.restore().then((token) => active && setStatus(token ? 'signedIn' : 'signedOut'));
    const unsubscribe = onSignedOut(() => {
      // Nothing from the previous session may stay on screen or in the cache.
      queryClient.clear();
      setExpired(true);
      setStatus('signedOut');
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [queryClient]);

  const verify = useCallback(async (identity: CodeIdentity, code: string) => {
    await api.verifyCode(identity, code);
    setExpired(false);
    setStatus('signedIn');
  }, []);

  const signOut = useCallback(async () => {
    await api.logout();
    queryClient.clear();
    setExpired(false);
    setStatus('signedOut');
  }, [queryClient]);

  const value = useMemo(() => ({ status, expired, verify, signOut }), [status, expired, verify, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession must be used inside SessionProvider');
  return session;
}
