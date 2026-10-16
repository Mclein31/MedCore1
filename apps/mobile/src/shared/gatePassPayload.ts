export function gatePassPayload(pass: {
  passNumber: string;
  status: string;
  exitPin?: string | null;
}): string | null {
  // v2: the QR carries only the pass number; the guard asks for the 6-digit PIN.
  if (pass.status !== 'ACTIVE_READY_FOR_EXIT' || !/^\d{6}$/.test(pass.exitPin || '')) return null;
  return pass.passNumber;
}
