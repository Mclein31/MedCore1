import React, { useState, useEffect } from 'react';
import { hmoAi, HmoAppealResponse } from '@/api/ai';
import { useMedCore } from '@/context/MedCoreContext';
import {
  FileText,
  Copy,
  Check,
  Printer,
  Sparkles,
  X,
  RefreshCw,
  Scale,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Button, MarkdownNarrative } from '@/components/common';

export interface HmoAppealGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  encounter: any;
  deniedItemDescription?: string;
  deniedAmount?: number;
  hmoProviderName?: string;
}

export const HmoAppealGeneratorModal: React.FC<HmoAppealGeneratorModalProps> = ({
  isOpen,
  onClose,
  encounter,
  deniedItemDescription = 'Laparoscopic Consumables, PPE & Surgical Barrier Drapes',
  deniedAmount = 14250,
  hmoProviderName
}) => {
  const { printDocument } = useMedCore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appealData, setAppealData] = useState<HmoAppealResponse | null>(null);
  const [editableMarkdown, setEditableMarkdown] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'PREVIEW' | 'EDIT'>('PREVIEW');

  const generateAppeal = async () => {
    if (!encounter?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await hmoAi.generateAppeal(
        encounter.id,
        deniedItemDescription,
        deniedAmount,
        hmoProviderName || encounter.hmo?.providerName || 'Maxicare Healthcare Corporation'
      );
      setAppealData(res);
      setEditableMarkdown(res.appealLetterMarkdown);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate HMO medical necessity appeal letter.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && encounter?.id) {
      void generateAppeal();
    }
  }, [isOpen, encounter?.id]);

  if (!isOpen || !encounter) return null;

  const handleCopy = async () => {
    if (!editableMarkdown) return;
    await navigator.clipboard.writeText(editableMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    if (!editableMarkdown) return;
    printDocument({
      type: 'HMO_APPEAL_LETTER',
      title: `HMO Appeal - ${appealData?.referenceNumber || encounter.encounterNumber}`,
      data: {
        letterContent: editableMarkdown,
        encounter,
        appealData
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Scale className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900">
                  Automated HMO Medical Necessity Appeal Drafter
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                  <Sparkles className="w-3 h-3 text-purple-600" />
                  RA 11765 & EO 192
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {encounter.encounterNumber} &bull; {encounter.patient?.fullName || encounter.patient?.maskedName} &bull; {hmoProviderName || encounter.hmo?.providerName || 'HMO Payor'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
              <p className="text-sm font-medium text-slate-700">
                Formulating formal medico-legal appeal letter citing RA 11765 and clinical necessity...
              </p>
              <p className="text-xs text-slate-500">Correlating surgical consumables and physician orders under zero PHI</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">Appeal Engine Notice</p>
                <p className="mt-1">{error}</p>
                <Button size="sm" variant="secondary" className="mt-3" onClick={() => void generateAppeal()}>
                  Retry Appeal Generation
                </Button>
              </div>
            </div>
          ) : appealData ? (
            <>
              {/* Telemetry Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-purple-50/50 border border-purple-100 text-xs">
                <div>
                  <span className="text-slate-500 block">Appeal Reference No.:</span>
                  <strong className="text-purple-950 font-mono text-sm">{appealData.referenceNumber}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Attending Physician / PAN:</span>
                  <strong className="text-slate-900">{appealData.attendingPhysicianName}</strong>
                  <span className="block text-[11px] font-mono text-slate-500">{appealData.doctorPan}</span>
                </div>
                <div>
                  <span className="text-slate-500 block flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-purple-600" />
                    Reconsideration Window (48h):
                  </span>
                  <strong className="text-slate-900">{new Date(appealData.reconsiderationDeadline).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
                </div>
              </div>

              {/* Citations Applied */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Statutory & Medico-Legal Citations Embedded:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {appealData.citationsApplied.map((c, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] text-slate-700 font-medium">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* Mode Toggle: Preview vs Edit */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('PREVIEW')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                      activeTab === 'PREVIEW' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Letterhead Preview
                  </button>
                  <button
                    onClick={() => setActiveTab('EDIT')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                      activeTab === 'EDIT' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Edit Draft
                  </button>
                </div>

                <Button size="sm" variant="secondary" icon={RefreshCw} onClick={() => void generateAppeal()}>
                  Regenerate
                </Button>
              </div>

              {/* Letter Display */}
              {activeTab === 'PREVIEW' ? (
                <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs text-slate-900 text-xs sm:text-sm leading-relaxed max-h-[420px] overflow-y-auto select-all">
                  <MarkdownNarrative content={editableMarkdown} />
                </div>
              ) : (
                <textarea
                  value={editableMarkdown}
                  onChange={(e) => setEditableMarkdown(e.target.value)}
                  className="w-full h-[400px] p-4 font-mono text-xs text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              )}

              {/* Suggested Attachments */}
              {appealData.suggestedAttachments && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <span className="font-bold text-slate-800">Mandatory Dossier Attachments:</span>
                  <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                    {appealData.suggestedAttachments.map((att, i) => (
                      <li key={i}>{att}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={copied ? Check : Copy}
              onClick={() => void handleCopy()}
              disabled={!editableMarkdown}
            >
              {copied ? 'Copied' : 'Copy to Clipboard'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={Printer}
              onClick={handlePrint}
              disabled={!editableMarkdown}
            >
              Print with Letterhead
            </Button>
          </div>

          <Button size="sm" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
