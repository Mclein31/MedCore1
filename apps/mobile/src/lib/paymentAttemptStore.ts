import type { PayInput } from '../services/paymentApi';
export interface PendingPayment { key: string; encounterId: string; input: PayInput }

// Save the immutable request before sending it. A lost response must reuse it.
export class PaymentAttemptStore {
  private memory = new Map<string, PendingPayment | null>();
  private locks = new Set<string>();
  constructor(private storage: { read: (account: string) => Promise<string | null>; write: (account: string, value: string) => Promise<void>; remove: (account: string) => Promise<void> }) {}
  begin(account: string) { if (this.locks.has(account)) return false; this.locks.add(account); return true; }
  end(account: string) { this.locks.delete(account); }
  async restore(account: string): Promise<PendingPayment | null> {
    if (this.memory.has(account)) return this.memory.get(account)!;
    const saved = await this.storage.read(account);
    if (this.memory.has(account)) return this.memory.get(account)!;
    if (!saved) return null;
    const value = JSON.parse(saved) as PendingPayment;
    if (!value?.key || !value.encounterId || !Number.isFinite(value.input?.amount) || value.input.amount <= 0 || !value.input.paymentRail || !value.input.payerName) throw new Error('A previous payment needs review. Please contact hospital billing before starting another payment.');
    this.memory.set(account, value);
    return value;
  }
  async save(account: string, value: PendingPayment) {
    const current = await this.restore(account);
    if (current && JSON.stringify(current) !== JSON.stringify(value)) throw new Error('Confirm the previous payment before starting another request.');
    await this.storage.write(account, JSON.stringify(value));
    this.memory.set(account, value);
  }
  async complete(account: string, key: string) {
    const current = await this.restore(account);
    if (!current) return;
    if (current.key !== key) throw new Error('This completion does not match the pending payment.');
    await this.storage.remove(account);
    this.memory.set(account, null);
  }
}
