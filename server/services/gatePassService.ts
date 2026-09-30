// Digital Gate Pass HMAC Service & Security Lobby Verification

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export async function generateGatePassHmac(
  encounterId: string,
  settledAmount: number,
  issuedAtIso: string,
  secretKey: string = 'aqromed_gate_pass_hmac_secret_2026_st_jude_manila'
): Promise<string> {
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

export function generateDeterministicExitPin(passNumberOrEncounterNumber: string): string {
  const digits = passNumberOrEncounterNumber.replace(/\D/g, '');
  if (digits.length >= 4) {
    return digits.slice(-4);
  }
  return '8812';
}
