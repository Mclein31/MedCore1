import type { Permission } from '@medcore/domain';
import { sumTrappedCapitalCents } from '@medcore/domain';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { StaffMe } from '../src/lib/types';
import { StaffContext } from '../src/staff/session';
import type { Encounter } from '../src/v1/types/domain';

const mockContext = vi.hoisted(() => ({
  value: {} as Record<string, unknown>,
}));

vi.mock('@/v1/context/MedCoreContext', () => ({
  useMedCore: () => mockContext.value,
}));

import { PrintDocument } from '../src/v1/components/printing/PrintDocumentContainer';
import { ActiveDischargeRadar } from '../src/v1/features/discharge/components/ActiveDischargeRadar';
import { EncountersLedgerPage } from '../src/v1/pages/EncountersLedgerPage';
import { computeMacroKpiMetrics } from '../src/v1/utils/rcmAnalyticsCalculations';

function makeEncounter(overrides: Partial<Encounter> = {}): Encounter {
  const netPatientDue = overrides.waterfall?.netPatientDue ?? 10000;
  return {
    id: overrides.id ?? 'enc-1',
    encounterNumber: overrides.encounterNumber ?? 'ENC-2026-0042',
    patient: {
      id: 'pat-1',
      mrn: 'MRN-240100',
      maskedName: 'Grace Reyes',
      fullName: 'Grace Reyes',
      philhealthPin: '•••• 1234',
      isSeniorCitizen: false,
      isPwd: false,
      age: 42,
      gender: 'F',
      contactNumber: '•••• 4567',
    },
    roomBed: 'Bed 301',
    roomCategory: 'REGULAR_PRIVATE',
    dailyRoomRate: 2500,
    dailyRoomAllowance: 1500,
    admissionDate: '2026-11-10T08:00:00Z',
    mghOrderTimestamp: '2026-11-16T08:00:00Z',
    attendingDoctor: 'Dr. Cruz',
    doctorPan: 'PAN-123',
    doctorAgreedFee: 15000,
    doctorExcessPf: 0,
    doctorSignedAt: '2026-11-16T08:10:00Z',
    pharmacyRtsCleared: true,
    unreturnedMedsCount: 0,
    stage: 'PENDING_SETTLEMENT',
    elapsedMinutes: 20,
    slaStatus: 'NORMAL',
    primaryDiagnosis: 'Community-acquired pneumonia',
    primaryIcd10: 'J18.9',
    hmo: {
      providerName: 'Maxicare',
      cardMasked: '•••• 1234',
      policyMbl: 150000,
      mblRemaining: 140000,
      dailyRoomAllowance: 1500,
      initialLoaApproved: true,
      finalLoaStatus: 'APPROVED',
      approvedAmount: 10000,
      approvalCode: 'LOA-1001',
      disallowedConsumables: 0,
    },
    philhealth: {
      id: 'clm-1',
      primaryIcd10: 'J18.9',
      primaryDescription: 'Community-acquired pneumonia',
      caseRateCode: 'CAP-MR',
      totalCaseRate: 15000,
      hciAmount: 10500,
      pfAmount: 4500,
      isNbb: false,
      rthRiskScore: 0.04,
      cf4VitalsRecorded: true,
      cf4CourseInWardRecorded: true,
      cf4LabsConsistent: true,
      eSoaXmlConformity: true,
      status: 'CLEAN',
      claimAgingDays: 0,
    },
    items: [],
    waterfall: {
      grossHospitalCharges: 30000,
      grossDoctorFee: 5000,
      grossTotal: 35000,
      vatExemption: 0,
      seniorPwdDiscount: 0,
      netVatDiscountedBase: 35000,
      philhealthHci: 10500,
      philhealthPf: 4500,
      philhealthTotal: 15000,
      hmoApprovedAmount: 10000,
      netPatientDue,
      roomUpgradeExcess: 0,
      excludedConsumables: 0,
      doctorExcessPf: 0,
      patientPaid: 0,
    },
    disputes: [],
    amountPaid: 0,
    remainingBalance: netPatientDue,
    ...overrides,
  };
}

describe('clearance and encounter headers', () => {
  it('labels encounter numbers as Encounter rather than MRN in clearance and ledger headers', () => {
    const enc = makeEncounter();
    mockContext.value = {
      searchQuery: '',
      encounters: [enc],
      selectedEncounter: enc,
      selectedEncounterId: enc.id,
      selectEncounter: () => undefined,
      openDossierDrawer: () => undefined,
      openDoctorQuickSign: () => undefined,
      openPromissoryModal: () => undefined,
      openGatePassModal: () => undefined,
      openWhyDoIOweThis: () => undefined,
      openAddChargeModal: () => undefined,
      finalizeBill: async () => undefined,
      sendBillToPatient: async () => undefined,
      deleteChargeItem: async () => undefined,
      issueDigitalGatePass: async () => undefined,
      applyAccreditedCeiling: async () => undefined,
      clearPharmacyRts: async () => undefined,
      approveHmoFinalLoa: async () => undefined,
      settlePatientBalance: async () => undefined,
      printDocument: () => undefined,
      activeFilter: 'ALL',
      setActiveFilter: () => undefined,
      openAdmitPatientModal: () => undefined,
      openEditEncounterModal: () => undefined,
      deleteEncounter: async () => undefined,
      advanceStage: async () => undefined,
      notifyPatientSms: async () => undefined,
      isSmsSending: () => false,
      activeRole: 'BILLING_SPECIALIST',
      currentUser: { permissions: ['encounter:read', 'charge:write', 'discharge:start'] },
    };

    const staffMe: StaffMe = {
      id: 'staff-1',
      email: 'billing@stjude.example.test',
      fullName: 'Billing Specialist',
      role: 'BILLING_SPECIALIST',
      facilityId: 'fac-1',
      facilityName: 'St. Jude Medical Center',
      permissions: ['encounter:read', 'charge:write', 'discharge:start'] as Permission[],
      mfaEnrolled: true,
    };

    const wrap = (node: React.ReactNode) => (
      <StaffContext.Provider value={staffMe}>{node}</StaffContext.Provider>
    );

    const masterDetailHtml = renderToStaticMarkup(
      wrap(<ActiveDischargeRadar initialViewMode="MASTER_DETAIL" />),
    );
    expect(masterDetailHtml).toContain('Encounter:');
    expect(masterDetailHtml).toContain(enc.encounterNumber);
    expect(masterDetailHtml).not.toMatch(/MRN:\s*<span[^>]*>ENC-/);

    const tableHtml = renderToStaticMarkup(wrap(<ActiveDischargeRadar initialViewMode="TABLE" />));
    expect(tableHtml).toContain('Patient &amp; Encounter');
    expect(tableHtml).toContain(enc.encounterNumber);
    expect(tableHtml).not.toContain('Patient &amp; MRN');

    const ledgerHtml = renderToStaticMarkup(wrap(<EncountersLedgerPage initialTab="PRE_ADMISSION_INTAKE" />));
    expect(ledgerHtml).toContain('Patient &amp; Encounter');
    expect(ledgerHtml).not.toContain('Patient &amp; MRN');

    const printHtml = renderToStaticMarkup(
      wrap(
        <PrintDocument
          config={{
            type: 'COVERAGE_APPROVALS_REPORT',
            title: 'Coverage Report',
            data: { encounters: [enc] },
          }}
        />,
      ),
    );
    expect(printHtml).toContain('Patient &amp; Encounter');
    expect(printHtml).not.toContain('Patient &amp; MRN');
  });
});

describe('trapped capital metric alignment', () => {
  it('matches the shared domain rule for HMO_FINAL_LOA and PENDING_SETTLEMENT unpaid balances', () => {
    const encounters: Encounter[] = [
      makeEncounter({
        id: '1',
        stage: 'ADMITTED',
        remainingBalance: 15000,
        waterfall: { ...makeEncounter().waterfall, netPatientDue: 15000 },
      }),
      makeEncounter({
        id: '2',
        stage: 'MGH_DECLARED',
        remainingBalance: 8000,
        waterfall: { ...makeEncounter().waterfall, netPatientDue: 8000 },
      }),
      makeEncounter({
        id: '3',
        stage: 'DOCTOR_PF_PENDING',
        remainingBalance: 9000,
        waterfall: { ...makeEncounter().waterfall, netPatientDue: 9000 },
      }),
      makeEncounter({
        id: '4',
        stage: 'PHARMACY_RTS_AUDIT',
        remainingBalance: 7000,
        waterfall: { ...makeEncounter().waterfall, netPatientDue: 7000 },
      }),
      makeEncounter({
        id: '5',
        stage: 'HMO_FINAL_LOA',
        remainingBalance: 11000,
        waterfall: { ...makeEncounter().waterfall, netPatientDue: 11000 },
      }),
      makeEncounter({
        id: '6',
        stage: 'PENDING_SETTLEMENT',
        amountPaid: 4000,
        remainingBalance: 10350,
        waterfall: { ...makeEncounter().waterfall, netPatientDue: 14350, patientPaid: 4000 },
      }),
      makeEncounter({
        id: '7',
        stage: 'CLEARED_GATE_PASS',
        remainingBalance: 0,
        waterfall: { ...makeEncounter().waterfall, netPatientDue: 5000, patientPaid: 5000 },
      }),
    ];

    const kpis = computeMacroKpiMetrics(encounters);
    const domainExpectedPesos =
      sumTrappedCapitalCents(
        encounters.map((enc) => ({
          stage: enc.stage,
          balanceCents: Math.round((enc.remainingBalance ?? 0) * 100),
        })),
      ) / 100;

    expect(kpis.trappedWorkingCapital).toBe(21350);
    expect(kpis.trappedWorkingCapital).toBe(domainExpectedPesos);
  });
});
