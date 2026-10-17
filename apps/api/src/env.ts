import { z } from 'zod';

/**
 * Typed, validated configuration. Read once at startup; the app refuses to boot
 * with a missing or weak secret. Every unset environment is treated as production.
 */
const bool = (fallback: boolean) =>
  z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((v) => (v === undefined ? fallback : v === 'true' || v === '1'));

const origin = z
  .string()
  .trim()
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.origin === v && (u.protocol === 'https:' || u.protocol === 'http:');
    } catch {
      return false;
    }
  }, 'must be a bare origin like https://app.example.org');

const base64Key = z.string().refine((v) => {
  try {
    return atob(v).length === 32;
  } catch {
    return false;
  }
}, 'must be 32 random bytes, base64-encoded (openssl rand -base64 32)');

const RawEnv = z.object({
  APP_ENV: z.enum(['production', 'development', 'test']).default('production'),
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, 'must be a postgres:// URL'),
  ALLOWED_ORIGINS: z
    .string()
    .default('')
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    )
    .pipe(z.array(origin)),
  PUBLIC_APP_URL: origin.optional(),
  GATE_PASS_SECRET: z.string().min(32, 'must be at least 32 characters (openssl rand -hex 32)'),
  DATA_ENCRYPTION_KEY: base64Key,
  STAFF_MFA_REQUIRED: bool(true),
  PATIENT_ONLINE_PAYMENTS: z.enum(['disabled', 'simulated']).default('disabled'),
  PATIENT_ONLINE_PROMISSORY: bool(false),
  MAIL_TRANSPORT: z.enum(['smtp', 'console']).default('smtp'),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(465),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  MAIL_FROM_NAME: z.string().max(64).default('MedCore'),
  PASSWORD_PBKDF2_ITERATIONS: z.coerce.number().int().min(100_000).max(2_000_000).default(600_000),
  TRUST_PROXY: z.enum(['none', 'cloudflare', 'x-forwarded-for']).default('none'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  GEMINI_BACKUP_MODEL: z.string().default('gemini-2.5-flash-lite'),
  GEMINI_PRO_MODEL: z.string().default('gemini-2.5-pro'),
});

export type AppEnv = 'production' | 'development' | 'test';

export interface AiConfig {
  enabled: boolean;
  apiKey: string | null;
  model: string;
  backupModel: string;
  proModel: string;
}

export interface Config {
  env: AppEnv;
  isProduction: boolean;
  databaseUrl: string;
  allowedOrigins: string[];
  publicAppUrl: string;
  gatePassSecret: string;
  dataEncryptionKey: Uint8Array;
  staffMfaRequired: boolean;
  patientOnlinePayments: 'disabled' | 'simulated';
  patientOnlinePromissory: boolean;
  mail:
    | { transport: 'console' }
    | {
        transport: 'smtp';
        host: string;
        port: number;
        user: string;
        password: string;
        from: string;
        fromName: string;
      };
  pbkdf2Iterations: number;
  trustProxy: 'none' | 'cloudflare' | 'x-forwarded-for';
  host: string;
  port: number;
  cookies: { staff: string; patient: string; secure: boolean };
  ai: AiConfig;
}

export class ConfigError extends Error {
  override name = 'ConfigError';
}

export function loadConfig(source: Record<string, string | undefined>): Config {
  const parsed = RawEnv.safeParse(source);
  if (!parsed.success) {
    // Name the variable and the rule, never the value.
    const problems = parsed.error.issues.map((i) => `${i.path.join('.') || 'env'}: ${i.message}`);
    throw new ConfigError(`Invalid configuration:\n  ${problems.join('\n  ')}`);
  }
  const e = parsed.data;
  const isProduction = e.APP_ENV === 'production';
  const problems: string[] = [];

  if (isProduction) {
    if (e.MAIL_TRANSPORT === 'console')
      problems.push('MAIL_TRANSPORT=console is only allowed outside production');
    if (!e.PUBLIC_APP_URL?.startsWith('https://'))
      problems.push('PUBLIC_APP_URL must be an https:// origin in production');
    for (const o of e.ALLOWED_ORIGINS) {
      if (!o.startsWith('https://')) problems.push(`ALLOWED_ORIGINS entry ${o} must use https in production`);
    }
    if (!e.STAFF_MFA_REQUIRED) problems.push('STAFF_MFA_REQUIRED cannot be disabled in production');
  }
  if (e.MAIL_TRANSPORT === 'smtp' && (!e.SMTP_USER || !e.SMTP_PASSWORD)) {
    problems.push('SMTP_USER and SMTP_PASSWORD are required when MAIL_TRANSPORT=smtp');
  }
  if (e.GATE_PASS_SECRET === e.DATA_ENCRYPTION_KEY)
    problems.push('GATE_PASS_SECRET and DATA_ENCRYPTION_KEY must differ');
  if (problems.length) throw new ConfigError(`Invalid configuration:\n  ${problems.join('\n  ')}`);

  const publicAppUrl = e.PUBLIC_APP_URL ?? e.ALLOWED_ORIGINS[0] ?? 'http://localhost:5173';
  const rawApiKey = e.GEMINI_API_KEY?.trim() ?? '';
  const hasValidApiKey =
    rawApiKey.length >= 20 &&
    !['your_api_key_here', 'placeholder', 'none', 'disabled'].includes(rawApiKey.toLowerCase());

  return {
    env: e.APP_ENV,
    isProduction,
    databaseUrl: e.DATABASE_URL,
    allowedOrigins: e.ALLOWED_ORIGINS.length ? e.ALLOWED_ORIGINS : [publicAppUrl],
    publicAppUrl,
    gatePassSecret: e.GATE_PASS_SECRET,
    dataEncryptionKey: Uint8Array.from(atob(e.DATA_ENCRYPTION_KEY), (ch) => ch.charCodeAt(0)),
    staffMfaRequired: e.STAFF_MFA_REQUIRED,
    patientOnlinePayments: e.PATIENT_ONLINE_PAYMENTS,
    patientOnlinePromissory: e.PATIENT_ONLINE_PROMISSORY,
    mail:
      e.MAIL_TRANSPORT === 'console'
        ? { transport: 'console' }
        : {
            transport: 'smtp',
            host: e.SMTP_HOST,
            port: e.SMTP_PORT,
            user: e.SMTP_USER!,
            password: e.SMTP_PASSWORD!.replace(/\s+/g, ''), // Gmail shows App Passwords in groups of four
            from: e.MAIL_FROM ?? e.SMTP_USER!,
            fromName: e.MAIL_FROM_NAME,
          },
    pbkdf2Iterations: e.PASSWORD_PBKDF2_ITERATIONS,
    trustProxy: e.TRUST_PROXY,
    host: e.HOST,
    port: e.PORT,
    // __Host- cookies must be Secure, path=/, host-only. Plain http dev servers cannot use them.
    cookies: isProduction
      ? { staff: '__Host-mc_staff', patient: '__Host-mc_patient', secure: true }
      : { staff: 'mc_staff', patient: 'mc_patient', secure: false },
    ai: {
      enabled: hasValidApiKey,
      apiKey: hasValidApiKey ? rawApiKey : null,
      model: e.GEMINI_MODEL.trim() || 'gemini-2.5-flash',
      backupModel: e.GEMINI_BACKUP_MODEL.trim() || 'gemini-2.5-flash-lite',
      proModel: e.GEMINI_PRO_MODEL.trim() || 'gemini-2.5-pro',
    },
  };
}
