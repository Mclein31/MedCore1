export type PrintDocumentType =
  | 'OFFICIAL_ESOA' | 'PATIENT_LEDGER' | 'DIGITAL_GATE_PASS' | 'OFFICIAL_RECEIPT'
  | 'EXECUTIVE_RCM_REPORT' | 'DISCHARGE_CLEARANCE_DOSSIER'
  | 'COVERAGE_APPROVALS_REPORT' | 'CLAIMS_ESOA_AUDIT_REPORT';

export interface PrintDocumentConfig {
  type: PrintDocumentType;
  title?: string;
  orientation?: 'portrait' | 'landscape';
  data: any;
}

export function getPrintOrientation(config: PrintDocumentConfig): 'portrait' | 'landscape' {
  return config.orientation ?? (['OFFICIAL_ESOA', 'PATIENT_LEDGER', 'COVERAGE_APPROVALS_REPORT'].includes(config.type) ? 'landscape' : 'portrait');
}

type PrintListener = (config: PrintDocumentConfig | null) => void;

export class PrintService {
  private currentConfig: PrintDocumentConfig | null = null;
  private listeners = new Set<PrintListener>();
  private sequence = 0;
  private mountTimer: ReturnType<typeof setTimeout> | null = null;
  private activeCleanup: (() => void) | null = null;
  private printing = false;
  private queuedConfig: PrintDocumentConfig | null = null;

  public subscribe(listener: PrintListener): () => void {
    this.listeners.add(listener);
    listener(this.currentConfig);
    return () => { this.listeners.delete(listener); };
  }
  private notify() { this.listeners.forEach(listener => listener(this.currentConfig)); }

  public print(config: PrintDocumentConfig) {
    // A non-blocking browser dialog still owns its DOM. Queue the newest
    // request instead of replacing that document while preview is open.
    if (this.printing) { this.queuedConfig = config; return; }
    this.activeCleanup?.();
    if (this.mountTimer) clearTimeout(this.mountTimer);
    const request = ++this.sequence;
    this.currentConfig = config;
    document.body.setAttribute('data-medcore-printing', config.type);
    this.notify();
    const media = window.matchMedia('print');
    let enteredPrint = false;
    const onBeforePrint = () => { enteredPrint = true; };
    const onMediaChange = (event: MediaQueryListEvent) => {
      if (event.matches) enteredPrint = true;
      else if (enteredPrint) cleanup();
    };
    const onAfterPrint = () => { if (enteredPrint || this.printing) cleanup(); };
    const cleanup = () => {
      window.removeEventListener('beforeprint', onBeforePrint);
      window.removeEventListener('afterprint', onAfterPrint);
      media.removeEventListener('change', onMediaChange);
      if (request !== this.sequence) return;
      if (this.mountTimer) clearTimeout(this.mountTimer);
      this.mountTimer = null;
      this.activeCleanup = null;
      this.printing = false;
      document.body.removeAttribute('data-medcore-printing');
      this.currentConfig = null;
      this.notify();
      const next = this.queuedConfig; this.queuedConfig = null;
      if (next) this.print(next);
    };
    this.activeCleanup = cleanup;
    window.addEventListener('beforeprint', onBeforePrint);
    window.addEventListener('afterprint', onAfterPrint);
    media.addEventListener('change', onMediaChange);

    // React gets a render turn; fonts and image decoding finish before capture.
    this.mountTimer = setTimeout(async () => {
      this.mountTimer = null;
      try {
        await document.fonts?.ready;
        const root = document.getElementById('medcore-print-root');
        await Promise.all(Array.from(root?.querySelectorAll('img') ?? []).map(image => image.decode().catch(() => {})));
        if (request !== this.sequence || this.currentConfig !== config) return;
        this.printing = true;
        window.print();
        // Non-blocking print dialogs must retain their DOM until afterprint or
        // media exit. A timeout after window.print() can erase an open preview.
      } catch (error) { cleanup(); console.error('Could not open print preview.', error); }
    }, 0);
  }
  public getCurrentConfig(): PrintDocumentConfig | null { return this.currentConfig; }
}
export const printEngine = new PrintService();
