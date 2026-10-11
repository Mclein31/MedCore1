import { ViewportOverlay } from '@/components/common/ViewportOverlay';
import React, { useState, useEffect } from 'react';
import { apiClient } from '@/api';
import { useMedCore } from '@/context/MedCoreContext';
import { X, UserPlus, Building2, Stethoscope, Shield, CreditCard, BedDouble } from 'lucide-react';
import { Button, IconButton } from '@/components/common';

export const AdmitPatientModal: React.FC = () => {
  const {
    isAdmitPatientModalOpen,
    closeAdmitPatientModal,
    admitPatient
  } = useMedCore();

  const [fullName, setFullName] = useState('');
  const [mrn, setMrn] = useState(`MRN-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [age, setAge] = useState<number>(45);
  const [isSeniorCitizen, setIsSeniorCitizen] = useState(false);
  const [isPwd, setIsPwd] = useState(false);
  const [philhealthPin, setPhilhealthPin] = useState('12-009182391-4');
  const [roomBed, setRoomBed] = useState('');
  const [roomCategory, setRoomCategory] = useState<'REGULAR_PRIVATE' | 'SEMI_PRIVATE' | 'WARD' | 'SUITE' | 'ICU' | 'NICU'>('REGULAR_PRIVATE');
  const [dailyRoomRate, setDailyRoomRate] = useState<number>(3200);
  const [attendingDoctor, setAttendingDoctor] = useState('');
  const [primaryDiagnosis, setPrimaryDiagnosis] = useState('');
  const [hmoProvider, setHmoProvider] = useState('Maxicare');
  const [hmoPolicyNumber, setHmoPolicyNumber] = useState(`POL-MAX-${Math.floor(100000 + Math.random() * 900000)}`);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error,setError]=useState<string|null>(null);
  const [roomOptions,setRoomOptions]=useState<Array<{bed:string;category:typeof roomCategory;rate:number}>>([]);
  useEffect(()=>{if(!isAdmitPatientModalOpen)return;let active=true;setRoomOptions([]);setRoomBed('');setError(null);
    apiClient.getBeds().then(res=>{if(active)setRoomOptions(res.items.filter(b=>b.status==='AVAILABLE'&&!b.currentEncounterId).map(b=>({bed:b.bedNumber,category:b.roomCategory,rate:Number(b.dailyRate)})));}).catch(error=>{if(active)setError(error instanceof Error?error.message:'Could not load available hospital beds.');});return()=>{active=false;};
  },[isAdmitPatientModalOpen]);
  const [physicians,setPhysicians]=useState<Array<{id:string;name:string}>>([]);
  useEffect(()=>{if(!isAdmitPatientModalOpen)return;let active=true;setPhysicians([]);apiClient.patients.getPhysicians().then(res=>{if(active)setPhysicians(res.items);}).catch(error=>{if(active)setError(error instanceof Error?error.message:'Could not load hospital physicians.');});return()=>{active=false;};},[isAdmitPatientModalOpen]);

  useEffect(() => {
    if (!isAdmitPatientModalOpen || typeof document === 'undefined') return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isAdmitPatientModalOpen]);

  if (!isAdmitPatientModalOpen || typeof document === 'undefined') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !primaryDiagnosis.trim()) return;

    setIsSubmitting(true);setError(null);
    try {
      await admitPatient({
        fullName: fullName.trim(),
        mrn,
        gender,
        age,
        isSeniorCitizen,
        isPwd,
        philhealthPin,
        roomBed,
        roomCategory,
        dailyRoomRate,
        attendingPhysicianId: attendingDoctor,
        primaryDiagnosis: primaryDiagnosis.trim(),
        hmoProvider: hmoProvider === 'None' ? undefined : hmoProvider,
        hmoPolicyNumber: hmoProvider === 'None' ? undefined : hmoPolicyNumber
      });
      closeAdmitPatientModal();
    } catch(error) {setError(error instanceof Error?error.message:'Admission was not confirmed. Try again.');} finally {
      setIsSubmitting(false);
    }
  };


  return (
    <ViewportOverlay className="flex items-center justify-center p-4" backdropClassName="bg-slate-900/60 backdrop-blur-xs" motion="rise" layer="modal">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Inpatient Admission Registration
              </h3>
              <p className="text-xs text-slate-500">
                Register new patient encounter into the active 200-bed hospital census.
              </p>
            </div>
          </div>
          <IconButton
            size="sm"
            variant="ghost"
            icon={X}
            onClick={closeAdmitPatientModal}
            ariaLabel="Close modal"
          />
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}
          {/* Section 1: Demographics */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              1. Patient Demographics &amp; Statutory Identity
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Legal Name (Last, First M.)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Santos, Maria Clara E."
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Medical Record No. (MRN)
                </label>
                <input
                  type="text"
                  required
                  value={mrn}
                  onChange={(e) => setMrn(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono bg-slate-50 text-slate-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="M">Male (M)</option>
                  <option value="F">Female (F)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Age</label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">PhilHealth PIN</label>
                <input
                  type="text"
                  value={philhealthPin}
                  onChange={(e) => setPhilhealthPin(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Senior & PWD Toggles */}
            <div className="flex items-center gap-6 mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={isSeniorCitizen}
                  onChange={(e) => setIsSeniorCitizen(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>Senior Citizen (RA 9994 20% + VAT Exemption)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={isPwd}
                  onChange={(e) => setIsPwd(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>PWD (RA 10754 Discount)</span>
              </label>
            </div>
          </div>

          {/* Section 2: Clinical & Ward Assignment */}
          <div className="pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              2. Clinical Diagnosis &amp; Ward Assignment
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <BedDouble className="w-3.5 h-3.5 text-blue-600" />
                  <span>Bed Assignment (200-Bed Inventory)</span>
                </label>
                <select
                  required
                  value={roomBed}
                  onChange={(e) => {
                    const sel = roomOptions.find((r) => r.bed === e.target.value);
                    if (sel) {
                      setRoomBed(sel.bed);
                      setRoomCategory(sel.category);
                      setDailyRoomRate(sel.rate);
                    } else {
                      setRoomBed(e.target.value);
                    }
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="">{roomOptions.length ? 'Choose an available bed' : 'No available beds loaded'}</option>
                  {roomOptions.map((r) => (
                    <option key={r.bed} value={r.bed}>
                      {r.bed} — {r.category} (₱{r.rate.toLocaleString()}/day)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                  <span>Attending Physician</span>
                </label>
                <select
                  required
                  value={attendingDoctor}
                  onChange={(e) => setAttendingDoctor(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="">Choose an assigned hospital physician</option>
                  {physicians.map(doctor=><option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Admitting Diagnosis &amp; Clinical Indication
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Acute Appendicitis / Community Acquired Pneumonia Moderate Risk"
                value={primaryDiagnosis}
                onChange={(e) => setPrimaryDiagnosis(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 3: Commercial HMO */}
          <div className="pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              3. Commercial Payer / HMO Authorization
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                  <span>HMO Carrier</span>
                </label>
                <select
                  value={hmoProvider}
                  onChange={(e) => setHmoProvider(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="Maxicare">Maxicare Healthcare</option>
                  <option value="Intellicare">Intellicare (Asalus Corp)</option>
                  <option value="Medicard">Medicard Philippines</option>
                  <option value="PhilCare">PhilCare</option>
                  <option value="Pacific Cross">Pacific Cross</option>
                  <option value="None">None (Direct Patient Pay / Self-Pay)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                  <span>Card / Policy Number</span>
                </label>
                <input
                  type="text"
                  disabled={hmoProvider === 'None'}
                  value={hmoPolicyNumber}
                  onChange={(e) => setHmoPolicyNumber(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none disabled:bg-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={closeAdmitPatientModal}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting || !fullName.trim() || !primaryDiagnosis.trim()}
              isLoading={isSubmitting}
            >
              Confirm Inpatient Admission
            </Button>
          </div>
        </form>
      </div>
    </ViewportOverlay>
  );
};
