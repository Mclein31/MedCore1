import { centsToDecimal } from '@medcore/domain';

/**
 * Electronic Statement of Account (PhilHealth eClaims 3.0 style). A minimal,
 * dependency-free XML writer: every text node and attribute is escaped, and
 * control characters are removed so the document is always well-formed.
 *
 * Note: this mirrors the eSOA structure but has not been certified against the
 * official PhilHealth DTD.
 */
export function xmlEscape(value: string): string {
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

type Node = { tag: string; attrs?: Record<string, string>; text?: string; children?: Node[] };

function render(node: Node, depth = 0): string {
  const pad = '  '.repeat(depth);
  const attrs = Object.entries(node.attrs ?? {})
    .map(([k, v]) => ` ${k}="${xmlEscape(v)}"`)
    .join('');
  if (node.children?.length) {
    return `${pad}<${node.tag}${attrs}>\n${node.children.map((child) => render(child, depth + 1)).join('\n')}\n${pad}</${node.tag}>`;
  }
  return `${pad}<${node.tag}${attrs}>${xmlEscape(node.text ?? '')}</${node.tag}>`;
}

const el = (tag: string, text: string | number | null | undefined): Node => ({ tag, text: text === null || text === undefined ? '' : String(text) });
const money = (tag: string, cents: number): Node => el(tag, centsToDecimal(cents));

export interface EsoaInput {
  facility: { name: string; accreditation: string; tin: string; address: string };
  patient: { fullName: string; philhealthPin: string | null; dateOfBirth: string; sex: string; discountKind: string };
  encounter: { encounterNumber: string; billNumber: string | null; admittedAt: Date; clearedAt: Date | null; icd10Code: string; diagnosis: string };
  claim: { claimNumber: string; caseRateCode: string; hciCents: number; pfCents: number };
  physician: { fullName: string; prcLicense: string | null };
  charges: { code: string; description: string; category: string; quantity: number; unitPriceCents: number; grossCents: number; coverage: string }[];
  ledger: {
    grossCents: number;
    vatExemptionCents: number;
    seniorPwdDiscountCents: number;
    philhealthCents: number;
    hmoCents: number;
    netPatientDueCents: number;
  };
}

export function buildEsoaXml(input: EsoaInput, generatedAt: Date): string {
  const itemized = input.charges.filter((c) => c.coverage !== 'WAIVED');
  const itemTotal = itemized.reduce((sum, c) => sum + c.grossCents, 0);
  if (itemTotal !== input.ledger.grossCents) throw new Error('eSOA itemized total does not reconcile with the ledger.');

  const doc: Node = {
    tag: 'eSOA',
    attrs: { version: '3.0', generatedAt: generatedAt.toISOString() },
    children: [
      {
        tag: 'HealthCareInstitution',
        children: [el('Name', input.facility.name), el('Accreditation', input.facility.accreditation), el('TIN', input.facility.tin), el('Address', input.facility.address)],
      },
      {
        tag: 'Member',
        children: [
          el('Name', input.patient.fullName),
          el('PIN', input.patient.philhealthPin),
          el('DateOfBirth', input.patient.dateOfBirth),
          el('Sex', input.patient.sex),
          el('Discount', input.patient.discountKind),
        ],
      },
      {
        tag: 'Confinement',
        children: [
          el('EncounterNumber', input.encounter.encounterNumber),
          el('StatementNumber', input.encounter.billNumber),
          el('Admitted', input.encounter.admittedAt.toISOString()),
          el('Discharged', input.encounter.clearedAt?.toISOString()),
          el('ICD10', input.encounter.icd10Code),
          el('Diagnosis', input.encounter.diagnosis),
        ],
      },
      {
        tag: 'Claim',
        children: [el('ClaimNumber', input.claim.claimNumber), el('CaseRate', input.claim.caseRateCode), money('HCIShare', input.claim.hciCents), money('PFShare', input.claim.pfCents)],
      },
      { tag: 'Physician', children: [el('Name', input.physician.fullName), el('PRCLicense', input.physician.prcLicense)] },
      {
        tag: 'Charges',
        attrs: { count: String(itemized.length) },
        children: itemized.map((c) => ({
          tag: 'Item',
          attrs: { code: c.code, category: c.category, coverage: c.coverage },
          children: [el('Description', c.description), el('Quantity', c.quantity), money('UnitPrice', c.unitPriceCents), money('Amount', c.grossCents)],
        })),
      },
      {
        tag: 'Summary',
        children: [
          money('GrossAmount', input.ledger.grossCents),
          money('VATExemption', input.ledger.vatExemptionCents),
          money('SeniorPWDDiscount', input.ledger.seniorPwdDiscountCents),
          money('PhilHealth', input.ledger.philhealthCents),
          money('HMO', input.ledger.hmoCents),
          money('PatientDue', input.ledger.netPatientDueCents),
        ],
      },
    ],
  };
  return `<?xml version="1.0" encoding="UTF-8"?>\n${render(doc)}\n`;
}
