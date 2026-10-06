import type { ApiClient } from '../lib/api';

export function createBillingApi(client: ApiClient) {
  return {
    // Canonical statement for an encounter (scoped to the patient's own stay).
    getStatement: (encounterUuid: string) => client.get<any>(`/patient/me/encounters/${encodeURIComponent(encounterUuid)}`),
    fileDispute: (encounterId: string, input: { chargeId: string; reason: string; disputeCategory?: string }) =>
      client.request<any>(`/encounters/${encodeURIComponent(encounterId)}/disputes`, {
        method: 'POST',
        body: JSON.stringify({ disputeCategory: 'OTHER', ...input })
      })
  };
}
