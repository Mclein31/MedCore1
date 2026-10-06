import type { ApiClient } from '../lib/api';

export function createInsuranceApi(client: ApiClient) {
  return {
    getClaims: () => client.get<{ items: any[]; total: number }>('/patient/me/claims')
  };
}
