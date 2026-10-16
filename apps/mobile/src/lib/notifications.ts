import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';

// Push/local notification architecture. Backend-driven push is NOT yet
// available, so this module only sets up the local handler and permission
// flow. Screens render server-derived updates (timeline events) fetched via
// the notifications API; nothing is ever faked as a push notification.

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotificationSetup(): void {
  useEffect(() => {
    // Ask for permission when a supported reminder is explicitly enabled.
    // Backend push delivery is not configured yet.
  }, []);
}

export async function scheduleLocalReminder(title: string, body: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
  } catch {
    // Notifications unavailable; the in-app list remains the source of truth.
  }
}
