import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingStore, type OnboardingProgress } from '../lib/onboarding';

export function useOnboarding(verifiedSession = false) {
  const store = useMemo(() => new OnboardingStore(AsyncStorage), []);
  const [progress, setProgress] = useState<OnboardingProgress>({ completed: false, step: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const alive = useRef(true);
  const restore = useCallback(async () => {
    setLoading(true); setLoadError(null);
    try { const next = await store.restore(); if (alive.current) setProgress(next); }
    catch { if (alive.current) setLoadError('We could not load your introduction preferences. Try again.'); }
    finally { if (alive.current) setLoading(false); }
  }, [store]);
  useEffect(() => {
    alive.current = true;
    void restore();
    return () => { alive.current = false; };
  }, [restore]);
  const save = useCallback(async (next: OnboardingProgress) => {
    if (lock.current) return;
    lock.current = true; setSaving(true); setSaveError(null);
    try { await store.save(next); if (alive.current) setProgress(next); }
    catch { if (alive.current) setSaveError('We could not save your progress. Please try that action again.'); }
    finally { lock.current = false; if (alive.current) setSaving(false); }
  }, [store]);
  useEffect(() => {
    // Existing verified patients do not need to see the introduction after logout.
    // Main remains available while this non-sensitive preference is persisted.
    if (verifiedSession && !loading && !progress.completed && !saving && !saveError) {
      void save({ completed: true, step: progress.step });
    }
  }, [verifiedSession, loading, progress.completed, progress.step, saving, saveError, save]);
  return { progress, loading, loadError, saveError, saving, restore, save };
}
