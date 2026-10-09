export const fixture = {
  admin: true,
  selectedId: null as string | null,
  requests: [] as string[],
  selected: [] as string[]
};
const client = { get: async (path: string) => {
  fixture.requests.push(path);
  return { total: 2, items: [ { id: 'patient-a', fullName: 'Example Alpha', mrn: 'MRN-A' }, { id: 'patient-b', fullName: 'Example Beta', mrn: 'MRN-B' } ] };
} };
export function useAuth() {
  return {
    user: fixture.admin ? { id: 'admin', role: 'HOSPITAL_CFO', mobileDemoAdmin: true } : { id: 'patient', role: 'PATIENT_GUARANTOR' },
    selectedPatientId: fixture.selectedId,
    selectPatient: (id: string) => { fixture.selectedId = id; fixture.selected.push(id); },
    client
  };
}
export function usePatient() { return { patient: { id: 'patient-a', fullName: 'Example Alpha' } }; }
