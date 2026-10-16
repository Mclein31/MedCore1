import {
  INSTALLMENT_TERMS,
  ROLE_LABELS,
  STAGE_LABELS,
  DISCHARGE_STAGES,
  WAIVER_LIMIT_CENTS,
} from '@medcore/domain';
import { Card, PageHeader } from '../../components/ui';
import { peso } from '../../lib/format';
import { useStaff } from '../session';

/**
 * Read-only view of the rules MedCore enforces. In v1 this page also showed integration
 * toggles; those were mock-ups, so only rules that the v2 code actually applies are listed.
 */
export function Rules() {
  const { facility } = useStaff();
  return (
    <>
      <PageHeader
        eyebrow="Governance & admin"
        title="Settings & Rules"
        subtitle={`Rules applied to every bill at ${facility.name}. They are enforced by the API, not by this page.`}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Statutory deduction rules & precedence">
          <ol className="flex list-decimal flex-col gap-3 pl-5 text-sm">
            <li>
              <span className="font-semibold">12% VAT exemption</span> for senior citizens and PWDs (RA 9994,
              RA 10754), computed as 12/112 of the VAT-inclusive gross.
            </li>
            <li>
              <span className="font-semibold">20% senior/PWD discount</span> on the VAT-exempt base, including
              items payers exclude.
            </li>
            <li>
              <span className="font-semibold">PhilHealth case rate</span>: hospital share plus
              professional-fee share.
            </li>
            <li>
              <span className="font-semibold">HMO letter of authorization</span>, capped by what is left.
            </li>
            <li>
              <span className="font-semibold">Net patient due</span>. Money is integer centavos; every ledger
              must reconcile to the centavo.
            </li>
          </ol>
        </Card>
        <Card title="Discharge clearance">
          <ol className="flex flex-col gap-2 text-sm">
            {DISCHARGE_STAGES.map((stage, i) => (
              <li key={stage} className="flex items-center gap-3">
                <span className="tabular flex size-6 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">
                  {i + 1}
                </span>
                {STAGE_LABELS[stage]}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-subtle">
            SLA warning and breach thresholds are stored per facility (default 25 and 40 minutes) and are not
            editable from the dashboard yet.
          </p>
        </Card>
        <Card title="Payments, plans and disputes">
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
            <li>Official receipt numbers are gap-free per facility and year.</li>
            <li>
              Promissory notes (RA 9439) are 0% interest over {INSTALLMENT_TERMS.join(', ')} months; a
              government ID is required and stored encrypted.
            </li>
            <li>
              Whoever filed a dispute cannot resolve it. Waivers above {peso(WAIVER_LIMIT_CENTS)} need the{' '}
              {ROLE_LABELS.HOSPITAL_CFO}.
            </li>
            <li>
              Card numbers, CVVs and expiry dates are never accepted; online card payments record brand and
              last 4.
            </li>
          </ul>
        </Card>
        <Card title="Exit passes and access">
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
            <li>Exit passes are signed; the 6-digit PIN is derived from a server secret and never stored.</li>
            <li>Five wrong PINs void a pass. Each pass works once.</li>
            <li>
              Staff sign in with a password and an authenticator app. Sessions end after 8 hours or 30 minutes
              idle.
            </li>
            <li>Patients sign in with a 6-digit code sent only to the email the hospital recorded.</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
