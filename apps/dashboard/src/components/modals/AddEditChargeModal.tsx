import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMedCore } from '@/context/MedCoreContext';
import { ChargemasterItem } from '@/types/domain';
import { X, Plus, Pencil, DollarSign, Tag, FileText, Hash, Info, Layers } from 'lucide-react';
import { formatPhp } from '@/utils/formatters';
import { Button, IconButton, Select } from '@/components/common';

export const AddEditChargeModal: React.FC = () => {
  const {
    isAddChargeModalOpen,
    isEditChargeModalOpen,
    chargeToEdit,
    closeAddEditChargeModal,
    addChargeItem,
    editChargeItem,
    selectedEncounterId,
    selectedEncounter
  } = useMedCore();

  const isOpen = isAddChargeModalOpen || isEditChargeModalOpen;
  const isEditing = Boolean(chargeToEdit && isEditChargeModalOpen);

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ChargemasterItem['category']>('PHARMACY');
  const [qty, setQty] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(1500);
  const [grossAmount, setGrossAmount] = useState<number>(1500);
  const [coverageType, setCoverageType] = useState<'PHILHEALTH_FIRST' | 'HMO_COVERED' | 'PATIENT_DIRECT'>('PHILHEALTH_FIRST');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error,setError]=useState<string|null>(null);

  useEffect(() => {
    setError(null);
    if (chargeToEdit && isEditing) {
      setDescription(chargeToEdit.description);
      setCategory(chargeToEdit.category);
      const initialQty = chargeToEdit.qty && chargeToEdit.qty > 0 ? chargeToEdit.qty : 1;
      const initialGross = chargeToEdit.grossAmount;
      const initialUnitPrice = chargeToEdit.unitPrice && chargeToEdit.unitPrice > 0
        ? chargeToEdit.unitPrice
        : Number((initialGross / initialQty).toFixed(2));
      setQty(initialQty);
      setUnitPrice(initialUnitPrice);
      setGrossAmount(initialGross);
    } else {
      setDescription('');
      setCategory('PHARMACY');
      setQty(1);
      setUnitPrice(1500);
      setGrossAmount(1500);
      setCoverageType('PHILHEALTH_FIRST');
    }
  }, [chargeToEdit, isEditing, isOpen]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleQtyChange = (val: number) => {
    const validQty = Math.max(1, val);
    setQty(validQty);
    setGrossAmount(Number((unitPrice * validQty).toFixed(2)));
  };

  const handleUnitPriceChange = (val: number) => {
    const validPrice = Math.max(0, val);
    setUnitPrice(validPrice);
    setGrossAmount(Number((validPrice * qty).toFixed(2)));
  };

  const handleGrossAmountChange = (val: number) => {
    const validGross = Math.max(0, val);
    setGrossAmount(validGross);
    if (qty > 0) {
      setUnitPrice(Number((validGross / qty).toFixed(2)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || grossAmount <= 0) return;

    setIsSubmitting(true);setError(null);
    try {
      if (isEditing && chargeToEdit) {
        await editChargeItem(selectedEncounterId, chargeToEdit.id, {
          description: description.trim(),
          category,
          grossAmount,
          qty,
          unitPrice
        });
      } else {
        await addChargeItem(selectedEncounterId, {
          description: description.trim(),
          category,
          grossAmount,
          qty,
          unitPrice,
          coverageType,
          code: `CHG-${category.slice(0, 3)}-${Date.now().toString().slice(-4)}`,
          status: 'COVERED',
          isVatable: true
        });
      }
      closeAddEditChargeModal();
    } catch(error) {setError(error instanceof Error?error.message:'The charge was not confirmed. Try again.');} finally {
      setIsSubmitting(false);
    }
  };

  const categories: { label: string; value: ChargemasterItem['category']; desc: string }[] = [
    { label: 'Pharmacy & Therapeutics', value: 'PHARMACY', desc: 'Oral meds, IV fluids, biologics' },
    { label: 'Laboratory Diagnostics', value: 'LABORATORY', desc: 'CBC, blood chemistry, pathology' },
    { label: 'Medical & Central Supplies', value: 'CENTRAL_SUPPLIES', desc: 'Syringes, dressings, cannulas' },
    { label: 'Room & Board Differential', value: 'ROOM_BOARD', desc: 'Daily room rate & facility fees' },
    { label: 'Professional Fee (Attending)', value: 'PROFESSIONAL_FEE', desc: 'Attending physician & surgical fees' }
  ];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              {isEditing ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                {isEditing ? 'Edit Chargemaster Line Item' : 'Add Itemized Charge to Statement'}
              </h3>
              <p className="text-xs text-slate-500">
                Patient: <span className="font-semibold text-slate-700">{selectedEncounter.patient.maskedName}</span> ({selectedEncounter.encounterNumber})
              </p>
            </div>
          </div>
          <IconButton
            size="sm"
            variant="ghost"
            icon={X}
            onClick={closeAddEditChargeModal}
            ariaLabel="Close modal"
          />
        </div>

        {/* Form Body */}
        {error&&<p role="alert" className="px-6 py-3 text-sm text-rose-700">{error}</p>}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Charge Description &amp; Dosage</span>
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Meropenem 1g IV Infusion / CBC w/ Platelet Count"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-blue-600" />
              <span>Department Category</span>
            </label>
            <Select
              size="md"
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              wrapperClassName="w-full"
              className="w-full text-sm font-medium"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>

          {/* 3-Column Quantity, Unit Price, and Gross Amount Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-blue-600" />
                <span>Quantity</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={qty || ''}
                onChange={(e) => handleQtyChange(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-mono font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                <span>Unit Price (₱)</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={unitPrice || ''}
                onChange={(e) => handleUnitPriceChange(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-mono font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>Gross Total (₱)</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={grossAmount || ''}
                onChange={(e) => handleGrossAmountChange(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-mono font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none text-slate-900 bg-slate-50/70"
              />
            </div>
          </div>

          {!isEditing && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Statutory Coverage Allocation Target</span>
              </label>
              <Select
                size="md"
                value={coverageType}
                onChange={(e) => setCoverageType(e.target.value as any)}
                wrapperClassName="w-full"
                className="w-full text-xs font-medium bg-slate-50"
              >
                <option value="PHILHEALTH_FIRST">PhilHealth Statutory Case Rate First (Default)</option>
                <option value="HMO_COVERED">HMO Primary Out-of-Pocket Coverage</option>
                <option value="PATIENT_DIRECT">Patient Out-of-Pocket / Non-Covered Differential</option>
              </Select>
            </div>
          )}

          {/* Statutory Waterfall Cascade Advisory Explainer */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <div className="font-bold text-[11px] uppercase tracking-wider text-amber-800">
                  Philippine Statutory Cascade Mandate (RA 11223 &amp; RA 9994)
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed mt-0.5">
                  Regardless of allocation intent, Philippine Law mandates that VAT exemptions, Senior/PWD 20% discounts, and PhilHealth Case Rates are deducted first as statutory benefits before HMO MBL and patient out-of-pocket liabilities are adjudicated.
                </p>
              </div>
            </div>
          </div>

          {/* Automatic Waterfall Adjustment Summary */}
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900">
            <div className="font-bold mb-1 flex items-center justify-between">
              <span>Automatic Waterfall Adjustment</span>
              <span className="font-mono text-sm">{formatPhp(grossAmount)}</span>
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              Upon confirmation, the 10-step statutory deduction engine will authoritatively re-balance the ledger with zero-centavo drift.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              size="md"
              variant="secondary"
              onClick={closeAddEditChargeModal}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="md"
              variant="primary"
              disabled={!description.trim() || grossAmount <= 0}
              isLoading={isSubmitting}
            >
              {isEditing ? 'Save Changes' : 'Post Charge to Statement'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
