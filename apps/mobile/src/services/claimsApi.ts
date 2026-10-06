import type { ClaimSummary } from '../types/domain';
import type { ApiClient } from '../lib/api';

export function createClaimsApi(client: ApiClient) {
  return {
    list: () => client.get<{ items: ClaimSummary[]; total: number }>('/patient/me/claims')
  };
}
