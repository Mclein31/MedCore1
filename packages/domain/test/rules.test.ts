import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { can, canWaive, encounterScope, STAFF_ROLES, WAIVER_LIMIT_CENTS } from '../src/access';
import { PatientPaymentBody, PromissoryBody, StaffLoginBody } from '../src/contracts';
import { addMonths, isIsoDate, manilaDate } from '../src/dates';
import { chargesEditable, slaStatus, transition } from '../src/discharge';
import { validateGovernmentId } from '../src/governmentId';
import { formatPeso, lineTotal, MoneyError, mulRatio, parsePesos, sumCents } from '../src/money';
import { checkPassword } from '../src/password';
import { buildPromissorySchedule } from '../src/promissory';

describe('money', () => {
  it('parses peso input strictly', () => {
    expect(parsePesos('1,234.56')).toBe(123_456);
    expect(parsePesos('₱800')).toBe(80_000);
    expect(parsePesos('0.5')).toBe(50);
    for (const bad of ['', '1.234', '12,34', '-5', '1e5', '01', 'abc', '1,2345.00']) {
      expect(() => parsePesos(bad)).toThrow(MoneyError);
    }
  });

  it('formats and round-trips', () => {
    expect(formatPeso(123_456_789)).toBe('₱1,234,567.89');
    expect(formatPeso(5)).toBe('₱0.05');
    fc.assert(fc.property(fc.integer({ min: 0, max: 10_000_000_000 }), (c) => parsePesos(formatPeso(c)) === c));
  });

  it('rounds ratios half-up and guards overflow', () => {
    expect(mulRatio(5, 1n, 2n)).toBe(3);
    expect(mulRatio(4, 1n, 2n)).toBe(2);
    expect(() => sumCents(999_999_999_999_999, 1)).toThrow(MoneyError);
    expect(lineTotal(3, 1_050)).toBe(3_150);
    expect(() => lineTotal(0, 100)).toThrow(MoneyError);
  });
});

describe('dates', () => {
  it('uses the Manila calendar day', () => {
    expect(manilaDate(new Date('2026-01-31T16:30:00Z'))).toBe('2026-02-01');
    expect(manilaDate(new Date('2026-01-31T15:59:00Z'))).toBe('2026-01-31');
  });

  it('adds months with end-of-month clamping', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15');
    expect(isIsoDate('2026-02-30')).toBe(false);
  });
});

describe('promissory schedule', () => {
  it('sums to the principal exactly with zero interest', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1_000_000_000 }), fc.constantFrom(3 as const, 6 as const, 12 as const), (p, m) => {
        const s = buildPromissorySchedule(p, m, new Date('2026-10-16T02:00:00Z'));
        expect(s.installments).toHaveLength(m);
        expect(s.installments.reduce((a, i) => a + i.amountCents, 0)).toBe(p);
        expect(s.totalRepaymentCents).toBe(p);
        expect(s.feeCents).toBe(0);
      }),
    );
  });

  it('schedules the first installment a month after signing', () => {
    const s = buildPromissorySchedule(100_00, 3, new Date('2026-10-16T02:00:00Z'));
    expect(s.installments.map((i) => i.dueDate)).toEqual(['2026-11-16', '2026-12-16', '2027-01-16']);
    expect(s.installments.map((i) => i.amountCents)).toEqual([3333, 3333, 3334]);
  });
});

describe('discharge state machine', () => {
  it('walks the happy path with and without an HMO', () => {
    expect(transition('ADMITTED', 'DECLARE_MGH', { hasHmo: false })).toEqual({ ok: true, to: 'MGH_DECLARED' });
    expect(transition('PHARMACY_RTS_AUDIT', 'CLEAR_PHARMACY', { hasHmo: true })).toEqual({ ok: true, to: 'HMO_FINAL_LOA' });
    expect(transition('PHARMACY_RTS_AUDIT', 'CLEAR_PHARMACY', { hasHmo: false })).toEqual({
      ok: true,
      to: 'PENDING_SETTLEMENT',
    });
  });

  it('refuses out-of-order steps', () => {
    expect(transition('ADMITTED', 'SETTLE', { hasHmo: false }).ok).toBe(false);
    expect(transition('CLEARED', 'DECLARE_MGH', { hasHmo: false }).ok).toBe(false);
  });

  it('locks charges once settlement starts', () => {
    expect(chargesEditable('HMO_FINAL_LOA')).toBe(true);
    expect(chargesEditable('PENDING_SETTLEMENT')).toBe(false);
    expect(chargesEditable('CLEARED')).toBe(false);
  });

  it('classifies the SLA clock', () => {
    expect(slaStatus(10, 25, 40)).toBe('ON_TRACK');
    expect(slaStatus(25, 25, 40)).toBe('WARNING');
    expect(slaStatus(41, 25, 40)).toBe('BREACH');
  });
});

describe('access matrix', () => {
  it('gives lobby security nothing but pass verification', () => {
    expect(can('LOBBY_SECURITY', 'gatepass:verify')).toBe(true);
    expect(can('LOBBY_SECURITY', 'encounter:read')).toBe(false);
    expect(encounterScope('LOBBY_SECURITY')).toBe('NONE');
  });

  it('scopes physicians to their own patients', () => {
    expect(encounterScope('ATTENDING_PHYSICIAN')).toBe('ATTENDING_ONLY');
    expect(encounterScope('BILLING_SPECIALIST')).toBe('FACILITY');
  });

  it('reserves administration and voiding for the CFO', () => {
    for (const role of STAFF_ROLES) {
      expect(can(role, 'staff:manage')).toBe(role === 'HOSPITAL_CFO');
      expect(can(role, 'encounter:void')).toBe(role === 'HOSPITAL_CFO');
      expect(can(role, 'audit:read')).toBe(role === 'HOSPITAL_CFO');
    }
  });

  it('enforces separation of duties on waivers', () => {
    const billing = { id: 'a', role: 'BILLING_SPECIALIST' as const };
    expect(canWaive(billing, { contestedCents: 100, filedByStaffId: 'a' }).allowed).toBe(false);
    expect(canWaive(billing, { contestedCents: WAIVER_LIMIT_CENTS + 1, filedByStaffId: null }).allowed).toBe(false);
    expect(canWaive(billing, { contestedCents: WAIVER_LIMIT_CENTS, filedByStaffId: null }).allowed).toBe(true);
    expect(canWaive({ id: 'c', role: 'HOSPITAL_CFO' }, { contestedCents: 10 ** 9, filedByStaffId: null }).allowed).toBe(true);
    expect(canWaive({ id: 'h', role: 'HMO_COORDINATOR' }, { contestedCents: 1, filedByStaffId: null }).allowed).toBe(false);
  });
});

describe('government IDs', () => {
  it('normalizes valid numbers and keeps the last four', () => {
    expect(validateGovernmentId('PHILSYS', '1234 5678 9012 3456')).toEqual({
      valid: true,
      normalized: '1234-5678-9012-3456',
      last4: '3456',
    });
    expect(validateGovernmentId('DRIVERS_LICENSE', 'a01-23-456789')).toMatchObject({ normalized: 'A01-23-456789' });
    expect(validateGovernmentId('PASSPORT', 'P1234567A').valid).toBe(true);
  });

  it('rejects lookalikes instead of cleaning them', () => {
    expect(validateGovernmentId('UMID', '1234.5678901.2').valid).toBe(false);
    expect(validateGovernmentId('PHILSYS', '１２３４５６７８９０１２３４５６').valid).toBe(false);
    expect(validateGovernmentId('PASSPORT', 'P1234567').valid).toBe(false);
  });
});

describe('password policy', () => {
  const who = { email: 'elena.santos@stjude.test', fullName: 'Elena Santos' };
  it('accepts long passphrases', () => {
    expect(checkPassword('correct horse battery staple', who).ok).toBe(true);
  });
  it('rejects short, common and identity-derived passwords', () => {
    expect(checkPassword('short', who).ok).toBe(false);
    expect(checkPassword('Password1234', who).ok).toBe(false);
    expect(checkPassword('elena.santos-2026!', who).ok).toBe(false);
    expect(checkPassword('my santos rocks 99', who).ok).toBe(false);
    expect(checkPassword('x'.repeat(129), who).ok).toBe(false);
  });
});

describe('contracts', () => {
  it('normalizes emails and bounds passwords', () => {
    expect(StaffLoginBody.parse({ email: '  Elena@StJude.TEST ', password: 'x' }).email).toBe('elena@stjude.test');
    expect(StaffLoginBody.safeParse({ email: 'a@b.test', password: 'x'.repeat(129) }).success).toBe(false);
    expect(StaffLoginBody.safeParse({ email: 'a@b.test', password: 'x', role: 'HOSPITAL_CFO' }).success).toBe(false);
  });

  it('never accepts card numbers', () => {
    const base = { amountCents: 100, rail: 'CARD', payerName: 'Juan', cardBrand: 'VISA', cardLast4: '4242' };
    expect(PatientPaymentBody.safeParse(base).success).toBe(true);
    expect(PatientPaymentBody.safeParse({ ...base, cardNumber: '4242424242424242' }).success).toBe(false);
    expect(PatientPaymentBody.safeParse({ ...base, cardLast4: undefined }).success).toBe(false);
  });

  it('requires explicit consent on promissory notes', () => {
    const note = {
      borrowerName: 'Juan Dela Cruz',
      relationship: 'SELF',
      idType: 'PASSPORT',
      idNumber: 'P1234567A',
      months: 6,
      principalCents: 100_000,
      acceptTerms: true,
    };
    expect(PromissoryBody.safeParse(note).success).toBe(true);
    expect(PromissoryBody.safeParse({ ...note, acceptTerms: false }).success).toBe(false);
    expect(PromissoryBody.safeParse({ ...note, months: 5 }).success).toBe(false);
  });
});
