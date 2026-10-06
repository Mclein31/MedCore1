import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

// Live connectivity state for graceful offline handling.
export function useNetworkStatus(): { connected: boolean; checked: boolean } {
  const [state, setState] = useState<NetInfoState | null>(null);
  useEffect(() => {
    const sub = NetInfo.addEventListener(setState);
    NetInfo.fetch().then(setState).catch(() => {});
    return () => sub();
  }, []);
  if (!state) return { connected: true, checked: false };
  return { connected: (state.isConnected ?? true) && (state.isInternetReachable ?? true), checked: true };
}
