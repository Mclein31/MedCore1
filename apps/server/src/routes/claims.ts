import { Hono } from 'hono';
import { eq, or, and } from 'drizzle-orm';
import { db } from '../db';
import {
  philhealthClaims,
  encounters,
  facilities,
  patients,
  users,
  chargemasterItems,
  statutoryWaterfalls
} from '../db/schema';
import { generatePhilHealthEsoaXml } from '../services/xmlGenerator';
import { apiError } from '../middleware/error';
import { requireAuth, requireRole } from '../middleware/auth';
import { matchPhilHealthClaimCondition } from '../utils/dbQuery';

const claimsApp = new Hono();

// GET /api/v1/claims/:claimId/esoa-xml
claimsApp.get(
  '/:claimId/esoa-xml',
  requireAuth,
  requireRole(['CLAIMS_ENCODER', 'HOSPITAL_CFO', 'BILLING_SPECIALIST']),
  async (c) => {
    const claimId = c.req.param('claimId');
    if (!claimId) return apiError(c, 400, 'MISSING_ID', 'A record identifier is required.');

    const claimList = await db
      .select({
        claim: philhealthClaims,
        encounter: encounters,
        patient: patients,
        facility: facilities,
        doctor: users
      })
      .from(philhealthClaims)
      .innerJoin(encounters, eq(philhealthClaims.encounterId, encounters.id))
      .innerJoin(patients, eq(encounters.patientId, patients.id))
      .innerJoin(facilities, eq(encounters.facilityId, facilities.id))
      .leftJoin(users, eq(encounters.attendingPhysicianId, users.id))
      .where(and(matchPhilHealthClaimCondition(claimId), eq(encounters.facilityId, c.get('user').facilityId)))
      .limit(1);

    if (claimList.length === 0) {
      return apiError(c, 404, 'CLAIM_NOT_FOUND', `PhilHealth claim ${claimId} not found.`);
    }

    const { claim, encounter, patient, facility, doctor } = claimList[0];

    const [items, waterfalls] = await Promise.all([
      db.select().from(chargemasterItems).where(eq(chargemasterItems.encounterId, encounter.id)),
      db.select().from(statutoryWaterfalls).where(eq(statutoryWaterfalls.encounterId, encounter.id))
    ]);

    const waterfall = waterfalls[0] || {
      grossTotal: '0.00',
      vatExemption: '0.00',
      seniorPwdDiscount: '0.00',
      philhealthTotal: '0.00',
      hmoApprovedAmount: '0.00',
      netPatientDue: '0.00'
    };

    const xmlPayload = generatePhilHealthEsoaXml({
      facility: {
        pan: facility.philhealthPan,
        name: facility.name,
        tin: facility.tin,
        address: facility.address
      },
      patient: {
        pin: patient.philhealthPin || '00-000000000-0',
        fullName: patient.fullName,
        dob: patient.dateOfBirth.toISOString().slice(0, 10),
        gender: patient.gender,
        isSeniorOrPwd: patient.isSeniorCitizen || patient.isPwd,
        seniorPwdId: patient.seniorCitizenId || patient.pwdId || undefined
      },
      encounter: {
        encounterNumber: encounter.encounterNumber,
        admissionDate: encounter.admissionTimestamp.toISOString(),
        dischargeDate: encounter.mghOrderTimestamp?.toISOString() || new Date().toISOString(),
        primaryIcd10: encounter.primaryIcd10,
        primaryDiagnosis: encounter.primaryDiagnosis
      },
      doctor: {
        pan: encounter.doctorPan,
        name: doctor?.fullName || 'Attending Physician',
        agreedFee: Number(encounter.doctorAgreedFee),
        excessFee: Number(encounter.doctorExcessPf)
      },
      claim: {
        claimNumber: claim.claimNumber,
        caseRateCode: claim.caseRateCode,
        totalCaseRate: Number(claim.totalCaseRate),
        hciAmount: Number(claim.hciAmount),
        pfAmount: Number(claim.pfAmount),
        isNbb: claim.isNbb
      },
      charges: items.filter(it => it.status !== 'SUPERVISORY_WAIVED' && it.status !== 'WAIVED').map((it) => ({
        code: it.code,
        description: it.description,
        category: it.category,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        grossAmount: Number(it.grossAmount),
        philhealthAmount: Number(it.philhealthCovered),
        hmoAmount: Number(it.hmoCovered),
        patientOop: Number(it.patientOop)
      })),
      waterfall: {
        grossTotal: Number(waterfall.grossTotal),
        vatExemption: Number(waterfall.vatExemption),
        seniorDiscount: Number(waterfall.seniorPwdDiscount),
        philhealthTotal: Number(waterfall.philhealthTotal),
        hmoApprovedAmount: Number(waterfall.hmoApprovedAmount),
        netPatientDue: Number(waterfall.netPatientDue)
      }
    });

    c.header('Content-Type', 'application/xml; charset=utf-8');
    c.header('Content-Disposition', `inline; filename="eSOA_${claim.claimNumber}.xml"`);
    c.header('Cache-Control', 'private, no-cache');

    return c.body(xmlPayload);
  }
);

export default claimsApp;
