import { eq, and } from 'drizzle-orm';
import { db, type DbTransaction } from '../db';
import {
  encounters,
  patients,
  statutoryWaterfalls,
  philhealthClaims,
  hmoAuthorizations,
  chargemasterItems,
  promissoryNotes
} from '../db/schema';
import { computeStatutoryWaterfall, StatutoryWaterfallResult } from './statutoryWaterfall';

/**
 * Authoritatively re-computes the 10-step Philippine statutory deduction waterfall
 * across all active chargemaster items and persists the result directly in PostgreSQL.
 * Guarantees zero-centavo drift: Gross === VAT + Senior/PWD + PhilHealth + HMO + PatientDue.
 */
export async function recalculateAndPersistWaterfall(
  encounterId: string,
  updatedDoctorExcessPf?: number,
  transaction?: DbTransaction
): Promise<StatutoryWaterfallResult | null> {
  const recalculate = async (tx: DbTransaction) => {
    // Use the same encounter lock as payments and notes before reading paid state.
    const locked = await tx.select({ id: encounters.id }).from(encounters)
      .where(eq(encounters.id, encounterId)).limit(1).for('update');
    if (locked.length === 0) return null;
    const encRecord = await tx
      .select({
        encounter: encounters,
        patient: patients,
        waterfall: statutoryWaterfalls,
        philhealth: philhealthClaims,
        hmo: hmoAuthorizations
      })
      .from(encounters)
      .innerJoin(patients, eq(encounters.patientId, patients.id))
      .leftJoin(statutoryWaterfalls, eq(statutoryWaterfalls.encounterId, encounters.id))
      .leftJoin(philhealthClaims, eq(philhealthClaims.encounterId, encounters.id))
      .leftJoin(hmoAuthorizations, eq(hmoAuthorizations.encounterId, encounters.id))
      .where(eq(encounters.id, encounterId))
      .limit(1);

    if (encRecord.length === 0) return null;

    const { encounter, patient, waterfall, philhealth, hmo } = encRecord[0];
    const items = await tx
      .select()
      .from(chargemasterItems)
      .where(eq(chargemasterItems.encounterId, encounterId));

    const isSeniorOrPwd = Boolean(patient.isSeniorCitizen || patient.isPwd);
    const philhealthHci = philhealth ? Number(philhealth.hciAmount) : 0;
    const philhealthPf = philhealth ? Number(philhealth.pfAmount) : 0;
    const hmoMax = hmo ? Number(hmo.approvedAmount) : 0;
    const roomUpgradeExcess = waterfall ? Number(waterfall.roomUpgradeExcess) : 0;
    const doctorExcessPf =
      updatedDoctorExcessPf !== undefined
        ? updatedDoctorExcessPf
        : waterfall
        ? Number(waterfall.doctorExcessPf)
        : 0;
    const patientPaid = Number(encounter.amountPaid);
    const notes = await tx.select().from(promissoryNotes).where(and(eq(promissoryNotes.encounterId, encounterId), eq(promissoryNotes.status, 'ACTIVE')));
    const financedCents = notes.reduce((sum, note) => sum + Math.round(Number(note.principalAmount) * 100), 0);

    const computed = computeStatutoryWaterfall(
      items.map((it) => ({
        grossAmount: Number(it.grossAmount),
        category: it.category,
        status: it.status
      })),
      isSeniorOrPwd,
      philhealthHci,
      philhealthPf,
      hmoMax,
      roomUpgradeExcess,
      doctorExcessPf,
      patientPaid
    );

    await tx
      .update(statutoryWaterfalls)
      .set({
        grossHospitalCharges: computed.grossHospitalCharges.toFixed(2),
        grossDoctorFee: computed.grossDoctorFee.toFixed(2),
        grossTotal: computed.grossTotal.toFixed(2),
        vatExemption: computed.vatExemption.toFixed(2),
        seniorPwdDiscount: computed.seniorPwdDiscount.toFixed(2),
        netVatDiscountedBase: computed.netVatDiscountedBase.toFixed(2),
        philhealthHci: computed.philhealthHci.toFixed(2),
        philhealthPf: computed.philhealthPf.toFixed(2),
        philhealthTotal: computed.philhealthTotal.toFixed(2),
        hmoApprovedAmount: computed.hmoApprovedAmount.toFixed(2),
        roomUpgradeExcess: computed.roomUpgradeExcess.toFixed(2),
        excludedConsumables: computed.excludedConsumables.toFixed(2),
        doctorExcessPf: computed.doctorExcessPf.toFixed(2),
        coverageShortfall: computed.coverageShortfall.toFixed(2),
        netPatientDue: computed.netPatientDue.toFixed(2),
        patientPaid: patientPaid.toFixed(2),
        reconciledAt: new Date()
      })
      .where(eq(statutoryWaterfalls.encounterId, encounterId));

    // Update encounter remaining balance
    const remaining = Math.max(0, Math.round(computed.netPatientDue * 100) - Math.round(patientPaid * 100) - financedCents) / 100;
    await tx
      .update(encounters)
      .set({
        remainingBalance: remaining.toFixed(2),
        updatedAt: new Date()
      })
      .where(eq(encounters.id, encounterId));

    return computed;
  };
  return transaction ? recalculate(transaction) : db.transaction(recalculate);
}
