import type { PatientDocument } from '../types/domain';
import type { ApiClient } from '../lib/api';

export function createDocumentsApi(client: ApiClient) {
  return {
    list: () => client.get<{ items: PatientDocument[]; total: number; uploadSupported: boolean }>('/patient/me/documents')
  };
}
