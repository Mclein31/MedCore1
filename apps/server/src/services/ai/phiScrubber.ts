/**
 * MedCore PHI De-Identification & Rehydration Engine
 * Statutory Compliance: RA 10173 (Philippine Data Privacy Act of 2012)
 * National Privacy Commission (NPC) Circulars 16-01, 16-03, 2022-04
 */

export interface PatientScrubContext {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  mrn?: string;
  philhealthPin?: string;
  contactNumber?: string;
  roomBed?: string;
  encounterNumber?: string;
  seniorCitizenId?: string;
  pwdId?: string;
  doctorName?: string;
  doctorPan?: string;
  prcLicense?: string;
  claimNumber?: string;
  hmoCardMasked?: string;
  loaNumber?: string;
  hmoApprovalCode?: string;
  hmoAdjusterName?: string;
  borrowerName?: string;
  borrowerIdNumber?: string;
}

export interface ScrubbedPayload {
  scrubbedText: string;
  tokenMap: Map<string, string>;
}

export interface PhiRegexRule {
  category: string;
  pattern: RegExp;
  tokenPrefix: string;
}

export const PHI_REGEX_RULES: PhiRegexRule[] = [
  // 1. PhilHealth Identification Number (PIN): 12 digits, often 2-9-1 formatted
  {
    category: 'PHILHEALTH_PIN',
    pattern: /\b\d{2}[-–]?\d{9}[-–]?\d{1}\b/g,
    tokenPrefix: 'PHILHEALTH_PIN_MASKED'
  },
  // 2. Philippine Mobile Phone Numbers (+639xxxxxxxxx or 09xxxxxxxxx)
  {
    category: 'PHONE_NUMBER',
    pattern: /(?:\+?63|0)9(?:\d{2}[-\s]?\d{3}[-\s]?\d{4}|\d{9})\b/g,
    tokenPrefix: 'PHONE_MASKED'
  },
  // 3. Philippine Landline / Regional Phone Numbers (e.g., (02) 8888-1234)
  {
    category: 'LANDLINE',
    pattern: /(?:\+?63[-\s]?|0)(?:2|[3-8]\d)[-\s]?\d{3,4}[-\s]?\d{4}\b/g,
    tokenPrefix: 'LANDLINE_MASKED'
  },
  // 4. Medical Record Number (MRN) formats
  {
    category: 'MRN',
    pattern: /\b(?:MRN|mrn)[-:\s]*([A-Za-z0-9-]+)\b/gi,
    tokenPrefix: 'MRN_MASKED'
  },
  // 5. Inpatient Room and Bed Identifiers
  {
    category: 'ROOM_BED',
    pattern: /\b(?:Room|Rm|Bed|Room\/Bed|Ward|ICU|NICU|PICU)[-:\s]+([A-Za-z0-9-]+(?:\s*[-\/]\s*[A-Za-z0-9-]+)?)\b/gi,
    tokenPrefix: 'ROOM_BED_MASKED'
  },
  // 6. Professional Regulation Commission (PRC) License Numbers
  {
    category: 'PRC_LICENSE',
    pattern: /\bPRC[-:\s]*(\d{6,8})\b/gi,
    tokenPrefix: 'PRC_LICENSE_MASKED'
  },
  // 7. PhilHealth Accreditation Number (PAN)
  {
    category: 'PAN_NUMBER',
    pattern: /\bPAN[-:\s]*([A-Za-z0-9-]+)\b/gi,
    tokenPrefix: 'PAN_MASKED'
  },
  // 8. Government Statutory IDs (OSCA, PWD, PhilSys National ID, UMID)
  {
    category: 'GOVERNMENT_ID',
    pattern: /\b(?:OSCA|PWD|SC|UMID|PHILSYS|PASSPORT)[-:\s]*([A-Za-z0-9-]+)\b/gi,
    tokenPrefix: 'STATUTORY_ID_MASKED'
  }
];

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Executes bidirectional deterministic pseudonymization on input text.
 * Replaces direct and indirect PHI with masked tokens.
 */
export function scrubPatientData(raw: string, context?: PatientScrubContext): ScrubbedPayload {
  if (!raw) {
    return { scrubbedText: '', tokenMap: new Map() };
  }

  let text = raw;
  const tokenMap = new Map<string, string>();
  let tokenCounter = 1;

  function registerReplacement(original: string, token: string) {
    const trimmed = original.trim();
    if (!trimmed || trimmed.length < 2) return;
    // Check if token is already registered for this exact value
    for (const [t, v] of tokenMap.entries()) {
      if (v.toLowerCase() === trimmed.toLowerCase()) {
        const regex = new RegExp(`(?<![\\p{L}\\p{N}_-])${escapeRegex(trimmed)}(?![\\p{L}\\p{N}_-])`, 'giu');
        text = text.replace(regex, t);
        return;
      }
    }

    // Ensure the token key in tokenMap is unique
    let assignedToken = token;
    if (tokenMap.has(assignedToken)) {
      assignedToken = token.replace(/\]$/, `_${tokenCounter++}]`);
    }

    tokenMap.set(assignedToken, trimmed);

    // Replace in text with word boundary or literal match
    const regex = new RegExp(`(?<![\\p{L}\\p{N}_-])${escapeRegex(trimmed)}(?![\\p{L}\\p{N}_-])`, 'giu');
    text = text.replace(regex, assignedToken);
  }

  // 1. Contextual Dictionary Substitution (High priority exact matches)
  if (context) {
    if (context.fullName) {
      registerReplacement(context.fullName, '[PATIENT_PSEUDONYM_A]');
      // If name is "Dela Cruz, Juan S." or "Juan S. Dela Cruz", also register fragments if distinct
      const parts = context.fullName.split(/[\s,]+/).filter((p) => p.length >= 3);
      for (const part of parts) {
        if (!['san', 'del', 'dela', 'von', 'the', 'and'].includes(part.toLowerCase())) {
          registerReplacement(part, '[PATIENT_PSEUDONYM_A]');
        }
      }
    }
    if (context.firstName && context.firstName.length >= 3) {
      registerReplacement(context.firstName, '[PATIENT_PSEUDONYM_A]');
    }
    if (context.lastName && context.lastName.length >= 3) {
      registerReplacement(context.lastName, '[PATIENT_PSEUDONYM_A]');
    }
    if (context.doctorName) {
      registerReplacement(context.doctorName, '[ATTENDING_PHYSICIAN_A]');
    }
    if (context.mrn) {
      registerReplacement(context.mrn, '[MRN_MASKED_X]');
    }
    if (context.philhealthPin) {
      registerReplacement(context.philhealthPin, '[PHILHEALTH_PIN_MASKED]');
    }
    if (context.contactNumber) {
      registerReplacement(context.contactNumber, '[PHONE_MASKED]');
    }
    if (context.roomBed) {
      registerReplacement(context.roomBed, '[ROOM_MASKED]');
    }
    if (context.encounterNumber) {
      registerReplacement(context.encounterNumber, '[ENCOUNTER_REF_X]');
    }
    if (context.seniorCitizenId) {
      registerReplacement(context.seniorCitizenId, '[SENIOR_ID_MASKED]');
    }
    if (context.pwdId) {
      registerReplacement(context.pwdId, '[PWD_ID_MASKED]');
    }
    if (context.doctorPan) {
      registerReplacement(context.doctorPan, '[DOCTOR_PAN_MASKED]');
    }
    if (context.prcLicense) {
      registerReplacement(context.prcLicense, '[PRC_LICENSE_MASKED]');
    }
    if (context.claimNumber) {
      registerReplacement(context.claimNumber, '[CLAIM_NO_MASKED]');
    }
    if (context.hmoCardMasked) {
      registerReplacement(context.hmoCardMasked, '[HMO_CARD_MASKED]');
    }
    if (context.loaNumber) {
      registerReplacement(context.loaNumber, '[LOA_NUM_MASKED]');
    }
    if (context.hmoApprovalCode) {
      registerReplacement(context.hmoApprovalCode, '[HMO_CODE_MASKED]');
    }
    if (context.hmoAdjusterName) {
      registerReplacement(context.hmoAdjusterName, '[HMO_ADJUSTER_A]');
    }
    if (context.borrowerName) {
      registerReplacement(context.borrowerName, '[GUARANTOR_NAME_A]');
    }
    if (context.borrowerIdNumber) {
      registerReplacement(context.borrowerIdNumber, '[GOV_ID_MASKED]');
    }
  }

  // 2. Regex-Based Rule Substitution
  for (const rule of PHI_REGEX_RULES) {
    const matches = Array.from(text.matchAll(rule.pattern));
    for (const match of matches) {
      const matchedString = match[0];
      // Do not re-scrub an existing token placeholder
      if (matchedString.startsWith('[') && matchedString.endsWith(']')) {
        continue;
      }
      const token = `[${rule.tokenPrefix}_${tokenCounter++}]`;
      tokenMap.set(token, matchedString);
      text = text.replace(matchedString, token);
    }
  }

  return {
    scrubbedText: text,
    tokenMap
  };
}

/**
 * Rehydrates a scrubbed text by substituting tokens back with real user-facing values.
 */
export function rehydrateText(scrubbedResponse: string, tokenMap: Map<string, string>): string {
  if (!scrubbedResponse || !tokenMap || tokenMap.size === 0) {
    return scrubbedResponse;
  }

  let hydrated = scrubbedResponse;
  // Sort tokens by length descending so longer tokens are replaced first
  const sortedTokens = Array.from(tokenMap.entries()).sort((a, b) => b[0].length - a[0].length);

  for (const [token, originalValue] of sortedTokens) {
    const regex = new RegExp(escapeRegex(token), 'g');
    hydrated = hydrated.replace(regex, originalValue);
  }

  return hydrated;
}

/**
 * Explicitly clears the transient token map from memory after response transmission.
 */
export function clearTokenMap(tokenMap: Map<string, string>): void {
  tokenMap.clear();
}
