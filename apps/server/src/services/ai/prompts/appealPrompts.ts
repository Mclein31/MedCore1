import { z } from 'zod';

export const HmoAppealResponseSchema = z.object({
  referenceNumber: z.string().describe('Unique dispute appeal identifier, e.g. APL-SJMC-2026-0812.'),
  appealLetterMarkdown: z.string().describe('The complete formal medico-legal appeal letter formatted in pristine markdown with letterhead and signature block.'),
  citationsApplied: z.array(z.string()).describe('List of statutory acts, Insurance Commission circulars, and medical society guidelines cited.'),
  attendingPhysicianName: z.string(),
  doctorPan: z.string(),
  reconsiderationDeadline: z.string().describe('ISO timestamp representing 48-hour response window.'),
  suggestedAttachments: z.array(z.string()).describe('List of required clinical records to attach to the appeal packet.')
});

export type HmoAppealResponse = z.infer<typeof HmoAppealResponseSchema>;

export const APPEAL_SYSTEM_PROMPT = `You draft HMO reconsideration letters using only the supplied encounter and dispute facts.
Never invent surgery, consumables, physician orders, laboratory results, policy clauses, addresses, credentials, or medical necessity evidence.
The denied items may be any charge category. Address only those supplied. State when evidence or the insurer's denial reason is unavailable and request review of the applicable policy.
Use supplied patient/physician tokens verbatim. Do not copy facts from any other case.
Copy referenceNumber and reconsiderationDeadline from the supplied documentation exactly into the JSON response. Include that same referenceNumber in the letter.
A requested 48-hour response window is a request, not a statutory deadline. Include citations only when supported by supplied documentation; otherwise return an empty citationsApplied array.
Return the required JSON with a formal markdown letter, signature block and relevant suggested attachments.`;

export function buildHmoAppealPrompt(
  encounterId: string,
  patientPseudonym: string,
  attendingDoctor: string,
  doctorPan: string,
  hmoProvider: string,
  deniedItem: string,
  deniedAmount: number,
  denialReason: string,
  primaryDiagnosis: string,
  clinicalJustificationNotes: string
): string {
  return `Draft an authoritative, medico-legal HMO Medical Necessity Appeal letter:

=== CASE IDENTIFIERS ===
Encounter Reference: ${encounterId}
Patient Pseudonym: ${patientPseudonym}
Attending Physician: ${attendingDoctor} (PAN: ${doctorPan})
Target HMO Provider: ${hmoProvider}

=== DISPUTE PARTICULARS ===
Disallowed Item / Fee: ${deniedItem}
Disallowed Amount: ₱${deniedAmount.toFixed(2)}
HMO Denial Reason: ${denialReason}

=== CLINICAL PROFILE & JUSTIFICATION ===
Primary Inpatient Diagnosis: ${primaryDiagnosis}
Available encounter documentation:
${clinicalJustificationNotes}

Use only the facts above. Where evidence is missing, request verification rather than asserting it exists. Return valid JSON adhering to HmoAppealResponseSchema.`;
}
