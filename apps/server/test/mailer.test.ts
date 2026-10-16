// Port of AdvanCare test/mailer.test.ts. No network: SMTP is blanked, so mail can never be sent.
import assert from 'node:assert/strict';
import { appPassword, buildMessage, dotStuff, isSafeAddress, MailError, sendMail } from '../src/services/mailer';
import { codeHash, decoyMask, generateCode, maskEmail, normalizePhone } from '../src/services/otp';

let checks = 0;
const pass = (name: string) => { checks++; console.log(`[PASS] ${name}`); };
const blank = { SMTP_USER: '', SMTP_PASSWORD: '' };

const msg = buildMessage({ from: 'medcore@gmail.com', fromName: 'MedCore', to: 'lola@example.ph', subject: '123456 is your MedCore code', text: 'Code: 123456 — salamat', html: '<p>123456</p>' });
assert.ok(msg.includes('From: MedCore <medcore@gmail.com>\r\n'));
assert.ok(msg.includes('To: <lola@example.ph>\r\n'));
assert.ok(msg.includes('Subject: 123456 is your MedCore code\r\n'));
assert.match(msg, /Content-Type: multipart\/alternative; boundary="mc-[0-9a-f-]{36}"/);
assert.ok(msg.includes('Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64'));
assert.ok(msg.includes('Content-Type: text/html; charset=UTF-8'));
assert.ok(!msg.includes('salamat'), 'body is base64');
pass('builds a multipart message with UTF-8-safe bodies');

assert.ok(buildMessage({ from: 'a@b.ph', fromName: 'MedCore', to: 'c@d.ph', subject: 'Kódigo', text: 'x' }).includes('Subject: =?UTF-8?B?'));
assert.ok(buildMessage({ from: 'a@b.ph', fromName: 'Ospital ng Maynila — MedCore', to: 'c@d.ph', subject: 's', text: 'x' }).includes('From: =?UTF-8?B?'));
pass('encodes non-ASCII subjects and sender names (RFC 2047)');

assert.throws(() => buildMessage({ from: 'a@b.ph', fromName: 'MedCore', to: 'c@d.ph\r\nBcc: x@evil.com', subject: 's', text: 'x' }), /injection/);
assert.throws(() => buildMessage({ from: 'a@b.ph', fromName: 'MedCore', to: 'c@d.ph', subject: 'hi\nBcc: x@evil.com', text: 'x' }), /injection/);
assert.throws(() => buildMessage({ from: 'a@b.ph', fromName: 'Med\rCore', to: 'c@d.ph', subject: 's', text: 'x' }), /injection/);
for (const bad of ['c@d.ph\r\nBcc: x@evil.com', 'a b@c.ph', '<a@b.ph>', 'a@b.ph,c@d.ph', 'a@b.ph;c@d.ph', 'no-at-sign', 'a@nodot']) assert.equal(isSafeAddress(bad), false, bad);
assert.equal(isSafeAddress('juan+demo@gmail.com'), true);
await assert.rejects(sendMail({ ...blank, NODE_ENV: 'development' }, { to: 'x@y.ph\r\nRCPT TO:<z@evil.com>', subject: 's', text: 't' }), (e: unknown) => e instanceof MailError && e.status === 422);
pass('blocks header injection in headers and SMTP envelope addresses');

assert.equal(dotStuff('.a\r\nb\r\n.c'), '..a\r\nb\r\n..c');
assert.equal(dotStuff('a.\r\n..b'), 'a.\r\n...b');
assert.equal(dotStuff('ok\r\n.\r\nafter'), 'ok\r\n..\r\nafter', 'a lone "." line cannot end DATA early');
pass('dot-stuffs lines that start with a period');

assert.equal(appPassword('abcd efgh ijkl mnop'), 'abcdefghijklmnop');
assert.equal(appPassword(' abcdefghijklmnop\n'), 'abcdefghijklmnop');
pass('App Passwords pasted with Google\'s spaces still authenticate');

const logged: string[] = [];
const log = console.log;
console.log = (line: string) => { logged.push(line); };
try {
  assert.equal(await sendMail({ ...blank, NODE_ENV: 'development' }, { to: 'lola@example.ph', subject: '123456 is your MedCore code', text: 'Code 123456' }), 'logged');
} finally { console.log = log; }
assert.equal(logged.length, 1);
assert.match(logged[0]!, /"devMail".*123456/);
pass('development without SMTP logs the message instead of sending');

const errors: string[] = [];
const error = console.error;
console.error = (line: string) => { errors.push(line); };
try {
  for (const NODE_ENV of ['production', 'test', undefined]) {
    await assert.rejects(sendMail({ ...blank, NODE_ENV }, { to: 'lola@example.ph', subject: '654321 is your MedCore code', text: 'Code 654321' }), (e: unknown) => e instanceof MailError && e.status === 503 && e.code === 'EMAIL_UNAVAILABLE');
  }
} finally { console.error = error; }
assert.ok(errors.every((line) => !line.includes('654321') && !line.includes('lola@')), 'outside development the code and address are never logged');
pass('outside development, missing SMTP is 503 EMAIL_UNAVAILABLE and nothing is logged');

const codes = Array.from({ length: 5000 }, generateCode);
for (const code of codes) assert.match(code, /^\d{6}$/);
assert.ok(new Set(codes).size > 4950);
const firstDigits = new Array(10).fill(0);
for (const code of codes) firstDigits[Number(code[0])]++;
for (const n of firstDigits) assert.ok(n > 380 && n < 620, `first digit count ${n} is outside the uniform range`);
pass('generates uniform 6-digit codes');

assert.notEqual(await codeHash('a@b.ph', 'LOGIN', '123456'), await codeHash('a@b.ph', 'REGISTER', '123456'));
assert.match(await codeHash('a@b.ph', 'LOGIN', '123456'), /^[0-9a-f]{64}$/);
assert.equal(maskEmail('juan.delacruz@gmail.com'), 'j***@gmail.com');
assert.equal(await decoyMask('x'), await decoyMask('x'));
assert.match(await decoyMask('y'), /^[a-z]\*\*\*@gmail\.com$/);
assert.equal(normalizePhone('+63 917 554 9281'), normalizePhone('0917-554-9281'));
pass('code hashes separate purposes; masks and phone matching are stable');

console.log(`MAILER_AND_OTP_UNIT_TESTS_PASSED (${checks} checks)`);
