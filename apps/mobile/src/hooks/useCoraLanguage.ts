import { useCallback, useSyncExternalStore } from 'react';
import type { CoraLanguage } from '../../../shared/coraLanguage';
import { useAuth } from '../lib/auth';

// Share the choice across Home, Bill and record Cora windows within this app session.
// Each verified account has its own preference; no patient records are stored here.
const choices = new Map<string, CoraLanguage>();
const listeners = new Map<string, Set<() => void>>();
export function useCoraLanguage() {
  const { user } = useAuth();
  const key = user?.id || 'signed-out';
  const subscribe = useCallback((listener: () => void) => {
    const accountListeners = listeners.get(key) || new Set<() => void>();
    listeners.set(key, accountListeners); accountListeners.add(listener);
    return () => { accountListeners.delete(listener); if (!accountListeners.size) listeners.delete(key); };
  }, [key]);
  const language = useSyncExternalStore<CoraLanguage>(subscribe, () => choices.get(key) || 'fil', () => 'fil');
  const setLanguage = useCallback((next: CoraLanguage) => {
    choices.set(key, next); listeners.get(key)?.forEach(listener => listener());
  }, [key]);
  return [language, setLanguage] as const;
}
