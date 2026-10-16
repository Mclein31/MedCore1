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
      const interval = setInterval(() => {
        if (AppState.currentState === 'active') void refresh();
      }, 5000);
      return () => {
        active = false;
        clearInterval(interval);
      };
    }, [client, user, selectedPatientId]),
  );
  return unread;
}
