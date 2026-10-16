/**
 * Outbound email over SMTP with implicit TLS (port 465), dependency-free so it
 * runs on Node (node:tls) and Workers (cloudflare:sockets) through the same code.
 *
 * Injection defenses: addresses are validated against a strict pattern, header
 * values may not contain CR/LF, non-ASCII headers use RFC 2047, and the body is
 * base64-encoded so no line can ever start with "." or exceed SMTP limits.
 */
import type { Logger } from '../lib/log';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

export class MailError extends Error {
  override name = 'MailError';
}

/** A byte stream to an SMTP server. Implemented per runtime. */
export interface SmtpSocket {
  write(data: string): Promise<void>;
  /** Resolves with the next chunk of server output, or null at end of stream. */
  read(): Promise<string | null>;
  close(): Promise<void>;
}

export type OpenSocket = (host: string, port: number) => Promise<SmtpSocket>;

const SAFE_ADDRESS = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,253}\.[A-Za-z]{2,63}$/;

export function assertSafeAddress(address: string): void {
  if (!SAFE_ADDRESS.test(address)) throw new MailError('Unsafe or invalid email address.');
}

export function assertSafeHeader(value: string): void {
  if (/[\r\n]/.test(value)) throw new MailError('Header values cannot contain line breaks.');
}

export function encodeHeader(value: string): string {
  assertSafeHeader(value);
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

export function base64Body(text: string): string {
  const bytes = new TextEncoder().encode(text.replace(/\r?\n/g, '\r\n'));
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return (btoa(binary).match(/.{1,76}/g) ?? []).join('\r\n');
}

/** RFC 5321 transparency: a line that starts with "." gets another ".". */
export function dotStuff(data: string): string {
  return data.replace(/(^|\r\n)\./g, '$1..');
}

export function buildMessage(
  from: { address: string; name: string },
  message: MailMessage,
  now: Date,
): string {
  assertSafeAddress(from.address);
  assertSafeAddress(message.to);
  const domain = from.address.split('@')[1]!;
  const id = `${crypto.randomUUID()}@${domain}`;
  const headers = [
    `From: ${encodeHeader(from.name)} <${from.address}>`,
    `To: <${message.to}>`,
    `Subject: ${encodeHeader(message.subject)}`,
    `Date: ${now.toUTCString()}`,
    `Message-ID: <${id}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    'Auto-Submitted: auto-generated',
  ];
  return `${headers.join('\r\n')}\r\n\r\n${base64Body(message.text)}`;
}

class SmtpSession {
  private buffer = '';
  constructor(
    private readonly socket: SmtpSocket,
    private readonly timeoutMs: number,
  ) {}

  private async nextLine(): Promise<string> {
    const deadline = Date.now() + this.timeoutMs;
    for (;;) {
      const index = this.buffer.indexOf('\r\n');
      if (index >= 0) {
        const line = this.buffer.slice(0, index);
        this.buffer = this.buffer.slice(index + 2);
        return line;
      }
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new MailError('SMTP server timed out.');
      let timer: ReturnType<typeof setTimeout> | undefined;
      const chunk = await Promise.race([
        this.socket.read(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new MailError('SMTP server timed out.')), remaining);
        }),
      ]).finally(() => clearTimeout(timer));
      if (chunk === null) throw new MailError('SMTP connection closed unexpectedly.');
      this.buffer += chunk;
      if (this.buffer.length > 64_000) throw new MailError('SMTP response too large.');
    }
  }

  /** Read a (possibly multi-line) reply and require one of the expected codes. */
  async expect(...codes: number[]): Promise<void> {
    let line: string;
    do {
      line = await this.nextLine();
    } while (line.length >= 4 && line[3] === '-');
    const code = Number(line.slice(0, 3));
    if (!codes.includes(code)) throw new MailError(`SMTP server replied ${code}.`);
  }

  async command(line: string, ...codes: number[]): Promise<void> {
    await this.socket.write(`${line}\r\n`);
    await this.expect(...codes);
  }
}

export interface SmtpOptions {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
  fromName: string;
  openSocket: OpenSocket;
  timeoutMs?: number;
  logger: Logger;
}

export function createSmtpMailer(options: SmtpOptions): Mailer {
  assertSafeAddress(options.from);
  return {
    async send(message) {
      const payload = buildMessage({ address: options.from, name: options.fromName }, message, new Date());
      const socket = await options.openSocket(options.host, options.port);
      const session = new SmtpSession(socket, options.timeoutMs ?? 15_000);
      try {
        await session.expect(220);
        await session.command('EHLO medcore.local', 250);
        const auth = btoa(`\u0000${options.user}\u0000${options.password}`);
        await session.command(`AUTH PLAIN ${auth}`, 235);
        await session.command(`MAIL FROM:<${options.from}>`, 250);
        await session.command(`RCPT TO:<${message.to}>`, 250, 251);
        await session.command('DATA', 354);
        await session.command(`${dotStuff(payload)}\r\n.`, 250);
        await session.command('QUIT', 221).catch(() => undefined);
      } catch (err) {
        // Log the failure class only, never the recipient or credentials.
        options.logger.log('error', 'smtp send failed', {
          error: err instanceof Error ? err.message : 'unknown',
        });
        throw err instanceof MailError ? err : new MailError('Email could not be sent.');
      } finally {
        await socket.close().catch(() => undefined);
      }
    },
  };
}

/** Development only (refused in production by config): prints the message to the API log. */
export function createConsoleMailer(): Mailer {
  return {
    async send(message) {
      assertSafeAddress(message.to);
      console.warn(`\n[dev mail] to=${message.to}\nsubject: ${message.subject}\n\n${message.text}\n`);
    },
  };
}

/** Test mailer: records messages instead of sending them. */
export function createMemoryMailer(): Mailer & { sent: MailMessage[]; failNext: boolean } {
  const mailer = {
    sent: [] as MailMessage[],
    failNext: false,
    async send(message: MailMessage) {
      assertSafeAddress(message.to);
      if (mailer.failNext) {
        mailer.failNext = false;
        throw new MailError('Simulated failure.');
      }
      mailer.sent.push(message);
    },
  };
  return mailer;
}
