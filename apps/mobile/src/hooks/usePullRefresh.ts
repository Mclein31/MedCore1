import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';

// Native pull-to-refresh is gesture state, not general/background data loading.
// End it on blur so a detached tab cannot retain a refreshing scroll inset.
export function usePullRefresh(refresh: () => Promise<void>) {
  const focused = useIsFocused();
  const [pulling, setPulling] = useState(false);
  const mounted = useRef(true);
  const generation = useRef(0);
  const pending = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; generation.current++; };
  }, []);
  useEffect(() => {
    generation.current++;
    pending.current = false;
    setPulling(false);
  }, [focused, refresh]);
  const onRefresh = useCallback(() => {
    if (!focused || pending.current) return;
    const request = ++generation.current;
    pending.current = true;
    setPulling(true);
    void (async () => {
      try { await refresh(); }
      catch { /* Resource/provider owns the visible failure and retry notice. */ }
      finally {
        if (mounted.current && request === generation.current) {
          pending.current = false;
          setPulling(false);
        }
      }
    })();
  }, [focused, refresh]);
  return { refreshing: focused && pulling, onRefresh };
}
