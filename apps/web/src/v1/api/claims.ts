import type { ApiClient } from './client';
import { defaultApiClient } from './client';

export class ClaimsApi {
  constructor(private client: ApiClient = defaultApiClient) {}

  async getPhilhealthEsoaXml(claimId: string): Promise<string> {
    return this.client.request(`/claims/${claimId}/esoa-xml`);
  }

  /** Records that the claim was released to the PhilHealth gateway (DRAFT/READY -> TRANSMITTED). */
  async markTransmitted(claimId: string): Promise<{ success: boolean }> {
    return this.client.request(`/claims/${encodeURIComponent(claimId)}/mark-transmitted`, { method: 'POST' });
  }
}

export const claimsApi = new ClaimsApi();
