import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { AppState } from 'react-native';

// Associate every result with its loader, so route changes cannot show old records.
export function useResource<T>(load: () => Promise<T>, pollIntervalMs = 0) {
  const [snapshot, setSnapshot] = useState<{ loader: typeof load; data: T } | null>(null);
  const [status, setStatus] = useState<{ loader: typeof load; loading: boolean; error: string | null }>({
    loader: load,
    loading: true,
    error: null,
  });
  const source = useRef(load);
  const generation = useRef(0);
  const pending = useRef<Promise<void> | null>(null);
  const mounted = useRef(true);
  if (source.current !== load) {
    source.current = load;
    generation.current++;
    pending.current = null;
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current++;
    };
  }, []);
  const refresh = useCallback(() => {
    if (pending.current) return pending.current;
    const version = generation.current;
    const active = () => mounted.current && source.current === load && generation.current === version;
    setStatus({ loader: load, loading: true, error: null });
    const request = (async () => {
      try {
        const data = await load();
        if (active()) setSnapshot({ loader: load, data });
      } catch (e: unknown) {
        if (active())
          setStatus({
            loader: load,
            loading: false,
            error: e instanceof Error ? e.message : 'We could not load this information.',
          });
      } finally {
        if (active()) setStatus((previous) => ({ ...previous, loading: false }));
      }
    })();
    pending.current = request;
    void request.finally(() => {
      if (pending.current === request) pending.current = null;
    });
    return request;
  }, [load]);
  useFocusEffect(
    useCallback(() => {
      void refresh();
      if (pollIntervalMs <= 0) return;
      const interval = setInterval(() => {
        if (AppState.currentState === 'active') void refresh();
      }, pollIntervalMs);
      return () => clearInterval(interval);
    }, [refresh, pollIntervalMs]),
  );
  const current = snapshot?.loader === load;
  return {
    data: current ? snapshot.data : null,
    loading: status.loader !== load || status.loading,
    error: status.loader === load ? status.error : null,
    refresh,
  };
}
