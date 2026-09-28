import { useEffect, useRef } from 'react';
import { DemoPaymentRecord } from '../types/billing';

export type BillingSyncMessage = (
  | { type: 'BILL_FINALIZED'; encounterId: string; timestamp: string }
  | { type: 'BILL_SENT'; encounterId: string; timestamp: string; magicToken: string }
  | { type: 'BILL_VIEWED'; encounterId: string; timestamp: string }
  | { type: 'DISPUTE_FILED'; encounterId: string; itemId: string; reason: string }
  | { type: 'DISPUTE_RESOLVED'; encounterId: string; itemId: string; action: 'WAIVED' }
  | {
      type: 'PAYMENT_SETTLED';
      encounterId: string;
      payment: DemoPaymentRecord;
      remainingBalance: number;
      isFullySettled: boolean;
    }
) & { senderId?: string };

const CHANNEL_NAME = 'medcore_billing_sync';

// Unique session identifier for the active window/tab to filter out self-broadcast echo
export const TAB_SESSION_ID =
  typeof window !== 'undefined'
    ? `tab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    : 'tab_ssr';

/**
 * Global helper to broadcast billing synchronization events across tabs/windows
 */
export function broadcastBillingSync(message: BillingSyncMessage): void {
  if (typeof window !== 'undefined') {
    const payload = { ...message, senderId: message.senderId || TAB_SESSION_ID };

    // 1. HTML5 BroadcastChannel for modern zero-latency cross-tab communication
    if ('BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel(CHANNEL_NAME);
        bc.postMessage(payload);
        bc.close();
      } catch (e) {
        console.warn('BroadcastChannel error:', e);
      }
    }

    // 2. Storage event fallback for older environments
    try {
      localStorage.setItem('medcore_billing_sync_event', JSON.stringify({ ...payload, _ts: Date.now() }));
    } catch {
      // ignore storage quota / sandbox restrictions
    }
  }
}

/**
 * Hook to listen for cross-tab billing synchronization events
 */
export function usePatientBillingSync(
  onSyncMessage?: (message: BillingSyncMessage) => void
) {
  const handlerRef = useRef(onSyncMessage);
  handlerRef.current = onSyncMessage;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let bc: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel(CHANNEL_NAME);
        bc.onmessage = (event: MessageEvent<BillingSyncMessage>) => {
          // Ignore self-broadcast messages in the originating tab
          if (event.data && event.data.senderId !== TAB_SESSION_ID && handlerRef.current) {
            handlerRef.current(event.data);
          }
        };
      } catch (e) {
        console.warn('Could not initialize BroadcastChannel:', e);
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'medcore_billing_sync_event' && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue) as BillingSyncMessage;
          if (parsed && parsed.senderId !== TAB_SESSION_ID && handlerRef.current) {
            handlerRef.current(parsed);
          }
        } catch {
          // ignore parsing error
        }
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      if (bc) {
        bc.close();
      }
      window.removeEventListener('storage', handleStorage);
    };
  }, []);
}
