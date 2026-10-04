import { eq, or, ilike } from 'drizzle-orm';
import { encounters, chargemasterItems, billingDisputes, philhealthClaims } from '../db/schema';

export const isUuid = (val: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

export function matchEncounterCondition(idOrNumber: string) {
  if (isUuid(idOrNumber)) {
    return eq(encounters.id, idOrNumber);
  }
  const normalized = idOrNumber.startsWith('enc-')
    ? idOrNumber.replace('enc-', 'ENC-2026-')
    : idOrNumber;
  return or(
    eq(encounters.encounterNumber, idOrNumber),
    eq(encounters.encounterNumber, normalized)
  );
}

export function matchChargeItemCondition(idOrCode: string) {
  if (isUuid(idOrCode)) {
    return eq(chargemasterItems.id, idOrCode);
  }
  return or(
    eq(chargemasterItems.code, idOrCode),
    ilike(chargemasterItems.code, idOrCode)
  );
}

export function matchDisputeCondition(id: string) {
  if (isUuid(id)) {
    return eq(billingDisputes.id, id);
  }
  return eq(billingDisputes.id, '00000000-0000-0000-0000-000000000000');
}

export function matchPhilHealthClaimCondition(claimIdOrNumber: string) {
  if (isUuid(claimIdOrNumber)) {
    return or(
      eq(philhealthClaims.id, claimIdOrNumber),
      eq(encounters.id, claimIdOrNumber)
    );
  }
  const normalizedEnc = claimIdOrNumber.startsWith('enc-')
    ? claimIdOrNumber.replace('enc-', 'ENC-2026-')
    : claimIdOrNumber;
  return or(
    eq(philhealthClaims.claimNumber, claimIdOrNumber),
    eq(encounters.encounterNumber, claimIdOrNumber),
    eq(encounters.encounterNumber, normalizedEnc)
  );
}
