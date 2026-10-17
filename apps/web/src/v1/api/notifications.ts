import type { StaffNotificationFeed } from '@/v1/shared/notifications';
import type { ApiClient } from './client';
import { ApiError, defaultApiClient } from './client';
export class NotificationsApi {
  constructor(private client: ApiClient = defaultApiClient) {}
  async getFeed(): Promise<StaffNotificationFeed> {
    const feed = await this.client.request<StaffNotificationFeed>('/notifications?limit=30');
    if (
      !Array.isArray(feed?.notifications) ||
      !Number.isInteger(feed.unreadCount) ||
      feed.unreadCount < 0 ||
      feed.notifications.some(
        (item) =>
          !item ||
          typeof item.id !== 'string' ||
          !item.id ||
          typeof item.encounterId !== 'string' ||
          !item.encounterId ||
          typeof item.title !== 'string' ||
          typeof item.message !== 'string' ||
          !['PAYMENT', 'STAGE', 'GATE_PASS', 'HMO', 'DISPUTE'].includes(item.type) ||
          typeof item.read !== 'boolean' ||
          !Number.isFinite(Date.parse(item.timestamp)),
      )
    ) {
      throw new ApiError(
        'The hospital returned an incomplete notification feed.',
        502,
        'INVALID_NOTIFICATION_FEED',
      );
    }
    return feed;
  }
  async markRead(notificationIds: string[]): Promise<void> {
    if (!notificationIds.length) return;
    const result = await this.client.request<{ success: boolean }>('/notifications/mark-read', {
      method: 'POST',
      body: JSON.stringify({ notificationIds }),
    });
    if (!result?.success)
      throw new ApiError(
        'The hospital did not confirm the read status.',
        502,
        'UNCONFIRMED_NOTIFICATION_READ',
      );
  }
}
export const notificationsApi = new NotificationsApi();
