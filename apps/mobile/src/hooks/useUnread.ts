import { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { paymentAccountNamespace } from '../lib/mobileAccess';
import { useAuth } from '../lib/auth';
import { AppState } from 'react-native';
import { createNotificationsApi } from '../services/notificationsApi';
import { notificationReadKey, parseReadIds } from '../lib/notificationRead';

export function useUnreadCount(): number {
  const { client, user, selectedPatientId } = useAuth();
  const [unread, setUnread] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!user) {
        setUnread(0);
        return;
      }
      const refresh = async () => {
        try {
          const [res, saved] = await Promise.all([
            createNotificationsApi(client).list(),
            AsyncStorage.getItem(
              notificationReadKey(paymentAccountNamespace(user, selectedPatientId || undefined)),
            ).catch(() => null),
          ]);
          const read = new Set(parseReadIds(saved));
          if (active) setUnread(res.items.filter((item) => !read.has(item.id)).length);
        } catch {
          /* A failed counter must not block navigation. */
        }
      };
      void refresh();
      // The badge is a hint; the Home snapshot and the Notifications screen carry the live data.
      const interval = setInterval(() => {
        if (AppState.currentState === 'active') void refresh();
      }, 30000);
      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') void refresh();
      });
      return () => {
        active = false;
        clearInterval(interval);
        sub.remove();
      };
    }, [client, user, selectedPatientId]),
  );
  return unread;
}
