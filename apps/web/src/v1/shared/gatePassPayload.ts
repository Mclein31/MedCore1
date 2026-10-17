export function gatePassPayload(pass: { passNumber?: string; qrPayload?: string | null }): string {
  return pass.passNumber ?? '';
}
