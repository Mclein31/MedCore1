import { useContext, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { PatientContext } from './PatientProvider';

// Every screen reads the same account-scoped snapshot. Refreshes are shared.
export function usePatient() {
  const state = useContext(PatientContext);
  if (!state) throw new Error('usePatient must be used inside PatientProvider');
  useFocusEffect(
    useCallback(() => {
      // Refresh on focus unless the shared snapshot is only seconds old (reads are deduplicated anyway).
      if (!state.lastSynced || Date.now() - state.lastSynced.getTime() > 5000) void state.refresh();
    }, [state.lastSynced, state.refresh]),
  );
  return state;
}
