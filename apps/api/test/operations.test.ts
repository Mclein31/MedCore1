import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHarness, stayAwaitingSettlement, type Harness } from './harness';

let h: Harness;
beforeAll(async () => {
  h = await createHarness();
});
afterAll(() => h.close());

describe('facility settings', () => {
  it('saves and returns the doctor PF timeout', async () => {
    const cfo = await h.staff('HOSPITAL_CFO');
    const saved = await cfo.put('/api/v1/staff/facility', { doctorPfTimeoutMinutes: 22 });
    expect(saved.status).toBe(200);
    const read = await cfo.get('/api/v1/staff/facility');
    expect(read.body.facility.doctorPfTimeoutMinutes).toBe(22);
  });
});

describe('staff notifications', () => {
  it('keeps read marks in the database, not in process memory', async () => {
    const stay = await stayAwaitingSettlement(h, { patientIndex: 9, bedIndex: 9 });
    const before = await stay.billing.get('/api/v1/staff/notifications');
    expect(before.status).toBe(200);
    const first = before.body.items[0];
    expect(first).toBeTruthy();
    expect(first.read).toBe(false);

    const marked = await stay.billing.post('/api/v1/staff/notifications/mark-read', { id: first.id });
    expect(marked.status).toBe(200);

    // A fresh sign-in (as a new Worker isolate would see it) still reports the mark.
    const after = await stay.billing.get('/api/v1/staff/notifications');
    expect(after.body.items.find((n: { id: string }) => n.id === first.id).read).toBe(true);
    const rows = await h.db.execute(
      sql`select count(*)::int as n from staff_notification_reads where notification_id = ${first.id}`,
    );
    expect((rows as unknown as { rows: { n: number }[] }).rows[0]!.n).toBe(1);
  });
});
