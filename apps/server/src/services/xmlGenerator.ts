import { XMLBuilder } from 'fast-xml-parser';
import { moneyCents } from './statutoryWaterfall';

export interface EsoaXmlData {
  facility: {
    pan: string;
    name: string;
    tin: string;
    address: string;
  };
  patient: {
    pin: string;
    fullName: string;
    dob: string;
    gender: string;
    isSeniorOrPwd: boolean;
    seniorPwdId?: string;
  };
  encounter: {
    encounterNumber: string;
    admissionDate: string;
    dischargeDate: string;
    primaryIcd10: string;
    primaryDiagnosis: string;
  };
  doctor: {
    pan: string;
    name: string;
    agreedFee: number;
    excessFee: number;
  };
  claim: {
    claimNumber: string;
    caseRateCode: string;
    totalCaseRate: number;
    hciAmount: number;
    pfAmount: number;
    isNbb: boolean;
  };
  charges: Array<{
    code: string;
    description: string;
    category: string;
    quantity: number;
    unitPrice: number;
    grossAmount: number;
    philhealthAmount: number;
    hmoAmount: number;
    patientOop: number;
  }>;
  waterfall: {
    grossTotal: number;
    vatExemption: number;
    seniorDiscount: number;
    philhealthTotal: number;
    hmoApprovedAmount: number;
    netPatientDue: number;
  };
}

export function generatePhilHealthEsoaXml(data: EsoaXmlData): string {
  for (const value of [data.doctor.agreedFee, data.doctor.excessFee, data.claim.totalCaseRate,
    data.claim.hciAmount, data.claim.pfAmount, ...Object.values(data.waterfall)]) moneyCents(value);
  for (const charge of data.charges) {
    for (const value of [charge.quantity, charge.unitPrice, charge.grossAmount, charge.philhealthAmount, charge.hmoAmount, charge.patientOop]) moneyCents(value);
  }
  const itemGross = data.charges.reduce((total, item) => total + BigInt(moneyCents(item.grossAmount)), 0n);
  if (itemGross !== BigInt(moneyCents(data.waterfall.grossTotal))) throw new Error('eSOA itemized gross does not reconcile with the waterfall.');
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    suppressEmptyNode: false
  });

  const xmlObj = {
    '?xml': {
      '@_version': '1.0',
      '@_encoding': 'UTF-8'
    },
    eSOA_Claim: {
      '@_version': '3.0',
      '@_xmlns': 'urn:philhealth:esoa:circular:2023-0026',
      '@_xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      '@_circular': 'PhilHealth-Circular-2023-0026',
      Facility: {
        AccreditationNumber: data.facility.pan,
        Name: data.facility.name,
        TaxIdentificationNumber: data.facility.tin,
        Address: data.facility.address
      },
      Patient: {
        PhilHealthIdentificationNumber: data.patient.pin,
        FullName: data.patient.fullName,
        DateOfBirth: data.patient.dob,
        Gender: data.patient.gender,
        IsSeniorCitizenOrPWD: data.patient.isSeniorOrPwd ? 'Y' : 'N',
        SeniorPWD_ID: data.patient.seniorPwdId || ''
      },
      Encounter: {
        EncounterNumber: data.encounter.encounterNumber,
        AdmissionTimestamp: data.encounter.admissionDate,
        DischargeTimestamp: data.encounter.dischargeDate,
        PrimaryICD10: data.encounter.primaryIcd10,
        DiagnosisDescription: data.encounter.primaryDiagnosis
      },
      AttendingPhysician: {
        PAN: data.doctor.pan,
        FullName: data.doctor.name,
        AgreedProfessionalFee: data.doctor.agreedFee.toFixed(2),
        ExcessProfessionalFee: data.doctor.excessFee.toFixed(2)
      },
      BenefitSummary: {
        ClaimNumber: data.claim.claimNumber,
        CaseRateCode: data.claim.caseRateCode,
        TotalCaseRate: data.claim.totalCaseRate.toFixed(2),
        HospitalCareFacilityShare: data.claim.hciAmount.toFixed(2),
        PhysicianShare: data.claim.pfAmount.toFixed(2),
        NoBalanceBilling: data.claim.isNbb ? 'Y' : 'N'
      },
      StatutoryWaterfallSummary: {
        GrossTotal: data.waterfall.grossTotal.toFixed(2),
        VATExemption: data.waterfall.vatExemption.toFixed(2),
        SeniorCitizenPWDDiscount: data.waterfall.seniorDiscount.toFixed(2),
        PhilHealthBenefitTotal: data.waterfall.philhealthTotal.toFixed(2),
        HMOApprovedAmount: data.waterfall.hmoApprovedAmount.toFixed(2),
        NetPatientOutOfPocket: data.waterfall.netPatientDue.toFixed(2)
      },
      ItemizedCharges: {
        Item: data.charges.map((c) => ({
          Code: c.code,
          Description: c.description,
          Category: c.category,
          Quantity: c.quantity.toFixed(2),
          UnitPrice: c.unitPrice.toFixed(2),
          GrossAmount: c.grossAmount.toFixed(2),
          PhilHealthShare: c.philhealthAmount.toFixed(2),
          HMOShare: c.hmoAmount.toFixed(2),
          PatientOutOfPocket: c.patientOop.toFixed(2)
        }))
      }
    }
  };

  return builder.build(xmlObj);
}
