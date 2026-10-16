/**
 * Structured JSON logs. Never log request bodies, query strings, tokens, codes,
 * passwords or patient identifiers; keys that look sensitive are redacted.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';

const SENSITIVE = /pass|secret|token|code|pin|authorization|cookie|email|phone|otp|card|mrn/i;

function redact(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = SENSITIVE.test(key) && key !== 'status' && key !== 'errorCode' ? '[redacted]' : value;
  }
  return out;
}

export interface Logger {
  log(level: Level, msg: string, fields?: Record<string, unknown>): void;
}

export function createLogger(minLevel: Level = 'info'): Logger {
  const order: Level[] = ['debug', 'info', 'warn', 'error'];
  const threshold = order.indexOf(minLevel);
  return {
    log(level, msg, fields = {}) {
      if (order.indexOf(level) < threshold) return;
      const line = JSON.stringify({ time: new Date().toISOString(), level, msg, ...redact(fields) });
      if (level === 'error' || level === 'warn') console.error(line);
      else console.warn(line);
    },
  };
}

/** Logger for tests: keeps lines in memory. */
export function createMemoryLogger(): Logger & {
  lines: { level: Level; msg: string; fields: Record<string, unknown> }[];
} {
  const lines: { level: Level; msg: string; fields: Record<string, unknown> }[] = [];
  return { lines, log: (level, msg, fields = {}) => lines.push({ level, msg, fields: redact(fields) }) };
}
