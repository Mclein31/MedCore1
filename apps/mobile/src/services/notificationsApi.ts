import type { PatientNotification } from '../types/domain';
import type { ApiClient } from '../lib/api';

export function createNotificationsApi(client: ApiClient) {
  return {
    list: () => client.get<{ items: PatientNotification[]; total: number; pushSupported: boolean }>('/patient/me/notifications')
  };
}
