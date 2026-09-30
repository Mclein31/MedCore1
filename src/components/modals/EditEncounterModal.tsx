import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMedCore } from '@/context/MedCoreContext';
import { X, Pencil, BedDouble, Stethoscope, FileText, AlertCircle } from 'lucide-react';

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

    setIsSubmitting(true);
    try {
      await editEncounter(encounterToEdit.id, {
        primaryDiagnosis: primaryDiagnosis.trim(),
        roomBed,
        dailyRoomRate,
        attendingDoctor
      });
      closeEditEncounterModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  const roomOptions = [
    'Bed 401', 'Bed 402', 'Bed 408-A', 'Bed 412', 'Bed 415',
    'Bed 501', 'Bed 506', 'Bed 512-B', 'Bed 518', 'Bed 525',
    'Bed 301-A', 'Bed 301-B', 'Bed 304', 'Bed 314-A', 'Bed 318-B',
    'Bed 201', 'Bed 210', 'Bed 214', 'Bed 220', 'Bed 224',
    'ED-1', 'ED-23', 'Suite 421', 'ICU-7'
  ];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
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
          <button
            onClick={closeEditEncounterModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <BedDouble className="w-3.5 h-3.5 text-blue-600" />
                <span>Room / Bed Transfer</span>
              </label>
              <select
                value={roomBed}
                onChange={(e) => setRoomBed(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                {roomOptions.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none"
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
              onChange={(e) => setAttendingDoctor(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
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
            <button
              type="button"
              onClick={closeEditEncounterModal}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !primaryDiagnosis.trim()}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Updating Encounter...</span>
                </>
              ) : (
                <span>Save Encounter Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
