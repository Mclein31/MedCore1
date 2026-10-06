import { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../lib/auth';
import { createNotificationsApi } from '../services/notificationsApi';
import { notificationReadKey, parseReadIds } from '../lib/notificationRead';

export function useUnreadCount(): number {
  const { client, user } = useAuth();
  const [unread, setUnread] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    if (!user) { setUnread(0); return; }
    void (async () => {
      try {
        const [res, saved] = await Promise.all([createNotificationsApi(client).list(), AsyncStorage.getItem(notificationReadKey(user.id)).catch(() => null)]);
        const read = new Set(parseReadIds(saved));
        if (active) setUnread(res.items.filter((item) => !read.has(item.id)).length);
      } catch { /* A failed counter must not block navigation. */ }
    })();
    return () => { active = false; };
  }, [client, user]));
  return unread;
}
