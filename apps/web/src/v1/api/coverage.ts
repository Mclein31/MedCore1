import type { ApiClient } from './client';
import { defaultApiClient } from './client';

export class CoverageApi {
  constructor(private client: ApiClient = defaultApiClient) {}

  async doctorQuickSign(id: string, agreedFee: number): Promise<{ success: boolean; encounter: any }> {
    return this.client.request(`/encounters/${id}/doctor/sign`, {
      method: 'POST',
      body: JSON.stringify({ agreedFee }),
    });
  }

  async applyAccreditedCeiling(id: string): Promise<{ success: boolean; encounter: any }> {
    return this.client.request(`/encounters/${id}/doctor/accredited-ceiling`, {
      method: 'POST',
    });
  }

  async clearPharmacyRts(id: string): Promise<{ success: boolean; encounter: any }> {
    return this.client.request(`/encounters/${id}/pharmacy/clear-rts`, {
      method: 'POST',
    });
  }

  async approveHmoFinalLoa(
    id: string,
    payload: { approvalCode?: string; approvedAmount?: number; disallowedConsumables?: number } = {},
  ): Promise<{ success: boolean; encounter: any }> {
    return this.client.request(`/encounters/${id}/hmo/final-loa`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const coverageApi = new CoverageApi();
