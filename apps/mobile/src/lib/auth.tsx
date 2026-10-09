import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { ApiClient, ApiError } from './api';
import { SessionToken } from './sessionToken';
import { ENV } from '../config/env';
import { canUseMobile, isMobileDemoAdmin } from './mobileAccess';

const TOKEN_KEY = 'medcore_session_token';
export interface SessionUser {
  id: string; fullName: string; email: string; role: string; facilityName?: string; mobileDemoAdmin?: boolean;
}
interface RegisterInput { email: string; password: string; fullName: string; mrn: string; contactNumber: string }
interface AuthResponse { success?: boolean; authenticated?: boolean; token?: string; user: SessionUser }
interface AuthState {
  user: SessionUser | null; token: string | null; loading: boolean; client: ApiClient;
  sessionError: string | null; notice: string | null; retrySession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  forgotPassword: (email: string) => Promise<string>; logout: () => Promise<void>;
  selectedPatientId: string | null; selectPatient: (id: string) => void;
}
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const patientScope = useRef<string | null>(null);
  const session = useMemo(() => new SessionToken({
    read: () => Platform.OS === 'web' ? Promise.resolve(null) : SecureStore.getItemAsync(TOKEN_KEY),
    write: (value) => Platform.OS === 'web' ? Promise.resolve() : SecureStore.setItemAsync(TOKEN_KEY, value),
    remove: () => Platform.OS === 'web' ? Promise.resolve() : SecureStore.deleteItemAsync(TOKEN_KEY)
  }), []);
  const publicClient = useMemo(() => new ApiClient(async () => null), []);
  const clearSession = useCallback(async () => {
    patientScope.current = null;
    setSelectedPatientId(null);
    setUser(null);
    setToken(null);
    setSessionError(null);
    try { await session.set(null); } catch {
      setNotice('You are signed out for this launch, but the saved session could not be removed. Please try signing out again or clear the app’s stored data.');
    }
  }, [session]);
  const onExpired = useCallback((expiredToken: string) => {
    void session.get().then((current) => {
      if (current === expiredToken) {
        setNotice('Your session expired. Please log in again.');
        void clearSession();
      }
    });
  }, [session, clearSession]);
  const authClient = useMemo(() => new ApiClient(session.get, onExpired), [session, onExpired]);
  const client = useMemo(() => new ApiClient(session.get, onExpired,
    isMobileDemoAdmin(user) ? { patientId: selectedPatientId, getCurrent: () => patientScope.current } : undefined),
    [session, onExpired, user, selectedPatientId]);
  const selectPatient = useCallback((id: string) => {
    if (!isMobileDemoAdmin(user)) throw new ApiError('Hospital patient browsing is not available to this account.', 403);
    patientScope.current = id;
    setSelectedPatientId(id);
  }, [user]);

  const retrySession = useCallback(async () => {
    setLoading(true);
    setSessionError(null);
    const saved = await session.restore();
    if (!saved) { setLoading(false); return; }
    try {
      const me = await authClient.get<AuthResponse>('/auth/me');
      if (!me.authenticated || !me.user?.id) throw new ApiError('We could not verify your session. Please try again.', 502);
      if (!canUseMobile(me.user)) {
        await clearSession();
        setNotice('Use your patient account to access MedCore mobile.');
        return;
      }
      if (!isMobileDemoAdmin(me.user)) { patientScope.current = null; setSelectedPatientId(null); }
      setToken(saved);
      setUser(me.user);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) await clearSession();
      else setSessionError(error instanceof Error ? error.message : 'We could not verify your session.');
    } finally { setLoading(false); }
  }, [authClient, session, clearSession]);
  useEffect(() => { void retrySession(); }, [retrySession]);

  const acceptSession = useCallback(async (res: AuthResponse) => {
    if (!res.token || !res.user?.id) throw new ApiError('The server did not return a valid session. Please try again.', 502);
    if (!canUseMobile(res.user)) {
      // Revoke a staff login rather than retaining it in the patient app.
      await new ApiClient(async () => res.token!).request('/auth/logout', { method: 'POST' }).catch(() => {});
      throw new ApiError('Use your patient account to access MedCore mobile.', 403);
    }
    await session.set(res.token);
    patientScope.current = null;
    setSelectedPatientId(null);
    setToken(res.token);
    setUser(res.user);
    setNotice(null);
  }, [session]);
  const login = useCallback(async (email: string, password: string) => {
    const res = await publicClient.request<AuthResponse>('/auth/login', {
      method: 'POST', body: JSON.stringify({ email: email.trim().toLowerCase(), password, facilityCode: ENV.facilityCode })
    });
    await acceptSession(res);
  }, [publicClient, acceptSession]);
  const register = useCallback(async (input: RegisterInput) => {
    const res = await publicClient.request<AuthResponse>('/auth/register', {
      method: 'POST', body: JSON.stringify({ ...input, email: input.email.trim().toLowerCase(), fullName: input.fullName.trim(), mrn: input.mrn.trim(), contactNumber: input.contactNumber.trim(), facilityCode: ENV.facilityCode })
    });
    await acceptSession(res);
  }, [publicClient, acceptSession]);
  const forgotPassword = useCallback(async (email: string) => {
    await publicClient.request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: email.trim().toLowerCase() }) });
    return 'Please contact the hospital billing desk to recover your account. Email password reset is not available yet.';
  }, [publicClient]);
  const logout = useCallback(async () => {
    const previous = await session.get();
    // Remove the protected navigator and patient data immediately, even offline.
    await clearSession();
    if (previous) await new ApiClient(async () => previous).request('/auth/logout', { method: 'POST' }).catch(() => {});
  }, [session, clearSession]);
  const value = useMemo(() => ({ user, token, loading, client, sessionError, notice, retrySession, login, register, forgotPassword, logout, selectedPatientId, selectPatient }),
    [user, token, loading, client, sessionError, notice, retrySession, login, register, forgotPassword, logout, selectedPatientId, selectPatient]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
