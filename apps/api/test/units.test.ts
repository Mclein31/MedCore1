import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from '../src/env';
import { FieldCipher, randomInt, timingSafeEqual } from '../src/lib/crypto';
import { hashPassword, verifyPassword } from '../src/lib/password';
import { hotp, verifyTotp } from '../src/lib/totp';
import { buildMessage, dotStuff, encodeHeader, MailError } from '../src/services/mailer';
import { buildEsoaXml, xmlEscape } from '../src/services/esoa';

const goodEnv = {
  APP_ENV: 'production',
  DATABASE_URL: 'postgres://db.example/medcore',
  PUBLIC_APP_URL: 'https://medcore.example',
  ALLOWED_ORIGINS: 'https://medcore.example',
  GATE_PASS_SECRET: 'g'.repeat(64),
  DATA_ENCRYPTION_KEY: btoa('k'.repeat(32)),
  SMTP_USER: 'noreply@example.org',
  SMTP_PASSWORD: 'abcd efgh ijkl mnop',
};

describe('configuration', () => {
  it('defaults to production and hardens cookies', () => {
    const { APP_ENV: _omit, ...rest } = goodEnv;
    const config = loadConfig(rest);
    expect(config.isProduction).toBe(true);
    expect(config.cookies).toEqual({ staff: '__Host-mc_staff', patient: '__Host-mc_patient', secure: true });
    expect(config.mail.transport === 'smtp' && config.mail.password).toBe('abcdefghijklmnop');
  });

  it('refuses weak or unsafe production settings', () => {
    expect(() => loadConfig({ ...goodEnv, GATE_PASS_SECRET: 'short' })).toThrow(ConfigError);
    expect(() => loadConfig({ ...goodEnv, DATA_ENCRYPTION_KEY: 'not-base64-32-bytes' })).toThrow(ConfigError);
    expect(() => loadConfig({ ...goodEnv, MAIL_TRANSPORT: 'console' })).toThrow(/console/);
    expect(() => loadConfig({ ...goodEnv, STAFF_MFA_REQUIRED: 'false' })).toThrow(/MFA/);
    expect(() => loadConfig({ ...goodEnv, ALLOWED_ORIGINS: 'http://medcore.example' })).toThrow(/https/);
    expect(() => loadConfig({ ...goodEnv, SMTP_PASSWORD: '' })).toThrow(/SMTP/);
  });

  it('never echoes secret values in errors', () => {
    try {
      loadConfig({ ...goodEnv, GATE_PASS_SECRET: 'super-secret-value' });
    } catch (err) {
      expect(String(err)).not.toContain('super-secret-value');
    }
  });
});

describe('crypto', () => {
  it('compares in constant time and gets the answer right', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
    expect(timingSafeEqual('abc', 'abd')).toBe(false);
    expect(timingSafeEqual('ab', 'abc')).toBe(false);
    expect(timingSafeEqual('', 'a')).toBe(false);
  });

  it('draws uniform integers in range', () => {
    const counts = new Array(10).fill(0);
    for (let i = 0; i < 20_000; i++) counts[randomInt(10)]++;
    for (const n of counts) expect(n).toBeGreaterThan(1700);
  });

  it('binds ciphertext to its row and column', async () => {
    const cipher = new FieldCipher(new Uint8Array(32).fill(7));
    const sealed = await cipher.encrypt('1234-5678', 'patients.philhealth_pin:a');
    expect(await cipher.decrypt(sealed, 'patients.philhealth_pin:a')).toBe('1234-5678');
    await expect(cipher.decrypt(sealed, 'patients.philhealth_pin:b')).rejects.toThrow();
    const again = await cipher.encrypt('1234-5678', 'patients.philhealth_pin:a');
    expect(again).not.toBe(sealed); // random IV
  });

  it('hashes passwords with a stored, upgradable work factor', async () => {
    const stored = await hashPassword('a long passphrase', 100_000);
    expect(stored).toMatch(/^pbkdf2-sha256\$100000\$/);
    expect(await verifyPassword('a long passphrase', stored, 100_000)).toEqual({
      ok: true,
      needsRehash: false,
    });
    expect(await verifyPassword('a long passphrase', stored, 200_000)).toEqual({
      ok: true,
      needsRehash: true,
    });
    expect((await verifyPassword('wrong', stored, 100_000)).ok).toBe(false);
    expect((await verifyPassword('x', 'garbage', 100_000)).ok).toBe(false);
  });
});

describe('TOTP (RFC 6238 / 4226 test vectors)', () => {
  const secret = new TextEncoder().encode('12345678901234567890');
  it('matches the RFC 4226 HOTP values', async () => {
    const expected = ['755224', '287082', '359152', '969429', '338314'];
    for (let i = 0; i < expected.length; i++) expect(await hotp(secret, i)).toBe(expected[i]);
  });
  it('matches RFC 6238 at T=59s and rejects replays', async () => {
    const base32 = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
    const at = new Date(59_000);
    const step = await verifyTotp(base32, '287082', at, null);
    expect(step).toBe(1);
    expect(await verifyTotp(base32, '287082', at, step)).toBeNull();
    expect(await verifyTotp(base32, '000000', at, null)).toBeNull();
  });
});

describe('mailer', () => {
  const from = { address: 'noreply@example.org', name: 'MedCore' };
  it('refuses header injection through addresses and subjects', () => {
    expect(() =>
      buildMessage(from, { to: 'a@b.test\r\nBcc: x@y.test', subject: 'Hi', text: 'x' }, new Date()),
    ).toThrow(MailError);
    expect(() =>
      buildMessage(from, { to: 'a@b.test', subject: 'Hi\r\nBcc: x@y.test', text: 'x' }, new Date()),
    ).toThrow(MailError);
    expect(() => buildMessage(from, { to: '<a@b.test>', subject: 'Hi', text: 'x' }, new Date())).toThrow(
      MailError,
    );
  });
  it('encodes non-ASCII headers and base64 bodies', () => {
    expect(encodeHeader('Plain')).toBe('Plain');
    expect(encodeHeader('Bayad ₱')).toMatch(/^=\?UTF-8\?B\?.+\?=$/);
    const msg = buildMessage(from, { to: 'a@b.test', subject: 'Hi', text: '.\nline' }, new Date());
    expect(msg).toContain('Content-Transfer-Encoding: base64');
    expect(msg.split('\r\n\r\n')[1]).not.toMatch(/^\./m);
  });
  it('dot-stuffs lines that start with a period', () => {
    expect(dotStuff('.a\r\nb\r\n.c')).toBe('..a\r\nb\r\n..c');
  });
});

describe('eSOA XML', () => {
  it('escapes markup and strips control characters', () => {
    expect(xmlEscape('<a href="x">&\'\u0001')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&apos;');
  });
  it('refuses a statement whose items do not reconcile', () => {
    expect(() =>
      buildEsoaXml(
        {
          facility: { name: 'F', accreditation: 'A', tin: 'T', address: 'X' },
          patient: {
            fullName: 'P',
            philhealthPin: null,
            dateOfBirth: '1990-01-01',
            sex: 'F',
            discountKind: 'NONE',
          },
          encounter: {
            encounterNumber: 'E',
            billNumber: null,
            admittedAt: new Date(),
            clearedAt: null,
            icd10Code: 'A00',
            diagnosis: 'D',
          },
          claim: { claimNumber: 'C', caseRateCode: 'R', hciCents: 0, pfCents: 0 },
          physician: { fullName: 'Dr', prcLicense: null },
          charges: [
            {
              code: 'X',
              description: 'Y',
              category: 'PHARMACY',
              quantity: 1,
              unitPriceCents: 100,
              grossCents: 100,
              coverage: 'COVERED',
            },
          ],
          ledger: {
            grossCents: 999,
            vatExemptionCents: 0,
            seniorPwdDiscountCents: 0,
            philhealthCents: 0,
            hmoCents: 0,
            netPatientDueCents: 999,
          },
        },
        new Date(),
      ),
    ).toThrow(/reconcile/);
  });
});
