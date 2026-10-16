/**
 * Cloudflare Workers entry. The database is reached through Hyperdrive, which
 * pools connections at the edge, so each request opens (and closes) its own
 * lightweight client instead of holding a pool inside the isolate.
 */
import pg from 'pg';
import { createApp } from './app';
import type { Services } from './context';
import { createDb } from './db/client';
import { loadConfig, type Config } from './env';
import { FieldCipher } from './lib/crypto';
import { createLogger } from './lib/log';
import { createSmtpMailer, type OpenSocket } from './services/mailer';
import { purgeExpired } from './services/retention';

interface Env {
  HYPERDRIVE: { connectionString: string };
  [key: string]: unknown;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

const openWorkerSocket: OpenSocket = async (host, port) => {
  const { connect } = await import('cloudflare:sockets');
  const socket = connect({ hostname: host, port }, { secureTransport: 'on', allowHalfOpen: false });
  const writer = socket.writable.getWriter();
  const reader = socket.readable.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  return {
    write: (data) => writer.write(encoder.encode(data)),
    read: async () => {
      const { value, done } = await reader.read();
      return done ? null : decoder.decode(value, { stream: true });
    },
    close: () => socket.close(),
  };
};

let cached: { config: Config; cipher: FieldCipher } | null = null;

function settings(env: Env) {
  if (!cached) {
    const strings = Object.fromEntries(Object.entries(env).filter(([, v]) => typeof v === 'string')) as Record<string, string>;
    const config = loadConfig({ ...strings, DATABASE_URL: env.HYPERDRIVE.connectionString, TRUST_PROXY: 'cloudflare' });
    cached = { config, cipher: new FieldCipher(config.dataEncryptionKey) };
  }
  return cached;
}

function services(env: Env, client: pg.Client): Services {
  const { config, cipher } = settings(env);
  const logger = createLogger('info');
  const db = createDb(client);
  if (config.mail.transport !== 'smtp') throw new Error('Workers deployments must use SMTP mail.');
  return {
    config,
    logger,
    cipher,
    mailer: createSmtpMailer({ ...config.mail, openSocket: openWorkerSocket, logger }),
    database: { acquire: async () => ({ db, release: async () => undefined }) },
    now: () => new Date(),
  };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const client = new pg.Client({ connectionString: env.HYPERDRIVE.connectionString });
    await client.connect();
    try {
      const app = createApp(services(env, client), { defer: (task) => ctx.waitUntil(task) });
      return await app.fetch(request);
    } finally {
      ctx.waitUntil(client.end());
    }
  },

  async scheduled(_event: unknown, env: Env, ctx: ExecutionContext): Promise<void> {
    const client = new pg.Client({ connectionString: env.HYPERDRIVE.connectionString });
    await client.connect();
    ctx.waitUntil(
      purgeExpired(createDb(client), new Date()).finally(() => client.end()),
    );
  },
};
