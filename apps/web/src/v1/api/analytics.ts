import type { ApiClient } from './client';
import { defaultApiClient } from './client';

export class AnalyticsApi {
  constructor(private client: ApiClient = defaultApiClient) {}

  async getRcmMetrics(): Promise<{ summary: any; waterfall: any }> {
    return this.client.request('/analytics/rcm-metrics');
  }

  async getBeds(): Promise<{ summary: any; items: any[] }> {
    return this.client.request('/beds');
  }

  async updateBedStatus(
    bedId: string,
    status: 'AVAILABLE' | 'OCCUPIED' | 'HOUSEKEEPING' | 'MAINTENANCE' | 'ADMINISTRATIVE_HOLD',
  ): Promise<{ success: boolean; bed: any }> {
    return this.client.request(`/beds/${bedId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }
}

export const analyticsApi = new AnalyticsApi();
