import type { ApiClient } from '../lib/api';
import type { PatientEncounter, PatientOverview, SafePatient } from '../types/domain';

export function createPatientApi(client: ApiClient) {
  return {
    getMe: () => client.get<{ patient: SafePatient }>('/patient/me'),
    getEncounters: () => client.get<{ items: PatientEncounter[]; total: number }>('/patient/me/encounters'),
    getEncounter: (id: string) => client.get<PatientEncounter>(`/patient/me/encounters/${encodeURIComponent(id)}`),
    getOverview: () => client.get<PatientOverview>('/patient/me/overview')
  };
}
