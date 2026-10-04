import { Hono } from 'hono';
import { db } from '../db';
import { statutoryWaterfalls, encounters, philhealthClaims, hmoAuthorizations, beds } from '../db/schema';
import { requireAuth, requireRole } from '../middleware/auth';

const analyticsApp = new Hono();

analyticsApp.get(
  '/rcm-metrics',
  requireAuth,
  requireRole(['HOSPITAL_CFO', 'BILLING_SPECIALIST']),
  async (c) => {
    const [allWaterfalls, allEncounters, allClaims, allHmos, allBeds] = await Promise.all([
      db.select().from(statutoryWaterfalls),
      db.select().from(encounters),
      db.select().from(philhealthClaims),
      db.select().from(hmoAuthorizations),
      db.select().from(beds)
    ]);

    let totalGrossRevenue = 0;
    let totalVatExemption = 0;
    let totalSeniorPwdDiscount = 0;
    let totalPhilhealthCovered = 0;
    let totalHmoCovered = 0;
    let totalNetPatientDue = 0;
    let totalPatientPaid = 0;

    for (const w of allWaterfalls) {
      totalGrossRevenue += Number(w.grossTotal);
      totalVatExemption += Number(w.vatExemption);
      totalSeniorPwdDiscount += Number(w.seniorPwdDiscount);
      totalPhilhealthCovered += Number(w.philhealthTotal);
      totalHmoCovered += Number(w.hmoApprovedAmount);
      totalNetPatientDue += Number(w.netPatientDue);
      totalPatientPaid += Number(w.patientPaid || 0);
    }

    const totalEncounters = allEncounters.length;
    const clearedEncounters = allEncounters.filter((e) => e.stage === 'CLEARED_GATE_PASS').length;
    const warningEncounters = allEncounters.filter((e) => e.slaStatus === 'WARNING').length;
    const breachEncounters = allEncounters.filter((e) => e.slaStatus === 'BREACH').length;

    const returnedClaims = allClaims.filter((cl) => cl.status === 'RETURNED').length;
    const cleanFirstPassRate = allClaims.length > 0
      ? Number((((allClaims.length - returnedClaims) / allClaims.length) * 100).toFixed(1))
      : 96.4;

    const totalBeds = allBeds.length;
    const occupiedBeds = allBeds.filter((b) => b.status === 'OCCUPIED').length;
    const occupancyRate = totalBeds > 0 ? Number(((occupiedBeds / totalBeds) * 100).toFixed(1)) : 0;

    return c.json({
      summary: {
        totalEncounters,
        clearedEncounters,
        warningEncounters,
        breachEncounters,
        occupancyRate,
        cleanFirstPassRate,
        cleanClaimRate: cleanFirstPassRate
      },
      waterfall: {
        totalGrossRevenue: Number(totalGrossRevenue.toFixed(2)),
        totalVatExemption: Number(totalVatExemption.toFixed(2)),
        totalSeniorPwdDiscount: Number(totalSeniorPwdDiscount.toFixed(2)),
        totalPhilhealthCovered: Number(totalPhilhealthCovered.toFixed(2)),
        totalHmoCovered: Number(totalHmoCovered.toFixed(2)),
        totalNetPatientDue: Number(totalNetPatientDue.toFixed(2)),
        totalPatientPaid: Number(totalPatientPaid.toFixed(2)),
        outstandingAr: Number((totalNetPatientDue - totalPatientPaid).toFixed(2))
      }
    });
  }
);

export default analyticsApp;
