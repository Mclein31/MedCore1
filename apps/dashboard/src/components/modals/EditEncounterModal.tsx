import { ViewportOverlay } from '@/components/common/ViewportOverlay';
import {apiClient} from '@/api';
import React, { useState, useEffect } from 'react';
import { useMedCore } from '@/context/MedCoreContext';
import { X, Pencil, BedDouble, Stethoscope, FileText, AlertCircle } from '@/components/common/SolarIcons';
import { Button, IconButton, Select } from '@/components/common';

export const EditEncounterModal: React.FC = () => {
  const {
    isEditEncounterModalOpen,
    encounterToEdit,
    closeEditEncounterModal,
    editEncounter
  } = useMedCore();

  const [primaryDiagnosis, setPrimaryDiagnosis] = useState('');
  const [roomBed, setRoomBed] = useState('');
  const [dailyRoomRate, setDailyRoomRate] = useState<number>(3200);
  const [attendingDoctor, setAttendingDoctor] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error,setError]=useState<string|null>(null);

  const [availableBeds,setAvailableBeds]=useState<string[]>([]);
  useEffect(()=>{if(!isEditEncounterModalOpen)return;let active=true;setAvailableBeds([]);setError(null);
    apiClient.getBeds().then(res=>{if(active)setAvailableBeds(res.items.filter(b=>b.status==='AVAILABLE'&&!b.currentEncounterId).map(b=>b.bedNumber));}).catch(error=>{if(active)setError(error instanceof Error?error.message:'Could not load available beds.');});return()=>{active=false;};
  },[isEditEncounterModalOpen]);
  useEffect(() => {
    if (encounterToEdit) {
      setPrimaryDiagnosis(encounterToEdit.primaryDiagnosis || '');
      setRoomBed(encounterToEdit.roomBed || '');
      setDailyRoomRate(encounterToEdit.dailyRoomRate || 3200);
      setAttendingDoctor(encounterToEdit.attendingDoctor || '');
    }
  }, [encounterToEdit, isEditEncounterModalOpen]);

  useEffect(() => {
    if (!isEditEncounterModalOpen || !encounterToEdit || typeof document === 'undefined') return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isEditEncounterModalOpen, encounterToEdit]);

  if (!isEditEncounterModalOpen || !encounterToEdit || typeof document === 'undefined') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryDiagnosis.trim()) return;

    setIsSubmitting(true);setError(null);
    try {
      await editEncounter(encounterToEdit.id, {
        primaryDiagnosis: primaryDiagnosis.trim(),
        roomBed,
        dailyRoomRate
      });
      closeEditEncounterModal();
    } catch(error) {setError(error instanceof Error?error.message:'The edit was not confirmed. Try again.');} finally {
      setIsSubmitting(false);
    }
  };


  return (
    <ViewportOverlay className="flex items-center justify-center p-4" backdropClassName="bg-slate-900/60 backdrop-blur-xs" motion="rise" layer="modal">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Edit Encounter Record
              </h3>
              <p className="text-xs text-slate-500">
                Patient: <span className="font-semibold text-slate-700">{encounterToEdit.patient.maskedName}</span> ({encounterToEdit.encounterNumber})
              </p>
            </div>
          </div>
          <IconButton
            size="sm"
            variant="ghost"
            icon={X}
            onClick={closeEditEncounterModal}
            ariaLabel="Close modal"
          />
        </div>

        {/* Form Body */}
        {error&&<p role="alert" className="px-6 py-3 text-sm text-rose-700">{error}</p>}
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Primary Diagnosis</span>
            </label>
            <input
              type="text"
              required
              value={primaryDiagnosis}
              onChange={(e) => setPrimaryDiagnosis(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <BedDouble className="w-3.5 h-3.5 text-blue-600" />
                <span>Room / Bed Transfer</span>
              </label>
              <Select
                size="md"
                disabled={encounterToEdit.stage==='CLEARED_GATE_PASS'}
                value={roomBed}
                onChange={(e) => setRoomBed(e.target.value)}
                wrapperClassName="w-full"
                className="w-full text-sm font-medium"
              >
                {[encounterToEdit.roomBed,...availableBeds.filter(b=>b!==encounterToEdit.roomBed)].map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Daily Room Rate (₱)
              </label>
              <input
                type="number"
                min="500"
                step="100"
                required
                value={dailyRoomRate || ''}
                onChange={(e) => setDailyRoomRate(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-mono font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
              <span>Attending Physician</span>
            </label>
            <input
              type="text"
              required
              value={attendingDoctor}
              readOnly title="Physician assignment cannot be changed from this editor"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Updating room/bed will automatically synchronize occupancy on the hospital's 200 operational beds census.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              size="md"
              variant="secondary"
              onClick={closeEditEncounterModal}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="md"
              variant="primary"
              disabled={!primaryDiagnosis.trim()}
              isLoading={isSubmitting}
            >
              Save Encounter Changes
            </Button>
          </div>
        </form>
      </div>
    </ViewportOverlay>
  );
};
