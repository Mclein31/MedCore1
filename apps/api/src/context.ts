import type { StaffRole } from '@medcore/domain';
import type { Context } from 'hono';
import type { Database } from './db/client';
import type { Config } from './env';
import type { FieldCipher } from './lib/crypto';
import type { Logger } from './lib/log';
import type { Mailer } from './services/mailer';

export interface DatabaseLease {
  db: Database;
  release(): Promise<void>;
}

/** Node shares one pool; Workers open a client per request (Hyperdrive pools for us). */
export interface DatabaseProvider {
  acquire(): Promise<DatabaseLease>;
}

export interface Services {
  config: Config;
  logger: Logger;
  mailer: Mailer;
  cipher: FieldCipher;
  database: DatabaseProvider;
  /** Injectable clock so tests can move time (session idle, code expiry, TOTP). */
  now(): Date;
}

export interface StaffPrincipal {
  kind: 'STAFF';
  id: string;
  facilityId: string;
  role: StaffRole;
  email: string;
  fullName: string;
  sessionId: string;
}

export interface PatientPrincipal {
  kind: 'PATIENT';
  accountId: string;
  facilityId: string;
  email: string;
  sessionId: string;
}

export interface AppBindings {
  Variables: {
    services: Services;
    db: Database;
    requestId: string;
    ip: string | null;
    userAgent: string | null;
    staff: StaffPrincipal;
    patient: PatientPrincipal;
    /**
     * Run work after the response (email delivery). Keeps response timing
     * independent of whether an email was sent, which prevents account probing.
     */
    defer: (task: Promise<unknown>) => void;
  };
}

export type AppContext = Context<AppBindings>;
