import type { ApiClient } from './client';
import { defaultApiClient } from './client';

export interface FileDisputePayload {
  chargeId: string;
  reason: string;
  disputeCategory?: string;
}

export class DisputesApi {
  constructor(private client: ApiClient = defaultApiClient) {}

  async fileDispute(
    encounterId: string,
    payload: FileDisputePayload,
  ): Promise<{ success: boolean; dispute: any; encounter: any }> {
    return this.client.request(`/encounters/${encounterId}/disputes`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async waiveDispute(
    disputeId: string,
    supervisorNotes: string,
  ): Promise<{ success: boolean; encounter: any }> {
    return this.client.request(`/disputes/${disputeId}/supervisory-waive`, {
      method: 'POST',
      body: JSON.stringify({ supervisorNotes }),
    });
  }
}

export const disputesApi = new DisputesApi();
