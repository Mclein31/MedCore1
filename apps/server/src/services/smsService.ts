import { randomInt } from 'node:crypto';
import type { SmsDispatchResult, SmsTemplateType } from '../../../shared/sms';
export type { SmsDispatchResult } from '../../../shared/sms';

export interface SmsDispatchOptions {
  recipientPhone: string;
  recipientName: string;
  templateType: SmsTemplateType;
  encounterNumber: string;
  patientName?: string;
  roomBed?: string;
  doctorName?: string;
  passNumber?: string;
  facilityName?: string;
  language?: 'tl' | 'en';
  settlementKind?: 'PAYMENT' | 'PROMISSORY_NOTE';
  forbiddenClinicalTerms?: string[];
  env?: Record<string, unknown>;
  recordInMemory?: boolean;
}

export class SmsError extends Error {
  constructor(public code: string, message: string, public status: 400 | 404 | 409 | 500 | 503 = 400) {
    super(message);
    this.name = 'SmsError';
  }
}

export function normalizePhPhoneNumber(raw: string): string {
  if (typeof raw !== 'string' || !raw.trim() || !/^[+\d\s()-]+$/.test(raw)) {
    throw new SmsError('SMS_INVALID_PHONE', 'Enter a valid Philippine mobile number, such as 09171234567.');
  }
  const compact = raw.replace(/[\s()-]/g, '');
  if (!/^(?:\+?63|0)9\d{9}$/.test(compact)) {
    throw new SmsError('SMS_INVALID_PHONE', 'A Philippine mobile number must begin with 09 or +639 and have the correct length.');
  }
  return compact.startsWith('0') ? `+63${compact.slice(1)}` : `+${compact.replace(/^\+/, '')}`;
}

// Do not accept arbitrary message bodies: all content comes from this allowlisted template builder.
export function assertSmsInvariants(body: string, forbiddenClinicalTerms: string[] = []): void {
  const normalized = body.normalize('NFKC');
  if (/https?\s*:\s*\/\/|www\s*\.|\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.[a-z]{2,}(?:\b|\/)|(?:mailto|tel):/i.test(normalized)) {
    throw new SmsError('SMS_LINK_INVARIANT', 'SMS templates must contain no URLs, domains or clickable links.');
  }
  const identifiers = normalized.replace(/\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/gi, '[OPAQUE_REFERENCE]');
  if (/\b\d{2}[ -]?\d{9}[ -]?\d\b|\b[A-TV-Z]\d{2}(?:\.[A-Z0-9]{1,4})?\b|\b(?:ICD[- ]?10|RVS)\b/i.test(identifiers)) {
    throw new SmsError('SMS_PRIVACY_INVARIANT', 'Clinical codes and unmasked PhilHealth identifiers are not allowed in SMS.');
  }
  for (const term of forbiddenClinicalTerms.filter(term => term.trim().length >= 3)) {
    const escaped = term.trim().normalize('NFKC').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'iu').test(normalized)) {
      throw new SmsError('SMS_PRIVACY_INVARIANT', 'Clinical details are not allowed in SMS.');
    }
  }
  if (/[\p{Cc}\p{Cf}]/u.test(normalized) || normalized.length > 640) {
    throw new SmsError('SMS_TEMPLATE_INVALID', 'SMS template contains unsupported characters or is too long.');
  }
}

function field(value: string | undefined, label: string, max: number): string {
  const text = value?.normalize('NFKC').trim();
  if (!text || text.length > max || /[\p{Cc}\p{Cf}]/u.test(text)) throw new SmsError('SMS_TEMPLATE_INVALID', `A valid ${label} is required for this SMS template.`);
  return text;
}

export function buildSmsBody(options: SmsDispatchOptions): string {
  const reference = field(options.encounterNumber, 'encounter reference', 64);
  const patient = field(options.patientName || options.recipientName, 'patient name', 128);
  const tagalog = options.language === 'tl';
  let body: string;
  switch (options.templateType) {
    case 'BILL_READY': {
      const room = field(options.roomBed, 'room or bed', 48);
      body = tagalog
        ? `MEDCORE NOTICE: Magandang araw ${patient}. Updated na po ang inyong hospital billing summary para sa ${room} (Ref: ${reference}), kasama ang mga nakatalang PhilHealth at statutory deductions. Suriin ito sa inyong MedCore portal o makipag-ugnayan sa billing cashier.`
        : `MEDCORE NOTICE: Good day ${patient}. Your hospital billing summary for ${room} (Ref: ${reference}) is updated with recorded PhilHealth and statutory deductions. Please review your MedCore portal or visit the hospital billing cashier.`;
      break;
    }
    case 'DOCTOR_PF_NUDGE': {
      const doctor = field(options.doctorName, 'attending physician name', 128).replace(/^Dr\.?\s+/i, '');
      const room = field(options.roomBed, 'room or bed', 48);
      body = `MEDCORE ALERT: Dr. ${doctor}, please confirm your Professional Fee for patient ${patient} (${room}, Ref: ${reference}) to proceed with discharge clearance.`;
      break;
    }
    case 'PAYMENT_CONFIRMED': {
      const pass = field(options.passNumber, 'Digital Gate Pass reference', 128);
      const financed = options.settlementKind === 'PROMISSORY_NOTE';
      body = tagalog
        ? `MEDCORE CLEARANCE: ${financed ? 'Naitala ang inyong aprubadong promissory arrangements' : 'Kumpirmado ang inyong settlement'} para sa Ref: ${reference}. Ang Digital Gate Pass (${pass}) ay aktibo para sa hospital exit inspection. Maraming salamat.`
        : `MEDCORE CLEARANCE: ${financed ? 'Your approved promissory arrangements are recorded' : 'Your settlement is confirmed'} for Ref: ${reference}. Digital Gate Pass ${pass} is active for hospital exit verification. Thank you.`;
      break;
    }
    case 'INTAKE_ORIENTATION': {
      const room = field(options.roomBed, 'room or bed', 48);
      body = tagalog
        ? `MEDCORE INTAKE: Magandang araw ${patient}, naitala ang inyong admission record para sa ${room} (Ref: ${reference}). Ihanda ang inyong PhilHealth at valid IDs at makipag-ugnayan sa hospital billing desk.`
        : `MEDCORE INTAKE: Good day ${patient}. Your admission record for ${room} (Ref: ${reference}) is recorded. Please prepare your PhilHealth and valid IDs and contact the hospital billing desk.`;
      break;
    }
    default: throw new SmsError('SMS_TEMPLATE_INVALID', 'Choose a supported SMS template.');
  }
  assertSmsInvariants(body, options.forbiddenClinicalTerms);
  return body;
}

export const smsOutbox: SmsDispatchResult[] = [];
export function recordSmsOutbox(result: SmsDispatchResult): void {
  smsOutbox.unshift(structuredClone(result));
  if (smsOutbox.length > 100) smsOutbox.length = 100;
}
export function getSmsOutbox(): SmsDispatchResult[] { return structuredClone(smsOutbox); }

// Sandbox is unconditional, including when an unrelated environment contains gateway keys.
// This service has no provider client or network call.
export async function sendSms(options: SmsDispatchOptions): Promise<SmsDispatchResult> {
  const recipientPhone = normalizePhPhoneNumber(options.recipientPhone);
  const messageBody = buildSmsBody(options);
  let messageId: string;
  do { messageId = `SMS-SIM-${randomInt(36 ** 6).toString(36).padStart(6, '0').toUpperCase()}`; }
  while (smsOutbox.some(message => message.messageId === messageId));
  const result: SmsDispatchResult = { success: true, messageId, simulated: true, isSimulated: true,
    recipientPhone, recipientName: options.recipientName, messageBody, timestamp: new Date().toISOString(),
    provider: 'SIMULATOR', deliveryStatus: 'SIMULATED', templateType: options.templateType };
  if (options.recordInMemory !== false) recordSmsOutbox(result);
  return result;
}
