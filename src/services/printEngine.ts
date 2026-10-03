import { Encounter, PaymentReceipt } from '@/types/domain';
import { WaterfallAggregate, MacroKpiMetrics, CommercialCarrierMetric } from '@/utils/rcmAnalyticsCalculations';
import { DemoPaymentRecord } from '@/features/patient-clarify/types/billing';

export type PrintDocumentType =
  | 'OFFICIAL_ESOA'
  | 'PATIENT_LEDGER'
  | 'DIGITAL_GATE_PASS'
  | 'OFFICIAL_RECEIPT'
  | 'EXECUTIVE_RCM_REPORT'
  | 'DISCHARGE_CLEARANCE_DOSSIER'
  | 'COVERAGE_APPROVALS_REPORT'
  | 'CLAIMS_ESOA_AUDIT_REPORT';

export interface PrintDocumentConfig {
  type: PrintDocumentType;
  title?: string;
  data: any;
}

type PrintListener = (config: PrintDocumentConfig | null) => void;

class PrintService {
  private currentConfig: PrintDocumentConfig | null = null;
  private listeners: Set<PrintListener> = new Set();
  private printTimeout: NodeJS.Timeout | null = null;

  public subscribe(listener: PrintListener): () => void {
    this.listeners.add(listener);
    // Initial call
    listener(this.currentConfig);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.currentConfig));
  }

  public print(config: PrintDocumentConfig) {
    if (this.printTimeout) {
      clearTimeout(this.printTimeout);
    }

    this.currentConfig = config;
    this.notify();

    // Mark document body with printing attribute
    document.body.setAttribute('data-medcore-printing', config.type);

    // Allow React to mount the printable DOM in #medcore-print-root
    setTimeout(() => {
      let isCleanedUp = false;
      const cleanup = () => {
        if (isCleanedUp) return;
        isCleanedUp = true;
        document.body.removeAttribute('data-medcore-printing');
        this.currentConfig = null;
        this.notify();
        window.removeEventListener('afterprint', cleanup);
        if (this.printTimeout) {
          clearTimeout(this.printTimeout);
          this.printTimeout = null;
        }
      };

      window.addEventListener('afterprint', cleanup, { once: true });

      try {
        window.print();
      } finally {
        // Once the print modal closes (blocking call returns), clean up immediately
        setTimeout(cleanup, 200);
      }

      // 2s safety ceiling fallback in case browser defers execution
      this.printTimeout = setTimeout(cleanup, 2000);
    }, 120);
  }

  public getCurrentConfig(): PrintDocumentConfig | null {
    return this.currentConfig;
  }
}

export const printEngine = new PrintService();
