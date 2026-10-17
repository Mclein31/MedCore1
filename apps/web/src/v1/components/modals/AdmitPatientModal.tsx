import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../../lib/api';
import type { Bed, PatientRow } from '../../../lib/types';
import { useMedCore } from '../../context/MedCoreContext';
import { Button, IconButton } from '../common';
import { UserPlus, X } from '../common/SolarIcons';
import { ViewportOverlay } from '../common/ViewportOverlay';
export function AdmitPatientModal() {
  const { isAdmitPatientModalOpen: open, closeAdmitPatientModal: close, admitPatient } = useMedCore();
  const [patients, setPatients] = useState<PatientRow[]>([]),
    [beds, setBeds] = useState<Bed[]>([]);
  const [physicians, setPhysicians] = useState<{ id: string; fullName: string }[]>([]);
  const [patientId, setPatientId] = useState(''),
    [bedId, setBedId] = useState(''),
    [physicianId, setPhysicianId] = useState('');
  const [diagnosis, setDiagnosis] = useState(''),
    [icd10, setIcd10] = useState('');
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setError('');
    void (async () => {
      const items: PatientRow[] = [];
      for (let page = 1; ; page++) {
        const p = await api<{ items: PatientRow[] }>(`/v1/staff/patients?page=${page}&pageSize=100`);
        items.push(...p.items);
        if (p.items.length < 100) break;
      }
      const [b, p] = await Promise.all([
        api<{ items: Bed[] }>('/v1/staff/beds'),
        api<{ items: { id: string; fullName: string }[] }>('/v1/staff/directory/physicians'),
      ]);
      if (alive) {
        setPatients(items);
        setBeds(b.items.filter((x) => x.status === 'AVAILABLE'));
        setPhysicians(p.items);
      }
    })().catch((e) => {
      if (alive) setError(e.message);
    });
    return () => {
      alive = false;
    };
  }, [open]);
  if (!open) return null;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await admitPatient({
        patientId,
        bedId,
        attendingPhysicianId: physicianId,
        primaryDiagnosis: diagnosis,
        icd10Code: icd10.toUpperCase(),
      });
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Admission was not confirmed.');
    } finally {
      setBusy(false);
    }
  };
  const control = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm';
  return (
    <ViewportOverlay
      dialogLabel="Inpatient admission registration"
      onDismiss={() => {
        if (!busy) close();
      }}
      className="flex items-center justify-center p-4"
      backdropClassName="bg-slate-900/60 backdrop-blur-xs"
      motion="rise"
      layer="modal"
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-5 h-5 text-blue-700" />
            <div>
              <h3 className="font-bold text-base text-slate-900">Inpatient Admission Registration</h3>
              <p className="text-xs text-slate-500">
                Select a registered patient and an available hospital bed.
              </p>
            </div>
          </div>
          <IconButton ariaLabel="Close admission" icon={X} onClick={close} />
        </div>
        <form onSubmit={(e) => void submit(e)} className="overflow-auto p-6 space-y-4">
          <p className="text-xs text-slate-500">
            Register new patients through Patients in Governance &amp; Admin before admission.
          </p>
          {error && (
            <p role="alert" className="text-sm text-rose-700">
              {error}
            </p>
          )}
          <label className="block text-xs font-semibold">
            Patient
            <select
              className={control}
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              required
            >
              <option value="">Select registered patient</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} · {p.mrn}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-xs font-semibold">
              Bed
              <select className={control} value={bedId} onChange={(e) => setBedId(e.target.value)} required>
                <option value="">Select available bed</option>
                {beds.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} · {b.ward}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold">
              Attending physician
              <select
                className={control}
                value={physicianId}
                onChange={(e) => setPhysicianId(e.target.value)}
                required
              >
                <option value="">Select physician</option>
                {physicians.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-xs font-semibold">
            Primary diagnosis
            <input
              className={control}
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              minLength={3}
              maxLength={300}
              required
            />
          </label>
          <label className="block text-xs font-semibold">
            ICD-10 code
            <input
              className={control}
              value={icd10}
              onChange={(e) => setIcd10(e.target.value)}
              placeholder="J18.9"
              required
            />
          </label>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={busy} isLoading={busy}>
              Confirm Inpatient Admission
            </Button>
          </div>
        </form>
      </div>
    </ViewportOverlay>
  );
}
