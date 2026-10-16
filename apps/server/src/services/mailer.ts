/**
 * Minimal SMTP client for transactional email (patient sign-in codes), sent through a Gmail
 * account with an App Password over implicit TLS (smtp.gmail.com:465). Ported from AdvanCare
 * `backend/src/lib/mailer.ts`. No dependency: EHLO → AUTH PLAIN → MAIL FROM → RCPT TO → DATA → QUIT.
 *
 * MedCore also runs on Node (`standalone.ts`), where `cloudflare:sockets` does not exist, so the
 * socket module is loaded lazily: `cloudflare:sockets` on Workers, `node:tls` elsewhere.
 *
 * In local development without SMTP settings the message is logged instead of sent, so sign-in
 * can be tested for free. Outside development, missing settings are an error (never logged).
 */
export interface Mail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface MailEnv {
  NODE_ENV?: string;
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  MAIL_FROM?: string;
  MAIL_FROM_NAME?: string;
}

export class MailError extends Error {
  constructor(public status: 422 | 502 | 503, public code: string, message: string) {
    super(message);
    this.name = 'MailError';
  }
}

interface MailSocket {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
  close: () => Promise<void>;
}

const TIMEOUT_MS = 15_000;
const SAFE_ADDRESS = /^[^\s<>"'\r\n,;]+@[^\s<>"'\r\n,;]+\.[^\s<>"'\r\n,;]+$/;

export function mailConfigured(env: Pick<MailEnv, 'SMTP_USER' | 'SMTP_PASSWORD'>): boolean {
  return !!env.SMTP_USER && !!env.SMTP_PASSWORD;
}

export function isSafeAddress(address: string): boolean {
  return SAFE_ADDRESS.test(address);
}

export async function sendMail(env: MailEnv, mail: Mail): Promise<'sent' | 'logged'> {
  if (!SAFE_ADDRESS.test(mail.to)) throw new MailError(422, 'VALIDATION_FAILED', 'Enter a valid email address.');
  if (!mailConfigured(env)) {
    if (env.NODE_ENV === 'development') {
      console.log(JSON.stringify({ devMail: { to: mail.to, subject: mail.subject, text: mail.text } }));
      return 'logged';
    }
    console.error(JSON.stringify({ level: 'error', message: 'SMTP_USER / SMTP_PASSWORD not configured' }));
    throw new MailError(503, 'EMAIL_UNAVAILABLE', 'We can’t send email right now. Please try again later.');
  }
  const from = env.MAIL_FROM || env.SMTP_USER!;
  const message = buildMessage({ from, fromName: env.MAIL_FROM_NAME || 'MedCore', ...mail });
  try {
    await withTimeout(smtpSend(env, from, mail.to, message), TIMEOUT_MS);
    return 'sent';
  } catch (err) {
    // SMTP replies can echo addresses; log the code and first line only.
    console.error(JSON.stringify({ level: 'error', smtp: (err as Error).message.slice(0, 160) }));
    throw new MailError(502, 'EMAIL_FAILED', 'We couldn’t send the email. Please try again in a minute.');
  }
}

async function openSocket(hostname: string, port: number): Promise<MailSocket> {
  if (typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers') {
    const { connect } = await import('cloudflare:sockets');
    const socket = connect({ hostname, port }, { secureTransport: 'on', allowHalfOpen: false });
    return { readable: socket.readable, writable: socket.writable, close: () => socket.close() };
  }
  const [{ connect }, { Duplex }] = await Promise.all([import('node:tls'), import('node:stream')]);
  const tls = connect({ host: hostname, port, servername: hostname });
  await new Promise<void>((resolve, reject) => {
    tls.once('secureConnect', () => resolve());
    tls.once('error', reject);
  });
  const web = Duplex.toWeb(tls) as unknown as { readable: ReadableStream<Uint8Array>; writable: WritableStream<Uint8Array> };
  return { ...web, close: async () => { tls.destroy(); } };
}

async function smtpSend(env: MailEnv, from: string, to: string, message: string): Promise<void> {
  const socket = await openSocket(env.SMTP_HOST || 'smtp.gmail.com', Number(env.SMTP_PORT || 465));
  const writer = socket.writable.getWriter();
  const reader = socket.readable.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = '';

  /** Reads one (possibly multi-line) reply and checks its code. */
  const reply = async (expect: number): Promise<string> => {
    for (;;) {
      const lines = buffer.split('\r\n');
      const done = lines.findIndex((l) => /^\d{3} /.test(l));
      if (done >= 0) {
        const last = lines[done]!;
        buffer = lines.slice(done + 1).join('\r\n');
        const code = Number(last.slice(0, 3));
        if (code !== expect) throw new Error(`SMTP ${code}: ${last.slice(4)}`);
        return last;
      }
      const { value, done: closed } = await reader.read();
      if (closed) throw new Error('SMTP connection closed');
      buffer += decoder.decode(value, { stream: true });
    }
  };
  const send = (line: string) => writer.write(encoder.encode(`${line}\r\n`));

  try {
    await reply(220);
    await send('EHLO medcore.app');
    await reply(250);
    await send(`AUTH PLAIN ${btoa(`\0${env.SMTP_USER}\0${env.SMTP_PASSWORD}`)}`);
    await reply(235);
    await send(`MAIL FROM:<${from}>`);
    await reply(250);
    await send(`RCPT TO:<${to}>`);
    await reply(250);
    await send('DATA');
    await reply(354);
    await writer.write(encoder.encode(`${dotStuff(message)}\r\n.\r\n`));
    await reply(250);
    await send('QUIT');
  } finally {
    await socket.close().catch(() => undefined);
  }
}

/** Lines starting with "." get an extra "." (RFC 5321 §4.5.2). */
export function dotStuff(message: string): string {
  return message.replace(/(^|\r\n)\./g, '$1..');
}

function b64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

const wrap76 = (s: string) => s.replace(/.{1,76}/g, '$&\r\n').trimEnd();
const encodeHeader = (v: string) => (/^[\x20-\x7e]*$/.test(v) ? v : `=?UTF-8?B?${b64Utf8(v)}?=`);

/** RFC 5322 message: multipart/alternative (text + optional HTML), bodies base64 so UTF-8 is safe. */
export function buildMessage(m: { from: string; fromName: string; to: string; subject: string; text: string; html?: string }): string {
  for (const v of [m.from, m.to, m.subject, m.fromName]) {
    if (/[\r\n]/.test(v)) throw new Error('Header injection blocked');
  }
  const boundary = `mc-${crypto.randomUUID()}`;
  const headers = [
    `From: ${encodeHeader(m.fromName)} <${m.from}>`,
    `To: <${m.to}>`,
    `Subject: ${encodeHeader(m.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@medcore.app>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  const part = (type: string, body: string) => [`--${boundary}`, `Content-Type: ${type}; charset=UTF-8`, 'Content-Transfer-Encoding: base64', '', wrap76(b64Utf8(body))].join('\r\n');
  const parts = [part('text/plain', m.text), ...(m.html ? [part('text/html', m.html)] : []), `--${boundary}--`];
  return [...headers, '', ...parts].join('\r\n');
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    p.finally(() => clearTimeout(timer)),
    new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error('SMTP timeout')), ms); }),
  ]);
}
