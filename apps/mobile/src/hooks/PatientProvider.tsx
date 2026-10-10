import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { saveGatePass } from '../lib/gatePassCache';
import { paymentAccountNamespace } from '../lib/mobileAccess';
import { useAuth } from '../lib/auth';
import { createPatientApi } from '../services/patientApi';
import type { PatientEncounter, PatientOverview, SafePatient } from '../types/domain';

interface PatientState {
  patient: SafePatient | null; encounters: PatientEncounter[]; overview: PatientOverview | null;
  currentEncounter: PatientEncounter | null; loading: boolean; error: string | null;
  lastSynced: Date | null; refresh: () => Promise<void>;
}
export const PatientContext = createContext<PatientState | null>(null);
export function PatientProvider({ children }: { children: React.ReactNode }) {
  const { client, user, selectedPatientId } = useAuth();
  const api = useMemo(() => createPatientApi(client), [client]);
  const scope = useMemo(() => ({ api, userId: user?.id }), [api, user?.id]);
  const [snapshot, setSnapshot] = useState<{ scope: typeof scope; patient: SafePatient; overview: PatientOverview; encounters: PatientEncounter[]; lastSynced: Date } | null>(null);
  const [status, setStatus] = useState<{ scope: typeof scope; loading: boolean; error: string | null }>({ scope, loading: true, error: null });
  const source = useRef(scope);
  const generation = useRef(0);
  const pending = useRef<Promise<void> | null>(null);
  const mounted = useRef(true);
  const hasSnapshot = useRef(false);
  if (source.current !== scope) { source.current = scope; generation.current++; pending.current = null; hasSnapshot.current = false; }
  const refresh = useCallback(() => {
    if (!scope.userId) return Promise.resolve();
    if (pending.current) return pending.current;
    const version = generation.current;
    const active = () => mounted.current && source.current === scope && generation.current === version;
    if (!hasSnapshot.current) setStatus({ scope, loading: true, error: null });
    const request = (async () => {
      try {
        const [me, overview, encounters] = await Promise.all([api.getMe(), api.getOverview(), api.getEncounters()]);
        if (!me.patient?.id || !Array.isArray(encounters.items)) throw new Error('The server returned incomplete patient information. Please try again.');
        if (active()) {
          setSnapshot({ scope, patient: me.patient, overview, encounters: encounters.items, lastSynced: new Date() });
          void saveGatePass(user!.id,paymentAccountNamespace(user!,selectedPatientId||undefined),overview.currentEncounter).catch(()=>{});
          hasSnapshot.current = true;
          setStatus({scope,loading:false,error:null});
        }
      } catch (e: unknown) {
        if (active()) setStatus({ scope, loading: false, error: e instanceof Error ? e.message : 'We could not load your information.' });
      } finally { if (active()) setStatus(previous => ({ ...previous, loading: false })); }
    })();
    pending.current = request;
    void request.finally(() => { if (pending.current === request) pending.current = null; });
    return request;
  }, [api, scope, user, selectedPatientId]);
  useEffect(() => {
    mounted.current = true;
    if (!scope.userId) return () => { mounted.current = false; generation.current++; pending.current = null; };
    void refresh();
    const interval = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 5000);
    const sub = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => { mounted.current = false; generation.current++; pending.current = null; clearInterval(interval); sub.remove(); };
  }, [refresh, scope]);
  const current = snapshot?.scope === scope ? snapshot : null;
  const value = useMemo(() => ({ patient: current?.patient ?? null, encounters: current?.encounters ?? [], overview: current?.overview ?? null,
    currentEncounter: current?.overview.currentEncounter ?? null, loading: !!scope.userId && (status.scope !== scope || status.loading),
    error: status.scope === scope ? status.error : null, lastSynced: current?.lastSynced ?? null, refresh }), [current, status, scope, refresh]);
  return <PatientContext.Provider value={value}>{children}</PatientContext.Provider>;
}
