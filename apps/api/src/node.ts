import { serve } from '@hono/node-server';
import { getConnInfo } from '@hono/node-server/conninfo';
import { createApp } from './app';
import type { Services } from './context';
import { createDb, createPool } from './db/client';
import { ConfigError, loadConfig } from './env';
import { FieldCipher } from './lib/crypto';
import { createLogger } from './lib/log';
import { createConsoleMailer, createSmtpMailer } from './services/mailer';
import { purgeExpired } from './services/retention';
import { openNodeSocket } from './runtime/nodeSocket';

function main() {
  let config;
  try {
    config = loadConfig(process.env);
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }
  const logger = createLogger(config.env === 'development' ? 'info' : 'info');
  const pool = createPool(config.databaseUrl);
  const db = createDb(pool);
  const services: Services = {
    config,
    logger,
    cipher: new FieldCipher(config.dataEncryptionKey),
    mailer: config.mail.transport === 'console' ? createConsoleMailer() : createSmtpMailer({ ...config.mail, openSocket: openNodeSocket, logger }),
    database: { acquire: async () => ({ db, release: async () => undefined }) },
    now: () => new Date(),
  };
  const app = createApp(services, {
    peerAddress: (c) => {
      try {
        return getConnInfo(c).remote.address ?? null;
      } catch {
        return null;
      }
    },
  });

  const server = serve({ fetch: app.fetch, hostname: config.host, port: config.port }, (info) => {
    logger.log('info', 'MedCore API listening', { host: info.address, port: info.port, env: config.env });
  });

  const retention = setInterval(
    () => {
      purgeExpired(db, new Date())
        .then((counts) => logger.log('info', 'retention purge', counts))
        .catch((err: unknown) => logger.log('error', 'retention purge failed', { errorMessage: String(err) }));
    },
    60 * 60 * 1000,
  );
  retention.unref();

  const shutdown = (signal: string) => {
    logger.log('info', 'shutting down', { signal });
    server.close(() => {
      pool.end().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main();
