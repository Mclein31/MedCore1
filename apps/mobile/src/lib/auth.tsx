import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { ApiClient, ApiError } from './api';
import { SessionToken } from './sessionToken';
import { clearSavedPass } from './gatePassCache';
import { ENV } from '../config/env';
import { canUseMobile, isMobileDemoAdmin } from './mobileAccess';

const TOKEN_KEY = 'medcore_session_token';
export interface SessionUser {
  id: string; fullName: string; email: string; role: string; facilityName?: string; mobileDemoAdmin?: boolean;
}
/** Who the code is for: a linked account's email, or the MRN + phone on the admission slip. */
export type CodeTarget = { purpose: 'LOGIN'; email: string } | { purpose: 'REGISTER'; mrn: string; contactNumber: string };
export interface CodeRequestResult { sent: boolean; sentTo?: string; devNote?: string; message?: string }
interface AuthResponse { success?: boolean; authenticated?: boolean; token?: string; user: SessionUser }
interface AuthState {
  user: SessionUser | null; token: string | null; loading: boolean; client: ApiClient;
  sessionError: string | null; notice: string | null; retrySession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  requestCode: (target: CodeTarget) => Promise<CodeRequestResult>;
  verifyCode: (target: CodeTarget, otp: string) => Promise<void>;
  logout: () => Promise<void>;
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
  const cacheUser = useRef<string | null>(null);
  const session = useMemo(() => new SessionToken({
    read: () => Platform.OS === 'web' ? Promise.resolve(null) : SecureStore.getItemAsync(TOKEN_KEY),
    write: (value) => Platform.OS === 'web' ? Promise.resolve() : SecureStore.setItemAsync(TOKEN_KEY, value),
    remove: () => Platform.OS === 'web' ? Promise.resolve() : SecureStore.deleteItemAsync(TOKEN_KEY)
  }), []);
  const publicClient = useMemo(() => new ApiClient(async () => null), []);
  const clearSession = useCallback(async () => {
    const previousCacheUser=cacheUser.current;cacheUser.current=null;
    if(previousCacheUser)void clearSavedPass(previousCacheUser).catch(()=>{});
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
    if (!id?.trim()) throw new ApiError('Choose a hospital patient first.',400);
    if (!isMobileDemoAdmin(user)) throw new ApiError('Hospital patient browsing is not available to this account.', 403);
    patientScope.current = id;
    setSelectedPatientId(id);
  }, [user]);

  const defaultPatient = useCallback(async (principal: SessionUser, directoryClient: ApiClient): Promise<string | null> => {
    if (!isMobileDemoAdmin(principal)) return null;
    try {
      const directory=await directoryClient.get<{items:Array<{id:string;mrn:string}>}>('/patient/demo/patients');
      if(!Array.isArray(directory.items)) throw new Error('The hospital directory is unavailable.');
      return directory.items.find(patient=>patient.mrn==='MRN-2026-8812')?.id || directory.items[0]?.id || null;
    } catch (error: unknown) {
      if (error instanceof ApiError && (error.status === 401 || error.code === 'SESSION_CHANGED')) throw error;
      setNotice('Choose a patient in Profile when the hospital directory is available.');
      return null;
    }
  },[]);

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
      const selected=await defaultPatient(me.user,authClient);
      if (saved !== await session.get()) return;
      patientScope.current=selected; setSelectedPatientId(selected);
      cacheUser.current=me.user.id;
      setToken(saved);
      setUser(me.user);
    } catch (error: unknown) {
      if (saved !== await session.get()) return;
      if (error instanceof ApiError && error.status === 401) await clearSession();
      else setSessionError(error instanceof Error ? error.message : 'We could not verify your session.');
    } finally { setLoading(false); }
  }, [authClient, session, clearSession, defaultPatient]);
  useEffect(() => { void retrySession(); }, [retrySession]);

  const acceptSession = useCallback(async (res: AuthResponse) => {
    if (!res.token || !res.user?.id) throw new ApiError('The server did not return a valid session. Please try again.', 502);
    if (!canUseMobile(res.user)) {
      // Revoke a staff login rather than retaining it in the patient app.
      await new ApiClient(async () => res.token!).request('/auth/logout', { method: 'POST' }).catch(() => {});
      throw new ApiError('Use your patient account to access MedCore mobile.', 403);
    }
    await session.set(res.token);
    setNotice(null);
    try {
      const selected = await defaultPatient(res.user, authClient);
      if (res.token !== await session.get()) throw new ApiError('Your session changed. Please log in again.', 0, 'SESSION_CHANGED');
      patientScope.current = selected;
      setSelectedPatientId(selected);
      cacheUser.current=res.user.id;
      setToken(res.token);
      setUser(res.user);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401 && res.token === await session.get()) await clearSession();
      throw error;
    }
  }, [session, defaultPatient, authClient, clearSession]);
  const login = useCallback(async (email: string, password: string) => {
    const res = await publicClient.request<AuthResponse>('/auth/login', {
      method: 'POST', body: JSON.stringify({ email: email.trim().toLowerCase(), password, facilityCode: ENV.facilityCode })
    });
    await acceptSession(res);
  }, [publicClient, acceptSession]);
  const codeBody = (target: CodeTarget) => target.purpose === 'LOGIN'
    ? { purpose: 'LOGIN', email: target.email.trim().toLowerCase(), facilityCode: ENV.facilityCode }
    : { purpose: 'REGISTER', mrn: target.mrn.trim(), contactNumber: target.contactNumber.trim(), facilityCode: ENV.facilityCode };
  // Email sign-in code (audit 2026-10-16 §4). The server answers the same way whether or not
  // an account matched, so "sent" never confirms that an account exists.
  const requestCode = useCallback(async (target: CodeTarget) => {
    return publicClient.request<CodeRequestResult>('/auth/otp/request', { method: 'POST', body: JSON.stringify(codeBody(target)) });
  }, [publicClient]);
  const verifyCode = useCallback(async (target: CodeTarget, otp: string) => {
    const res = await publicClient.request<AuthResponse>('/auth/otp/verify', {
      method: 'POST', body: JSON.stringify({ ...codeBody(target), otp: otp.trim() })
    });
    await acceptSession(res);
  }, [publicClient, acceptSession]);
  const logout = useCallback(async () => {
    const previous = await session.get();
    // Remove the protected navigator and patient data immediately, even offline.
    await clearSession();
    if (previous) await new ApiClient(async () => previous).request('/auth/logout', { method: 'POST' }).catch(() => {});
  }, [session, clearSession]);
  const value = useMemo(() => ({ user, token, loading, client, sessionError, notice, retrySession, login, requestCode, verifyCode, logout, selectedPatientId, selectPatient }),
    [user, token, loading, client, sessionError, notice, retrySession, login, requestCode, verifyCode, logout, selectedPatientId, selectPatient]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
