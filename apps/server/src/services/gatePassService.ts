// Digital Gate Pass HMAC Service & Security Lobby Verification

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Constant-time comparison for hex signatures to prevent timing side-channel attacks.
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Resolves the gate pass HMAC secret key from the Worker environment or fallback.
 * In production, it strictly enforces that a non-empty secret is provided.
 */
export function resolveGatePassSecret(
  customSecret?: string,
  isProduction: boolean = false
): string {
  const secret =
    customSecret ||
    (typeof process !== 'undefined' ? process.env.GATE_PASS_SECRET : undefined);

  if (secret && secret.trim().length > 0) {
    return secret.trim();
  }

  if (isProduction) {
    throw new Error(
      '[GatePass Security Error] GATE_PASS_SECRET is missing in production environment. Configure it via `wrangler secret put GATE_PASS_SECRET`.'
    );
  }

  // Explicit development-only fallback for offline testing and local seeding
  return 'medcore_dev_gate_pass_hmac_secret_2026_local';
}

export async function generateGatePassHmac(
  encounterId: string,
  settledAmount: number,
  issuedAtIso: string,
  secretKey: string
): Promise<string> {
  if (!secretKey || secretKey.trim().length === 0) {
    throw new Error(
      '[GatePass Security Error] Secret key is required to generate gate pass HMAC signature.'
    );
  }

  const enc = new TextEncoder();
  const keyData = enc.encode(secretKey);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const message = enc.encode(`${encounterId}:${settledAmount.toFixed(2)}:${issuedAtIso}`);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);
  return bytesToHex(new Uint8Array(signature));
}

// Domain-separated keyed HMAC. The public identifier cannot reveal the PIN.
export async function generateDeterministicExitPin(identifier: string, secretKey?: string): Promise<string> {
  if (!identifier) throw new Error('[GatePass Security Error] A pass identifier is required.');
  const production = typeof process !== 'undefined' && process.env.NODE_ENV === 'production';
  const secret = resolveGatePassSecret(secretKey, production);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const hash = await crypto.subtle.sign('HMAC', key, encoder.encode(`medcore-exit-pin:v1:${identifier}`));
  const value = new DataView(hash).getUint32(0, false);
  return String((value % 9000) + 1000);
}
