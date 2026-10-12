import React from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, ShieldCheck, X } from 'lucide-react';
import { useMedCore } from '@/context/MedCoreContext';

export function SmsDeliveryToast() {
  const { lastSmsDispatch, clearLastSmsDispatch } = useMedCore();
  if (!lastSmsDispatch || typeof document === 'undefined') return null;
  return createPortal(
    <section role="status" aria-live="polite" aria-atomic="true" aria-label="Simulated SMS preview"
      className="no-print fixed bottom-5 right-5 w-[420px] max-w-[calc(100vw-40px)] max-h-[calc(100dvh-40px)] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2"
      style={{ zIndex: 4000 }}>
      <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-100">
        <div className="flex items-start gap-3 min-w-0">
          <span className="rounded-xl bg-teal-50 p-2 text-teal-700"><MessageSquare className="h-5 w-5" aria-hidden="true" /></span>
          <div>
            <span className="inline-block rounded-md bg-teal-50 px-2 py-1 text-[10px] font-bold tracking-wide text-teal-800">[SIMULATED SMS SENT]</span>
            <p className="mt-2 text-sm font-semibold text-slate-900">{lastSmsDispatch.recipientName}</p>
            <p className="text-xs text-slate-600 font-mono">To: {lastSmsDispatch.recipientPhone}</p>
          </div>
        </div>
        <button type="button" onClick={clearLastSmsDispatch} aria-label="Dismiss SMS preview"
          className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="p-4">
        <p className="rounded-2xl rounded-tr-sm border border-teal-100 bg-teal-50/70 p-4 font-mono text-[13px] leading-6 text-slate-800 whitespace-pre-wrap break-words">{lastSmsDispatch.messageBody}</p>
        <p className="mt-3 text-xs font-mono text-slate-500">{lastSmsDispatch.messageId}</p>
        <div className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-slate-600">
          <ShieldCheck className="h-4 w-4 shrink-0 text-teal-700 mt-0.5" aria-hidden="true" />
          <span>NTC: No links · RA 10173: Clinical details excluded</span>
        </div>
        <p className="mt-2 text-xs text-slate-500">Sandbox preview only. No cellular SMS was delivered.</p>
      </div>
    </section>, document.body
  );
}
