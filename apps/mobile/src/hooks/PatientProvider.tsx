import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
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
  const { client, user } = useAuth();
  const api = useMemo(() => createPatientApi(client), [client]);
  const [snapshot, setSnapshot] = useState<{ patient: SafePatient; overview: PatientOverview; encounters: PatientEncounter[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const pending = useRef<Promise<void> | null>(null);
  const mounted = useRef(true);
  const refresh = useCallback(() => {
    if (!user) return Promise.resolve();
    if (pending.current) return pending.current;
    setLoading(true);
    setError(null);
    const request = (async () => {
      try {
        const [me, overview, encounters] = await Promise.all([api.getMe(), api.getOverview(), api.getEncounters()]);
        if (!me.patient?.id || !Array.isArray(encounters.items)) throw new Error('The server returned incomplete patient information. Please try again.');
        if (mounted.current) {
          setSnapshot({ patient: me.patient, overview, encounters: encounters.items });
          setLastSynced(new Date());
        }
      } catch (e: unknown) {
        if (mounted.current) setError(e instanceof Error ? e.message : 'We could not load your information.');
      } finally { if (mounted.current) setLoading(false); }
    })();
    pending.current = request;
    void request.finally(() => { pending.current = null; });
    return request;
  }, [api, user]);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') void refresh(); });
    return () => { mounted.current = false; sub.remove(); };
  }, [refresh]);
  const value = useMemo(() => ({ patient: snapshot?.patient ?? null, encounters: snapshot?.encounters ?? [], overview: snapshot?.overview ?? null,
    currentEncounter: snapshot?.overview.currentEncounter ?? null, loading, error, lastSynced, refresh }), [snapshot, loading, error, lastSynced, refresh]);
  return <PatientContext.Provider value={value}>{children}</PatientContext.Provider>;
}
