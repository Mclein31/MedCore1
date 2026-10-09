import { Encounter, ChargemasterItem, EncounterTimelineEvent } from '@/types/domain';
import { recalculateWaterfall } from '@/utils/waterfall';
import { calculateInstallmentPlan } from '@/utils/financing';
import { generateAdditionalEncounters } from './patientDatasetGenerator';

// ============================================================================
// 1. CHARGEMASTER LINE ITEMS PER ENCOUNTER
// ============================================================================

// --- 1. Juan S. Dela Cruz (Pneumonia, Senior Citizen, Maxicare) ---
const delaCruzItems: ChargemasterItem[] = [
  {
    id: 'item-101',
    code: 'RM-PRIV-01',
    description: 'Regular Private Room Accommodation (4 Days)',
    category: 'ROOM_BOARD',
    qty: 4,
    unitPrice: 3000.0,
    grossAmount: 12000.0,
    isVatable: true,
    philhealthCovered: 0,
    hmoCovered: 6000.0,
    patientOop: 2571.43,
    status: 'COVERED',
    plainLanguageExplainer:
      'Private room charge for 4 days. Maxicare covers ₱1,500/day (₱6,000). Remaining balance discounted under RA 9994 (12% VAT exemption -₱1,285.71 and 20% Senior Citizen discount -₱2,142.86), leaving ₱2,571.43 net patient responsibility.'
  },
  {
    id: 'item-102',
    code: 'RX-CEFT-1G',
    description: 'Ceftriaxone 1g IV Vial (PNDF Standard)',
    category: 'PHARMACY',
    qty: 8,
    unitPrice: 1200.0,
    grossAmount: 9600.0,
    isVatable: true,
    philhealthCovered: 3200.0,
    hmoCovered: 3657.14,
    patientOop: 0,
    status: 'COVERED',
    plainLanguageExplainer:
      'Standard intravenous antibiotic covered under PhilHealth Philippine National Drug Formulary (PNDF) and Maxicare inpatient formulary.'
  },
  {
    id: 'item-103',
    code: 'RX-AZITH-500',
    description: 'Azithromycin 500mg IV Infusion',
    category: 'PHARMACY',
    qty: 4,
    unitPrice: 1850.0,
    grossAmount: 7400.0,
    isVatable: true,
    philhealthCovered: 2400.0,
    hmoCovered: 3000.0,
    patientOop: 0,
    status: 'COVERED',
    plainLanguageExplainer:
      'Prescribed respiratory antibiotic covered under PhilHealth Case Rate bundle and Maxicare policy.'
  },
  {
    id: 'item-104',
    code: 'CSR-SUCT-14F',
    description: 'Suction Catheter 14Fr with Vent (Pack of 6)',
    category: 'CENTRAL_SUPPLIES',
    qty: 6,
    unitPrice: 450.0,
    grossAmount: 2700.0,
    isVatable: true,
    philhealthCovered: 0,
    hmoCovered: 0,
    patientOop: 1928.57,
    status: 'CONTESTED',
    exclusionReasonClause: 'Maxicare Corporate Exclusion Policy Schedule B, Clause 4 (Disposable Ward Sundries)',
    plainLanguageExplainer:
      'Ward supply struck out by Maxicare adjusters. Contested by patient family because catheters were brought from home pharmacy.',
    isDisputed: true,
    disputeReason: 'Patient family states catheters were brought from home during admission.'
  },
  {
    id: 'item-105',
    code: 'CSR-PPE-ISOL',
    description: 'Isolation Gown & Face Shield Biohazard Pack',
    category: 'CENTRAL_SUPPLIES',
    qty: 3,
    unitPrice: 500.0,
    grossAmount: 1500.0,
    isVatable: true,
    philhealthCovered: 0,
    hmoCovered: 0,
    patientOop: 1071.43,
    status: 'DISALLOWED_SUNDRY',
    exclusionReasonClause: 'Maxicare Corporate Exclusion Policy Schedule B, Clause 9 (Infection Control PPE)',
    plainLanguageExplainer:
      'Isolation attire excluded from private insurance settlement. Billed to patient after Senior Citizen statutory deductions.'
  },
  {
    id: 'item-106',
    code: 'LAB-CBC-DIFF',
    description: 'Complete Blood Count (CBC) with Automated Differential',
    category: 'LABORATORY',
    qty: 2,
    unitPrice: 900.0,
    grossAmount: 1800.0,
    isVatable: true,
    philhealthCovered: 600.0,
    hmoCovered: 685.72,
    patientOop: 0,
    status: 'COVERED',
    plainLanguageExplainer: 'Diagnostic hematology investigation fully covered across PhilHealth and Maxicare.'
  },
  {
    id: 'item-107',
    code: 'RAD-CXR-PA',
    description: 'Chest Radiography (Chest X-Ray PA/Lateral View)',
    category: 'LABORATORY',
    qty: 2,
    unitPrice: 1500.0,
    grossAmount: 3000.0,
    isVatable: true,
    philhealthCovered: 1000.0,
    hmoCovered: 1142.86,
    patientOop: 0,
    status: 'COVERED',
    plainLanguageExplainer: 'Standard imaging substantiating pneumonia diagnosis on PhilHealth Claim Form 4 (CF4).'
  },
  {
    id: 'item-108',
    code: 'CSR-IV-LINE',
    description: 'IV Infusion Tubing Set & Introcan 22G Cannula',
    category: 'CENTRAL_SUPPLIES',
    qty: 4,
    unitPrice: 425.0,
    grossAmount: 1700.0,
    isVatable: true,
    philhealthCovered: 0,
    hmoCovered: 0,
    patientOop: 1214.28,
    status: 'DISALLOWED_SUNDRY',
    exclusionReasonClause: 'Maxicare Exclusion Schedule B, Clause 4.A (Intravenous Accessories)',
    plainLanguageExplainer:
      'Routine bedside IV tubing excluded by corporate HMO plan. Discounted under RA 9994.'
  },
  {
    id: 'item-109',
    code: 'PH-FAC-GEN',
    description: 'Facility Inpatient Ancillary & Nursing Care Bundle',
    category: 'ROOM_BOARD',
    qty: 1,
    unitPrice: 59300.0,
    grossAmount: 59300.0,
    isVatable: true,
    philhealthCovered: 3300.0,
    hmoCovered: 36028.57,
    patientOop: 0,
    status: 'COVERED',
    plainLanguageExplainer: 'Aggregated inpatient medication, medical gas/oxygen, and ward monitoring services.'
  },
  {
    id: 'item-110',
    code: 'PF-REYES-ATT',
    description: 'Attending Physician Inpatient Visits & Discharge (4 Days)',
    category: 'PROFESSIONAL_FEE',
    qty: 1,
    unitPrice: 21000.0,
    grossAmount: 21000.0,
    isVatable: false,
    philhealthCovered: 4500.0,
    hmoCovered: 6500.0,
    patientOop: 10000.0,
    status: 'EXCESS_PF',
    exclusionReasonClause: 'Doctor PF billed exceeds Maxicare accredited specialist schedule ceiling',
    plainLanguageExplainer:
      'Attending specialist fee confirmed at ₱21,000. PhilHealth covered ₱4,500 and Maxicare covered ₱6,500. The remaining ₱10,000 is Doctor Excess PF.'
  }
];

// --- 2. Luisa M. Ramos (Appendicitis w/ Peritonitis, PWD, Intellicare) ---
const ramosItems: ChargemasterItem[] = [
  {
    id: 'item-201',
    code: 'RM-SEMI-01',
    description: 'Semi-Private Room Accommodation (3 Days)',
    category: 'ROOM_BOARD',
    qty: 3,
    unitPrice: 1800.0,
    grossAmount: 5400.0,
    isVatable: true,
    philhealthCovered: 0,
    hmoCovered: 4500.0,
    patientOop: 900.0,
    status: 'COVERED',
    plainLanguageExplainer: 'Semi-private room rate of ₱1,800/day vs Intellicare allowance of ₱1,500/day (₱300/day excess).'
  },
  {
    id: 'item-202',
    code: 'OR-APP-PACK',
    description: 'Open Appendectomy Major Surgical OR Pack & Sterile Drapes',
    category: 'ROOM_BOARD',
    qty: 1,
    unitPrice: 28000.0,
    grossAmount: 28000.0,
    isVatable: true,
    philhealthCovered: 9800.0,
    hmoCovered: 13200.0,
    patientOop: 0,
    status: 'COVERED',
    plainLanguageExplainer: 'Operating room suite fee and surgical drape pack for emergency laparotomy.'
  },
  {
    id: 'item-203',
    code: 'RX-FOX-1G',
    description: 'Cefoxitin Sodium 1g IV Infusion (Post-Op Antibiotic)',
    category: 'PHARMACY',
    qty: 6,
    unitPrice: 1450.0,
    grossAmount: 8700.0,
    isVatable: true,
    philhealthCovered: 3500.0,
    hmoCovered: 3800.0,
    patientOop: 0,
    status: 'COVERED',
    plainLanguageExplainer: 'Broad-spectrum intra-abdominal antibiotic covered under surgical case rate.'
  },
  {
    id: 'item-204',
    code: 'CSR-LAP-PAD',
    description: 'Radiopaque Laparotomy Sponges with X-ray Detectable Thread',
    category: 'CENTRAL_SUPPLIES',
    qty: 4,
    unitPrice: 650.0,
    grossAmount: 2600.0,
    isVatable: true,
    philhealthCovered: 0,
    hmoCovered: 1050.0,
    patientOop: 1550.0,
    status: 'DISALLOWED_SUNDRY',
    exclusionReasonClause: 'Intellicare Disallowed Consumables Schedule 4.1',
    plainLanguageExplainer: 'Extra laparotomy packs beyond base surgical allowance billed to patient under PWD discount.'
  },
  {
    id: 'item-205',
    code: 'LAB-SURG-PATH',
    description: 'Surgical Pathology Histopathology (Appendix Specimen)',
    category: 'LABORATORY',
    qty: 1,
    unitPrice: 3500.0,
    grossAmount: 3500.0,
    isVatable: true,
    philhealthCovered: 1500.0,
    hmoCovered: 1600.0,
    patientOop: 0,
    status: 'COVERED',
    plainLanguageExplainer: 'Histopathological confirmation of suppurative appendicitis.'
  },
  {
    id: 'item-206',
    code: 'PF-ABAD-SURG',
    description: 'Surgeon Fee: Emergency Appendectomy & Peritoneal Lavage',
    category: 'PROFESSIONAL_FEE',
    qty: 1,
    unitPrice: 18000.0,
    grossAmount: 18000.0,
    isVatable: false,
    philhealthCovered: 11200.0,
    hmoCovered: 3800.0,
    patientOop: 3000.0,
    status: 'EXCESS_PF',
    exclusionReasonClause: 'Surgeon declared fee exceeds contracted Intellicare tariff schedule',
    plainLanguageExplainer: 'Surgeon declared ₱18,000; PhilHealth and HMO covered ₱15,000, leaving ₱3,000 excess PF.'
  }
];

// --- 3. Miguel B. Santos (Dengue Fever, Ward NBB, Medicard) ---
const santosItems: ChargemasterItem[] = [
  {
    id: 'item-301',
    code: 'RM-WARD-01',
    description: 'PhilHealth Ward Accommodation (3 Days)',
    category: 'ROOM_BOARD',
    qty: 3,
    unitPrice: 1000.0,
    grossAmount: 3000.0,
    isVatable: true,
    philhealthCovered: 3000.0,
    hmoCovered: 0,
    patientOop: 0,
    status: 'COVERED',
    plainLanguageExplainer: 'PhilHealth No Balance Billing (NBB) ward accommodation.'
  },
  {
    id: 'item-302',
    code: 'RX-D5LR-1L',
    description: 'D5 LRS 1000mL IV Infusion with Venoset',
    category: 'PHARMACY',
    qty: 8,
    unitPrice: 350.0,
    grossAmount: 2800.0,
    isVatable: true,
    philhealthCovered: 2200.0,
    hmoCovered: 600.0,
    patientOop: 0,
    status: 'COVERED',
    plainLanguageExplainer: 'Intravenous hydration therapy fully covered.'
  },
  {
    id: 'item-303',
    code: 'LAB-PLT-SER',
    description: 'Serial Platelet Count Monitoring (Every 12h x 6)',
    category: 'LABORATORY',
    qty: 6,
    unitPrice: 450.0,
    grossAmount: 2700.0,
    isVatable: true,
    philhealthCovered: 1900.0,
    hmoCovered: 800.0,
    patientOop: 0,
    status: 'COVERED',
    plainLanguageExplainer: 'Serial hematology for dengue thrombocytopenia tracking.'
  },
  {
    id: 'item-304',
    code: 'PF-CRUZ-WARD',
    description: 'Attending Physician Inpatient Pediatric/Adult Ward Care',
    category: 'PROFESSIONAL_FEE',
    qty: 1,
    unitPrice: 8500.0,
    grossAmount: 8500.0,
    isVatable: false,
    philhealthCovered: 3900.0,
    hmoCovered: 4600.0,
    patientOop: 0,
    status: 'COVERED',
    plainLanguageExplainer: 'Physician fee completely covered between PhilHealth case rate and Medicard.'
  }
];

// --- 4. Rebecca C. Tan (Gastroenteritis, Senior Citizen, PhilCare) ---
const tanItems: ChargemasterItem[] = [
  {
    id: 'item-401',
    code: 'RM-PRIV-512',
    description: 'Private Room Inpatient Care (3 Days)',
    category: 'ROOM_BOARD',
    qty: 3,
    unitPrice: 3200.0,
    grossAmount: 9600.0,
    isVatable: true,
    philhealthCovered: 0,
    hmoCovered: 6000.0,
    patientOop: 3600.0,
    status: 'COVERED',
    plainLanguageExplainer: 'Room differential of ₱1,200/day above PhilCare daily allowance of ₱2,000.'
  },
  {
    id: 'item-402',
    code: 'RX-CIPRO-IV',
    description: 'Ciprofloxacin 400mg IV Infusion',
    category: 'PHARMACY',
    qty: 6,
    unitPrice: 950.0,
    grossAmount: 5700.0,
    isVatable: true,
    philhealthCovered: 2800.0,
    hmoCovered: 2900.0,
    patientOop: 0,
    status: 'COVERED',
    plainLanguageExplainer: 'Antibiotic therapy covered under PhilHealth gastroenteritis case rate.'
  },
  {
    id: 'item-403',
    code: 'CSR-DIAP-ADLT',
    description: 'Medical Underpads & Disposable Incontinence Briefs',
    category: 'CENTRAL_SUPPLIES',
    qty: 3,
    unitPrice: 400.0,
    grossAmount: 1200.0,
    isVatable: true,
    philhealthCovered: 0,
    hmoCovered: 350.0,
    patientOop: 850.0,
    status: 'DISALLOWED_SUNDRY',
    plainLanguageExplainer: 'Bedside hygiene consumables partially disallowed by PhilCare.'
  },
  {
    id: 'item-404',
    code: 'PF-REYES-TAN',
    description: 'Attending Physician Hospital Care (Dr. Manuel Reyes)',
    category: 'PROFESSIONAL_FEE',
    qty: 1,
    unitPrice: 14000.0,
    grossAmount: 14000.0,
    isVatable: false,
    philhealthCovered: 3300.0,
    hmoCovered: 6700.0,
    patientOop: 4000.0,
    status: 'EXCESS_PF',
    plainLanguageExplainer: 'Declared PF exceeds PhilCare contracted ceiling by ₱4,000. Awaiting operator ceiling application.'
  }
];

// --- 5. Eduardo P. Garcia (Hypertensive Crisis, Pacific Cross) ---
const garciaItems: ChargemasterItem[] = [
  {
    id: 'item-501',
    code: 'RM-TELE-210',
    description: 'Cardiac Telemetry Step-Down Bed (3 Days)',
    category: 'ROOM_BOARD',
    qty: 3,
    unitPrice: 2000.0,
    grossAmount: 6000.0,
    isVatable: true,
    philhealthCovered: 0,
    hmoCovered: 4500.0,
    patientOop: 1500.0,
    status: 'COVERED',
    plainLanguageExplainer: 'Telemetry monitoring bed rate excess of ₱500/day above Pacific Cross allowance.'
  },
  {
    id: 'item-502',
    code: 'RX-NICA-IV',
    description: 'Nicardipine HCl 25mg IV Infusion Titration',
    category: 'PHARMACY',
    qty: 4,
    unitPrice: 2400.0,
    grossAmount: 9600.0,
    isVatable: true,
    philhealthCovered: 4200.0,
    hmoCovered: 5400.0,
    patientOop: 0,
    status: 'COVERED',
    plainLanguageExplainer: 'Continuous IV antihypertensive infusion for blood pressure control.'
  },
  {
    id: 'item-503',
    code: 'RX-NOREP-4MG',
    description: 'Norepinephrine 4mg/4mL Ampoules (Unreturned Meds)',
    category: 'PHARMACY',
    qty: 2,
    unitPrice: 1200.0,
    grossAmount: 2400.0,
    isVatable: true,
    philhealthCovered: 0,
    hmoCovered: 0,
    patientOop: 2400.0,
    status: 'CONTESTED',
    isDisputed: true,
    disputeReason: 'Pharmacy RTS audit pending. 2 unreturned ampoules on ward crash cart require return credit slip.',
    plainLanguageExplainer: 'Unreturned medication currently blocking discharge until pharmacy return credit slip is generated.'
  },
  {
    id: 'item-504',
    code: 'PF-GOMEZ-CARD',
    description: 'Cardiology Consultant Daily ICU Rounds & Telemetry Sign-off',
    category: 'PROFESSIONAL_FEE',
    qty: 1,
    unitPrice: 25000.0,
    grossAmount: 25000.0,
    isVatable: false,
    philhealthCovered: 3600.0,
    hmoCovered: 16400.0,
    patientOop: 5000.0,
    status: 'EXCESS_PF',
    plainLanguageExplainer: 'Cardiologist declared fee ₱25,000 exceeds Pacific Cross tariff by ₱5,000.'
  }
];

// --- 6. Corazon D. Mendoza (CKD-5, Senior Citizen, Cleared Case, Maxicare) ---
const mendozaItems: ChargemasterItem[] = [
  {
    id: 'item-601',
    code: 'RM-WARD-314',
    description: 'Ward Bed Accommodation (2 Days)',
    category: 'ROOM_BOARD',
    qty: 2,
    unitPrice: 1000.0,
    grossAmount: 2000.0,
    isVatable: true,
    philhealthCovered: 2000.0,
    hmoCovered: 0,
    patientOop: 0,
    status: 'COVERED',
    plainLanguageExplainer: 'Standard ward stay covered under PhilHealth dialysis benefit package.'
  },
  {
    id: 'item-602',
    code: 'HEMO-SESS-01',
    description: 'Inpatient Hemodialysis Treatment Session with High-Flux Dialyzer',
    category: 'ROOM_BOARD',
    qty: 2,
    unitPrice: 4500.0,
    grossAmount: 9000.0,
    isVatable: true,
    philhealthCovered: 5200.0,
    hmoCovered: 3800.0,
    patientOop: 0,
    status: 'COVERED',
    plainLanguageExplainer: 'PhilHealth Hemodialysis bundle (Circular 2024-0023).'
  },
  {
    id: 'item-603',
    code: 'PF-CRUZ-NEPH',
    description: 'Nephrology Inpatient Hemodialysis Supervision',
    category: 'PROFESSIONAL_FEE',
    qty: 1,
    unitPrice: 6000.0,
    grossAmount: 6000.0,
    isVatable: false,
    philhealthCovered: 2400.0,
    hmoCovered: 3600.0,
    patientOop: 0,
    status: 'COVERED',
    plainLanguageExplainer: 'Professional fee 100% reconciled and covered between PhilHealth and Maxicare.'
  }
];

// --- 7. Arthur V. Alcantara (Lap Chole, Maxicare Platinum, CF4 Discrepancy) ---
const alcantaraItems: ChargemasterItem[] = [
  {
    id: 'item-701',
    code: 'RM-PRIV-408',
    description: 'Regular Private Room (4 Days)',
    category: 'ROOM_BOARD',
    qty: 4,
    unitPrice: 3500.0,
    grossAmount: 14000.0,
    isVatable: true,
    philhealthCovered: 0,
    hmoCovered: 8000.0,
    patientOop: 6000.0,
    status: 'COVERED',
    plainLanguageExplainer: 'Daily room charge of ₱3,500 vs ₱2,000 policy cap.'
  },
  {
    id: 'item-702',
    code: 'OR-LAP-TOWER',
    description: 'High-Definition Laparoscopy Tower, Insufflator & Video System',
    category: 'ROOM_BOARD',
    qty: 1,
    unitPrice: 35000.0,
    grossAmount: 35000.0,
    isVatable: true,
    philhealthCovered: 12000.0,
    hmoCovered: 23000.0,
    patientOop: 0,
    status: 'COVERED',
    plainLanguageExplainer: 'Laparoscopic instrumentation covered by Maxicare Platinum.'
  },
  {
    id: 'item-703',
    code: 'CSR-ENDO-CLIP',
    description: 'Endosurgical Titanium Hemoclip Cartridges (Pack of 3)',
    category: 'CENTRAL_SUPPLIES',
    qty: 3,
    unitPrice: 1800.0,
    grossAmount: 5400.0,
    isVatable: true,
    philhealthCovered: 0,
    hmoCovered: 2200.0,
    patientOop: 3200.0,
    status: 'DISALLOWED_SUNDRY',
    exclusionReasonClause: 'Maxicare Schedule 8 (Extra Hemoclip consumables)',
    plainLanguageExplainer: 'Consumable clips in excess of baseline allowance billed to patient.'
  },
  {
    id: 'item-704',
    code: 'PF-ABAD-CHOLE',
    description: 'Laparoscopic Cholecystectomy Surgeon Fee (Dr. Cristina Abad)',
    category: 'PROFESSIONAL_FEE',
    qty: 1,
    unitPrice: 38000.0,
    grossAmount: 38000.0,
    isVatable: false,
    philhealthCovered: 19000.0,
    hmoCovered: 11000.0,
    patientOop: 8000.0,
    status: 'EXCESS_PF',
    plainLanguageExplainer: 'Surgeon fee exceeds contracted tariff ceiling by ₱8,000.'
  }
];

// --- 8. Maria Clara O. Bautista (C-Section, Intellicare, Contested PF) ---
const bautistaItems: ChargemasterItem[] = [
  {
    id: 'item-801',
    code: 'RM-SEMI-318',
    description: 'Semi-Private Room (3 Days)',
    category: 'ROOM_BOARD',
    qty: 3,
    unitPrice: 2200.0,
    grossAmount: 6600.0,
    isVatable: true,
    philhealthCovered: 0,
    hmoCovered: 5400.0,
    patientOop: 1200.0,
    status: 'COVERED',
    plainLanguageExplainer: 'Semi-private room rate ₱2,200/day vs Intellicare allowance ₱1,800/day.'
  },
  {
    id: 'item-802',
    code: 'OR-DELIV-PACK',
    description: 'Obstetric Cesarean Delivery Pack & Newborn Resuscitation Kit',
    category: 'ROOM_BOARD',
    qty: 1,
    unitPrice: 32000.0,
    grossAmount: 32000.0,
    isVatable: true,
    philhealthCovered: 11200.0,
    hmoCovered: 20800.0,
    patientOop: 0,
    status: 'COVERED',
    plainLanguageExplainer: 'C-Section delivery room and sterile newborn pack.'
  },
  {
    id: 'item-803',
    code: 'PF-LIM-OBGYN',
    description: 'Primary Obstetrician Surgeon Fee (Dr. Patricia Lim)',
    category: 'PROFESSIONAL_FEE',
    qty: 1,
    unitPrice: 28000.0,
    grossAmount: 28000.0,
    isVatable: false,
    philhealthCovered: 11200.0,
    hmoCovered: 11800.0,
    patientOop: 5000.0,
    status: 'EXCESS_PF',
    plainLanguageExplainer: 'Primary OB fee excess of ₱5,000 above Intellicare schedule.'
  },
  {
    id: 'item-804',
    code: 'PF-ASST-SURG',
    description: 'Assistant Surgeon Fee: C-Section Extraction & Peritoneal Closure',
    category: 'PROFESSIONAL_FEE',
    qty: 1,
    unitPrice: 12500.0,
    grossAmount: 12500.0,
    isVatable: false,
    philhealthCovered: 0,
    hmoCovered: 0,
    patientOop: 12500.0,
    status: 'CONTESTED',
    isDisputed: true,
    disputeReason:
      'Patient husband vehemently contests unannounced assistant surgeon fee of ₱12,500 not disclosed during pre-admission orientation.',
    plainLanguageExplainer:
      'Contested professional fee under urgent review by Revenue Cycle Specialist and Medical Director.'
  }
];

// --- 9. Rolando T. Gutierrez (Stroke, Senior & PWD, Medicard, Promissory Note) ---
const gutierrezItems: ChargemasterItem[] = [
  {
    id: 'item-901',
    code: 'RM-PRIV-506',
    description: 'Neurology Inpatient Monitoring Room (6 Days)',
    category: 'ROOM_BOARD',
    qty: 6,
    unitPrice: 3000.0,
    grossAmount: 18000.0,
    isVatable: true,
    philhealthCovered: 0,
    hmoCovered: 9000.0,
    patientOop: 9000.0,
    status: 'COVERED',
    plainLanguageExplainer: 'Room differential of ₱1,500/day for 6 days of post-stroke monitoring.'
  },
  {
    id: 'item-902',
    code: 'RAD-CT-BRAIN',
    description: 'Plain Cranial CT Scan with 3D Brain Perfusion Reconstruction',
    category: 'LABORATORY',
    qty: 2,
    unitPrice: 6500.0,
    grossAmount: 13000.0,
    isVatable: true,
    philhealthCovered: 5200.0,
    hmoCovered: 6500.0,
    patientOop: 0,
    status: 'COVERED',
    plainLanguageExplainer: 'Emergency neuro-imaging covered under stroke case rate.'
  },
  {
    id: 'item-903',
    code: 'RX-CITI-1G',
    description: 'Citicoline Sodium 1g IV Injection (Pack of 12)',
    category: 'PHARMACY',
    qty: 12,
    unitPrice: 850.0,
    grossAmount: 10200.0,
    isVatable: true,
    philhealthCovered: 3800.0,
    hmoCovered: 5400.0,
    patientOop: 0,
    status: 'COVERED',
    plainLanguageExplainer: 'Neuroprotective medication covered under Medicard formulary.'
  },
  {
    id: 'item-904',
    code: 'PF-REYES-NEURO',
    description: 'Attending Neurologist Inpatient Critical Care & Daily Rounds',
    category: 'PROFESSIONAL_FEE',
    qty: 1,
    unitPrice: 35000.0,
    grossAmount: 35000.0,
    isVatable: false,
    philhealthCovered: 11000.0,
    hmoCovered: 14100.0,
    patientOop: 9900.0,
    status: 'EXCESS_PF',
    plainLanguageExplainer: 'Neurologist fee remaining balance after Medicard MBL limit reached.'
  }
];

// --- 10. Lourdes E. Villanueva (TKA Knee Replacement, Senior, Pacific Cross) ---
const villanuevaItems: ChargemasterItem[] = [
  {
    id: 'item-1001',
    code: 'RM-DELUX-415',
    description: 'Private Deluxe Suite (4 Days)',
    category: 'ROOM_BOARD',
    qty: 4,
    unitPrice: 4000.0,
    grossAmount: 16000.0,
    isVatable: true,
    philhealthCovered: 0,
    hmoCovered: 8000.0,
    patientOop: 8000.0,
    status: 'COVERED',
    plainLanguageExplainer: 'Upgrade differential of ₱2,000/day above Pacific Cross base allowance of ₱2,000.'
  },
  {
    id: 'item-1002',
    code: 'OR-TKA-IMPL',
    description: 'Total Knee Arthroplasty Joint Replacement Instrumentation Pack',
    category: 'ROOM_BOARD',
    qty: 1,
    unitPrice: 65000.0,
    grossAmount: 65000.0,
    isVatable: true,
    philhealthCovered: 24000.0,
    hmoCovered: 41000.0,
    patientOop: 0,
    status: 'COVERED',
    plainLanguageExplainer: 'Orthopedic surgical OR suite and joint instrumentation.'
  },
  {
    id: 'item-1003',
    code: 'CSR-BONE-CEM',
    description: 'Palacos R+G Bone Cement with Gentamicin (2 Packs)',
    category: 'CENTRAL_SUPPLIES',
    qty: 2,
    unitPrice: 4250.0,
    grossAmount: 8500.0,
    isVatable: true,
    philhealthCovered: 0,
    hmoCovered: 0,
    patientOop: 6071.43,
    status: 'CONTESTED',
    isDisputed: true,
    disputeReason:
      'Pacific Cross adjuster struck out antibiotic bone cement as an excluded sundry. Orthopedic surgeon filed urgent reconsideration appeal.',
    plainLanguageExplainer:
      'Antibiotic bone cement disallowed by insurer. Currently disputed to prevent discharge out-of-pocket payment.'
  },
  {
    id: 'item-1004',
    code: 'CSR-WOUND-VAC',
    description: 'Negative Pressure Wound Therapy Exudate Canister Kit',
    category: 'CENTRAL_SUPPLIES',
    qty: 1,
    unitPrice: 5700.0,
    grossAmount: 5700.0,
    isVatable: true,
    philhealthCovered: 0,
    hmoCovered: 0,
    patientOop: 4071.43,
    status: 'DISALLOWED_SUNDRY',
    exclusionReasonClause: 'Pacific Cross Policy Clause 9.2 (Specialized Wound Consumables)',
    plainLanguageExplainer: 'Post-op negative pressure dressing kit excluded by insurer.'
  },
  {
    id: 'item-1005',
    code: 'PF-SANTOS-ORTHO',
    description: 'Orthopedic Surgeon Operative Fee (Dr. Enrico Santos)',
    category: 'PROFESSIONAL_FEE',
    qty: 1,
    unitPrice: 45000.0,
    grossAmount: 45000.0,
    isVatable: false,
    philhealthCovered: 21000.0,
    hmoCovered: 18000.0,
    patientOop: 6000.0,
    status: 'EXCESS_PF',
    plainLanguageExplainer: 'Orthopedic surgeon declared fee exceeds tariff ceiling by ₱6,000.'
  }
];

// --- 11. Danilo J. Soriano (Diabetic Foot Ulcer, Ward, PhilCare) ---
const sorianoItems: ChargemasterItem[] = [
  {
    id: 'item-1101',
    code: 'RM-WARD-208',
    description: 'Surgical Ward Bed (4 Days)',
    category: 'ROOM_BOARD',
    qty: 4,
    unitPrice: 1000.0,
    grossAmount: 4000.0,
    isVatable: true,
    philhealthCovered: 4000.0,
    hmoCovered: 0,
    patientOop: 0,
    status: 'COVERED',
    plainLanguageExplainer: 'Ward stay 100% covered under PhilHealth case rate.'
  },
  {
    id: 'item-1102',
    code: 'OR-DEBRID-SURG',
    description: 'Extensive Surgical Debridement of Diabetic Necrotic Tissue',
    category: 'ROOM_BOARD',
    qty: 1,
    unitPrice: 16000.0,
    grossAmount: 16000.0,
    isVatable: true,
    philhealthCovered: 7200.0,
    hmoCovered: 8800.0,
    patientOop: 0,
    status: 'COVERED',
    plainLanguageExplainer: 'Surgical wound excision and tissue debridement.'
  },
  {
    id: 'item-1103',
    code: 'RX-SILV-CREAM',
    description: 'Silver Sulfadiazine 1% 500g Topical Ointment (Unopened)',
    category: 'PHARMACY',
    qty: 1,
    unitPrice: 1250.0,
    grossAmount: 1250.0,
    isVatable: true,
    philhealthCovered: 0,
    hmoCovered: 0,
    patientOop: 1250.0,
    status: 'CONTESTED',
    isDisputed: true,
    disputeReason: 'Ward returned 1 unopened tube to pharmacy for Return-To-Stock (RTS) credit slip.',
    plainLanguageExplainer: 'Unopened medication returned to central pharmacy for billing credit.'
  },
  {
    id: 'item-1104',
    code: 'PF-ABAD-WOUND',
    description: 'Surgical Specialist Inpatient Care & Wound Cleansing',
    category: 'PROFESSIONAL_FEE',
    qty: 1,
    unitPrice: 12000.0,
    grossAmount: 12000.0,
    isVatable: false,
    philhealthCovered: 4800.0,
    hmoCovered: 7200.0,
    patientOop: 0,
    status: 'COVERED',
    plainLanguageExplainer: 'Surgeon debridement fee fully covered between PhilHealth and PhilCare.'
  }
];

// --- 12. Josefina R. Aquino (Unstable Angina, Semi-Private, Maxicare) ---
const aquinoItems: ChargemasterItem[] = [
  {
    id: 'item-1201',
    code: 'RM-SEMI-322',
    description: 'Semi-Private Room (3 Days)',
    category: 'ROOM_BOARD',
    qty: 3,
    unitPrice: 2000.0,
    grossAmount: 6000.0,
    isVatable: true,
    philhealthCovered: 0,
    hmoCovered: 4500.0,
    patientOop: 1500.0,
    status: 'COVERED',
    plainLanguageExplainer: 'Semi-private room rate of ₱2,000/day vs Maxicare allowance of ₱1,500/day.'
  },
  {
    id: 'item-1202',
    code: 'CARD-STRESS-TEST',
    description: 'Cardiac Treadmill Stress Test with Continuous 12-Lead ECG',
    category: 'LABORATORY',
    qty: 1,
    unitPrice: 8500.0,
    grossAmount: 8500.0,
    isVatable: true,
    philhealthCovered: 3500.0,
    hmoCovered: 5000.0,
    patientOop: 0,
    status: 'COVERED',
    plainLanguageExplainer: 'Cardiovascular stress investigation awaiting Maxicare final authorization code.'
  },
  {
    id: 'item-1203',
    code: 'PF-GOMEZ-ANGINA',
    description: 'Attending Cardiologist Inpatient Care (Dr. Fernando Gomez)',
    category: 'PROFESSIONAL_FEE',
    qty: 1,
    unitPrice: 15000.0,
    grossAmount: 15000.0,
    isVatable: false,
    philhealthCovered: 4500.0,
    hmoCovered: 7500.0,
    patientOop: 3000.0,
    status: 'EXCESS_PF',
    plainLanguageExplainer: 'Cardiologist fee remaining balance of ₱3,000 above Maxicare schedule.'
  }
];

// --- 13. Ferdinand G. Navarro (Femur Fracture ORIF, Cleared, Intellicare) ---
const navarroItems: ChargemasterItem[] = [
  {
    id: 'item-1301',
    code: 'RM-SEMI-602',
    description: 'Orthopedic Semi-Private Room (4 Days)',
    category: 'ROOM_BOARD',
    qty: 4,
    unitPrice: 1800.0,
    grossAmount: 7200.0,
    isVatable: true,
    philhealthCovered: 0,
    hmoCovered: 6000.0,
    patientOop: 1200.0,
    status: 'COVERED',
    plainLanguageExplainer: 'Room differential of ₱300/day above Intellicare allowance.'
  },
  {
    id: 'item-1302',
    code: 'OR-ORIF-NAIL',
    description: 'OR Titanium Intramedullary Interlocking Femur Nail Set',
    category: 'ROOM_BOARD',
    qty: 1,
    unitPrice: 58000.0,
    grossAmount: 58000.0,
    isVatable: true,
    philhealthCovered: 18000.0,
    hmoCovered: 40000.0,
    patientOop: 0,
    status: 'COVERED',
    plainLanguageExplainer: 'Trauma orthopedic surgical implant package.'
  },
  {
    id: 'item-1303',
    code: 'PF-SANTOS-TRAUMA',
    description: 'Orthopedic Trauma Surgeon Fee (Dr. Enrico Santos)',
    category: 'PROFESSIONAL_FEE',
    qty: 1,
    unitPrice: 28000.0,
    grossAmount: 28000.0,
    isVatable: false,
    philhealthCovered: 12800.0,
    hmoCovered: 10000.0,
    patientOop: 5200.0,
    status: 'EXCESS_PF',
    plainLanguageExplainer: 'Surgeon fee balance settled via QR Ph at cashier counter.'
  }
];

// --- 14. Teresa L. Dimaculangan (Heart Failure, Senior, Medicard, MDR Issue) ---
const dimaculanganItems: ChargemasterItem[] = [
  {
    id: 'item-1401',
    code: 'RM-PRIV-518',
    description: 'Private Cardiac Step-Down Room (3 Days)',
    category: 'ROOM_BOARD',
    qty: 3,
    unitPrice: 3200.0,
    grossAmount: 9600.0,
    isVatable: true,
    philhealthCovered: 0,
    hmoCovered: 5400.0,
    patientOop: 4200.0,
    status: 'COVERED',
    plainLanguageExplainer: 'Room differential of ₱1,400/day above Medicard allowance.'
  },
  {
    id: 'item-1402',
    code: 'RX-FURO-INFUS',
    description: 'Furosemide 100mg IV Continuous Infusion with Syringe Pump',
    category: 'PHARMACY',
    qty: 3,
    unitPrice: 1200.0,
    grossAmount: 3600.0,
    isVatable: true,
    philhealthCovered: 1800.0,
    hmoCovered: 1800.0,
    patientOop: 0,
    status: 'COVERED',
    plainLanguageExplainer: 'Diuretic therapy covered under heart failure benefit package.'
  },
  {
    id: 'item-1403',
    code: 'PF-GOMEZ-CHF',
    description: 'Cardiologist Hospital Care & Discharge Prescription',
    category: 'PROFESSIONAL_FEE',
    qty: 1,
    unitPrice: 16000.0,
    grossAmount: 16000.0,
    isVatable: false,
    philhealthCovered: 4800.0,
    hmoCovered: 8200.0,
    patientOop: 3000.0,
    status: 'EXCESS_PF',
    plainLanguageExplainer: 'Cardiologist excess PF of ₱3,000 above Medicard tariff.'
  }
];

// --- 15. Ramon K. Castillo (Bleeding Peptic Ulcer, Pacific Cross, In Cashier Line) ---
const castilloItems: ChargemasterItem[] = [
  {
    id: 'item-1501',
    code: 'RM-SEMI-214',
    description: 'Semi-Private Room (3 Days)',
    category: 'ROOM_BOARD',
    qty: 3,
    unitPrice: 2000.0,
    grossAmount: 6000.0,
    isVatable: true,
    philhealthCovered: 0,
    hmoCovered: 4500.0,
    patientOop: 1500.0,
    status: 'COVERED',
    plainLanguageExplainer: 'Semi-private room rate of ₱2,000/day vs ₱1,500 allowance.'
  },
  {
    id: 'item-1502',
    code: 'ENDO-HEMO-SUITE',
    description: 'Emergency Upper Endoscopy Suite & Hemoclip Deployment',
    category: 'ROOM_BOARD',
    qty: 1,
    unitPrice: 24000.0,
    grossAmount: 24000.0,
    isVatable: true,
    philhealthCovered: 8400.0,
    hmoCovered: 11000.0,
    patientOop: 4600.0,
    status: 'PARTIAL',
    plainLanguageExplainer: 'Endoscopic clip cartridges partially excluded by Pacific Cross policy.'
  },
  {
    id: 'item-1503',
    code: 'PF-REYES-GI',
    description: 'Gastroenterologist Diagnostic & Therapeutic Endoscopy Fee',
    category: 'PROFESSIONAL_FEE',
    qty: 1,
    unitPrice: 22000.0,
    grossAmount: 22000.0,
    isVatable: false,
    philhealthCovered: 7600.0,
    hmoCovered: 9300.0,
    patientOop: 5100.0,
    status: 'EXCESS_PF',
    plainLanguageExplainer: 'Specialist endoscopist fee excess currently being settled at cashier counter.'
  }
];

// ============================================================================
// 2. TIMELINE HISTORIES PER ENCOUNTER
// ============================================================================

const createTimeline = (events: Omit<EncounterTimelineEvent, 'id'>[]): EncounterTimelineEvent[] => {
  return events.map((e, idx) => ({
    id: `tle-${idx + 1}-${Math.random().toString(36).substr(2, 6)}`,
    ...e
  }));
};

// ============================================================================
// 3. MASTER ENCOUNTERS ROSTER (15 INTERCONNECTED ENCOUNTERS)
// ============================================================================

export const RAW_INITIAL_ENCOUNTERS: Encounter[] = [
  // 1. Juan S. Dela Cruz - HMO Code Delay + Dispute
  {
    id: 'enc-8812',
    encounterNumber: 'ENC-2026-8812',
    patient: {
      id: 'pat-101',
      mrn: 'MRN-2026-8812',
      maskedName: 'DELA CRUZ, Juan S.',
      philhealthPin: '12-0254-9128-1',
      isSeniorCitizen: true,
      isPwd: true,
      age: 68,
      gender: 'M',
      contactNumber: '0917-881-8812'
    },
    roomBed: 'Bed 412',
    roomCategory: 'REGULAR_PRIVATE',
    dailyRoomRate: 3000.0,
    dailyRoomAllowance: 1500.0,
    admissionDate: '2026-09-21',
    mghOrderTimestamp: '2026-09-25T10:14:00+08:00',
    attendingDoctor: 'Dr. Carlos Mendoza, FPCP',
    doctorPan: 'PAN-1092-4418',
    doctorAgreedFee: 21000.0,
    doctorExcessPf: 10000.0,
    doctorSignedAt: null,
    pharmacyRtsCleared: false,
    unreturnedMedsCount: 0,
    stage: 'DOCTOR_PF_PENDING',
    elapsedMinutes: 32,
    slaStatus: 'WARNING',
    primaryDiagnosis: 'Moderate Risk Pneumonia',
    primaryIcd10: 'J18.9',
    hmo: {
      providerName: 'Maxicare',
      cardMasked: 'MX-9921-****-2041',
      policyMbl: 150000.0,
      mblRemaining: 138400.0,
      dailyRoomAllowance: 1500.0,
      initialLoaApproved: true,
      finalLoaStatus: 'AWAITING_CODE',
      approvedAmount: 50514.29,
      disallowedConsumables: 4200.0,
      turnaroundMinutes: 52,
      adjusterName: 'Sarah Dimasupil',
      adjusterContact: 'sarah.d@maxicare.com.ph'
    },
    philhealth: {
      id: 'claim-ph-8812',
      primaryIcd10: 'J18.9',
      primaryDescription: 'Pneumonia, Unspecified Organism (Moderate Risk)',
      caseRateCode: 'J18.9',
      totalCaseRate: 15000.0,
      hciAmount: 10500.0,
      pfAmount: 4500.0,
      isNbb: false,
      rthRiskScore: 0.01,
      cf4VitalsRecorded: true,
      cf4CourseInWardRecorded: true,
      cf4LabsConsistent: true,
      eSoaXmlConformity: true,
      status: 'CLEAN',
      claimAgingDays: 1,
      assignedAuditor: 'Grace Tan'
    },
    items: delaCruzItems,
    waterfall: recalculateWaterfall(delaCruzItems, true, 10500.0, 4500.0, 50514.29, 6000.0, 10000.0),
    disputes: [
      {
        id: 'disp-01',
        encounterId: 'enc-8812',
        itemId: 'item-104',
        itemDescription: 'Suction Catheter 14Fr with Vent (Pack of 6)',
        contestedAmount: 1928.57,
        reason: 'Patient son states catheters were brought from home pharmacy during admission.',
        status: 'OPEN',
        createdAt: '2026-09-25T10:28:00+08:00',
        assignedStaff: 'Elena Santos (Billing Specialist)',
        department: 'Central Supplies'
      }
    ],
    timeline: createTimeline([
      {
        timestamp: '2026-09-25T10:14:00+08:00',
        timeDisplay: '10:14 AM',
        title: 'MGH Order Declared',
        description: 'Attending physician Dr. Manuel Reyes entered May Go Home order in HIS.',
        actor: 'Dr. Manuel Reyes',
        type: 'CLINICAL',
        status: 'COMPLETED'
      },
      {
        timestamp: '2026-09-25T10:21:00+08:00',
        timeDisplay: '10:21 AM',
        title: 'Doctor PF Confirmed',
        description: 'Specialist declared fee ₱21,000 confirmed (₱10,000 excess above Maxicare tariff).',
        actor: 'Dr. Manuel Reyes',
        type: 'BILLING',
        status: 'COMPLETED'
      },
      {
        timestamp: '2026-09-25T10:25:00+08:00',
        timeDisplay: '10:25 AM',
        title: 'Pharmacy RTS Cleared',
        description: 'Zero unreturned ward medications. Pharmacy credit audit complete.',
        actor: 'Central Pharmacy',
        type: 'PHARMACY',
        status: 'COMPLETED'
      },
      {
        timestamp: '2026-09-25T10:28:00+08:00',
        timeDisplay: '10:28 AM',
        title: 'Dispute Logged on Catheters',
        description: 'Patient son contested ₱1,928.57 for suction catheters brought from home.',
        actor: 'Elena Santos',
        type: 'LEGAL',
        status: 'BLOCKED'
      },
      {
        timestamp: '2026-09-25T10:35:00+08:00',
        timeDisplay: '10:35 AM',
        title: 'Maxicare eLOA Transmitted - Awaiting Code',
        description: 'Billing specialist transmitted final eSOA to Maxicare EDI portal. Awaiting authorization lock.',
        actor: 'Marco Valenzuela (HMO Liaison)',
        type: 'PAYER',
        status: 'PENDING'
      }
    ])
  },

  // 2. Luisa M. Ramos - Cashier Line Settlement Delay
  {
    id: 'enc-7731',
    encounterNumber: 'ENC-2026-7731',
    patient: {
      id: 'pat-102',
      mrn: 'MRN-773124',
      maskedName: 'RAMOS, Luisa M.',
      philhealthPin: '08-9921-4412-3',
      isSeniorCitizen: false,
      isPwd: true,
      age: 45,
      gender: 'F',
      contactNumber: '+63 920 882 1194'
    },
    roomBed: 'Bed 304',
    roomCategory: 'SEMI_PRIVATE',
    dailyRoomRate: 1800.0,
    dailyRoomAllowance: 1500.0,
    admissionDate: '2026-09-22',
    mghOrderTimestamp: '2026-09-25T10:08:00+08:00',
    attendingDoctor: 'Dr. Cristina Abad, FPCS',
    doctorPan: 'PAN-8812-7719',
    doctorAgreedFee: 18000.0,
    doctorExcessPf: 3000.0,
    doctorSignedAt: '2026-09-25T10:18:00+08:00',
    pharmacyRtsCleared: true,
    unreturnedMedsCount: 0,
    stage: 'PENDING_SETTLEMENT',
    elapsedMinutes: 38,
    slaStatus: 'WARNING',
    primaryDiagnosis: 'Acute Appendicitis w/ Peritonitis',
    primaryIcd10: 'K35.8',
    hmo: {
      providerName: 'Intellicare',
      cardMasked: 'IN-4401-****-9102',
      policyMbl: 200000.0,
      mblRemaining: 172000.0,
      dailyRoomAllowance: 1500.0,
      initialLoaApproved: true,
      finalLoaStatus: 'APPROVED',
      approvalCode: 'INT-APV-882910',
      approvedAmount: 32121.43,
      disallowedConsumables: 1550.0,
      turnaroundMinutes: 24,
      adjusterName: 'Mark Villanueva',
      adjusterContact: 'mark.v@intellicare.net.ph'
    },
    philhealth: {
      id: 'claim-ph-7731',
      primaryIcd10: 'K35.8',
      primaryDescription: 'Other and Unspecified Acute Appendicitis',
      caseRateCode: '44950',
      totalCaseRate: 28000.0,
      hciAmount: 16800.0,
      pfAmount: 11200.0,
      isNbb: false,
      rthRiskScore: 0.02,
      cf4VitalsRecorded: true,
      cf4CourseInWardRecorded: true,
      cf4LabsConsistent: true,
      eSoaXmlConformity: true,
      status: 'CLEAN',
      claimAgingDays: 1,
      assignedAuditor: 'Grace Tan'
    },
    items: ramosItems,
    waterfall: recalculateWaterfall(ramosItems, true, 16800.0, 11200.0, 32121.43, 900.0, 3000.0),
    disputes: [],
    timeline: createTimeline([
      {
        timestamp: '2026-09-25T10:08:00+08:00',
        timeDisplay: '10:08 AM',
        title: 'MGH Order Declared',
        description: 'Dr. Cristina Abad confirmed surgical recovery and issued MGH order.',
        actor: 'Dr. Cristina Abad',
        type: 'CLINICAL',
        status: 'COMPLETED'
      },
      {
        timestamp: '2026-09-25T10:24:00+08:00',
        timeDisplay: '10:24 AM',
        title: 'Intellicare LOA Approved',
        description: 'Approval code INT-APV-882910 received for ₱32,121.43.',
        actor: 'Intellicare Portal',
        type: 'PAYER',
        status: 'COMPLETED'
      },
      {
        timestamp: '2026-09-25T10:32:00+08:00',
        timeDisplay: '10:32 AM',
        title: 'Awaiting Cashier Settlement',
        description: 'Patient waiting in main lobby cashier line for remaining ₱8,450 OOP settlement.',
        actor: 'Main Cashier',
        type: 'BILLING',
        status: 'BLOCKED'
      }
    ])
  },

  // 3. Miguel B. Santos - Clean Ward Case (PhilHealth NBB + Medicard)
  {
    id: 'enc-4401',
    encounterNumber: 'ENC-2026-4401',
    patient: {
      id: 'pat-103',
      mrn: 'MRN-440192',
      maskedName: 'SANTOS, Miguel B.',
      philhealthPin: '21-0881-2294-5',
      isSeniorCitizen: false,
      isPwd: false,
      age: 34,
      gender: 'M',
      contactNumber: '+63 918 334 0912'
    },
    roomBed: 'Bed 302-A',
    roomCategory: 'WARD',
    dailyRoomRate: 1000.0,
    dailyRoomAllowance: 1000.0,
    admissionDate: '2026-09-23',
    mghOrderTimestamp: '2026-09-25T10:40:00+08:00',
    attendingDoctor: 'Dr. Roberto Cruz, FPCP',
    doctorPan: 'PAN-3319-5501',
    doctorAgreedFee: 8500.0,
    doctorExcessPf: 0,
    pharmacyRtsCleared: true,
    unreturnedMedsCount: 0,
    stage: 'MGH_DECLARED',
    elapsedMinutes: 6,
    slaStatus: 'NORMAL',
    primaryDiagnosis: 'Dengue Fever with Warning Signs',
    primaryIcd10: 'A91',
    hmo: {
      providerName: 'Medicard',
      cardMasked: 'MC-2210-****-7819',
      policyMbl: 120000.0,
      mblRemaining: 112000.0,
      dailyRoomAllowance: 1000.0,
      initialLoaApproved: true,
      finalLoaStatus: 'APPROVED',
      approvalCode: 'MC-APV-102941',
      approvedAmount: 4600.0,
      disallowedConsumables: 0,
      turnaroundMinutes: 12,
      adjusterName: 'Carla De Jesus',
      adjusterContact: 'carla.dj@medicard.com.ph'
    },
    philhealth: {
      id: 'claim-ph-4401',
      primaryIcd10: 'A91',
      primaryDescription: 'Dengue Hemorrhagic Fever',
      caseRateCode: 'A91',
      totalCaseRate: 13000.0,
      hciAmount: 9100.0,
      pfAmount: 3900.0,
      isNbb: true,
      rthRiskScore: 0.01,
      cf4VitalsRecorded: true,
      cf4CourseInWardRecorded: true,
      cf4LabsConsistent: true,
      eSoaXmlConformity: true,
      status: 'CLEAN',
      claimAgingDays: 1,
      assignedAuditor: 'Grace Tan'
    },
    items: santosItems,
    waterfall: recalculateWaterfall(santosItems, false, 9100.0, 3900.0, 4600.0, 0, 0),
    disputes: [],
    timeline: createTimeline([
      {
        timestamp: '2026-09-25T10:40:00+08:00',
        timeDisplay: '10:40 AM',
        title: 'MGH Order Issued',
        description: 'Platelet count normalized (>120k). Dr. Cruz entered discharge order.',
        actor: 'Dr. Roberto Cruz',
        type: 'CLINICAL',
        status: 'COMPLETED'
      },
      {
        timestamp: '2026-09-25T10:43:00+08:00',
        timeDisplay: '10:43 AM',
        title: 'PhilHealth NBB Validated',
        description: 'Ward No Balance Billing policy validated. ₱0.00 patient out-of-pocket confirmed.',
        actor: 'Elena Santos',
        type: 'BILLING',
        status: 'COMPLETED'
      }
    ])
  },

  // 4. Rebecca C. Tan - Doctor Excess PF Sign-off Pending
  {
    id: 'enc-5512',
    encounterNumber: 'ENC-2026-5512',
    patient: {
      id: 'pat-104',
      mrn: 'MRN-551209',
      maskedName: 'TAN, Rebecca C.',
      philhealthPin: '04-1229-8801-7',
      isSeniorCitizen: true,
      isPwd: false,
      age: 71,
      gender: 'F',
      contactNumber: '+63 922 991 4452'
    },
    roomBed: 'Bed 512-B',
    roomCategory: 'REGULAR_PRIVATE',
    dailyRoomRate: 3200.0,
    dailyRoomAllowance: 2000.0,
    admissionDate: '2026-09-24',
    mghOrderTimestamp: '2026-09-25T10:32:00+08:00',
    attendingDoctor: 'Dr. Manuel Reyes, FPCP',
    doctorPan: 'PAN-1092-4418',
    doctorAgreedFee: 14000.0,
    doctorExcessPf: 4000.0,
    pharmacyRtsCleared: true,
    unreturnedMedsCount: 0,
    stage: 'DOCTOR_PF_PENDING',
    elapsedMinutes: 14,
    slaStatus: 'NORMAL',
    primaryDiagnosis: 'Acute Gastroenteritis w/ Dehydration',
    primaryIcd10: 'A09',
    hmo: {
      providerName: 'PhilCare',
      cardMasked: 'PC-8819-****-3310',
      policyMbl: 100000.0,
      mblRemaining: 92000.0,
      dailyRoomAllowance: 2000.0,
      initialLoaApproved: true,
      finalLoaStatus: 'PENDING_SUBMISSION',
      approvedAmount: 0,
      disallowedConsumables: 850.0,
      turnaroundMinutes: 30,
      adjusterName: 'Jason Pineda',
      adjusterContact: 'jason.p@philcare.com.ph'
    },
    philhealth: {
      id: 'claim-ph-5512',
      primaryIcd10: 'A09',
      primaryDescription: 'Gastroenteritis and Colitis of Unspecified Origin',
      caseRateCode: 'A09',
      totalCaseRate: 11000.0,
      hciAmount: 7700.0,
      pfAmount: 3300.0,
      isNbb: false,
      rthRiskScore: 0.04,
      cf4VitalsRecorded: true,
      cf4CourseInWardRecorded: true,
      cf4LabsConsistent: true,
      eSoaXmlConformity: true,
      status: 'CLEAN',
      claimAgingDays: 1,
      assignedAuditor: 'Grace Tan'
    },
    items: tanItems,
    waterfall: recalculateWaterfall(tanItems, true, 7700.0, 3300.0, 0, 3600.0, 4000.0),
    disputes: [],
    timeline: createTimeline([
      {
        timestamp: '2026-09-25T10:32:00+08:00',
        timeDisplay: '10:32 AM',
        title: 'MGH Order Entered',
        description: 'Rehydration successful. Attending doctor issued MGH order.',
        actor: 'Dr. Manuel Reyes',
        type: 'CLINICAL',
        status: 'COMPLETED'
      },
      {
        timestamp: '2026-09-25T10:36:00+08:00',
        timeDisplay: '10:36 AM',
        title: 'Doctor PF Declared (Ceiling Alert)',
        description: 'Dr. Reyes declared ₱14,000, ₱4,000 above PhilCare tariff schedule.',
        actor: 'System Automated Rule',
        type: 'BILLING',
        status: 'BLOCKED'
      }
    ])
  },

  // 5. Eduardo P. Garcia - Pharmacy RTS Return Audit Delay
  {
    id: 'enc-2210',
    encounterNumber: 'ENC-2026-2210',
    patient: {
      id: 'pat-105',
      mrn: 'MRN-221094',
      maskedName: 'GARCIA, Eduardo P.',
      philhealthPin: '19-4401-2291-8',
      isSeniorCitizen: false,
      isPwd: false,
      age: 58,
      gender: 'M',
      contactNumber: '+63 908 771 9920'
    },
    roomBed: 'Bed 210',
    roomCategory: 'SEMI_PRIVATE',
    dailyRoomRate: 2000.0,
    dailyRoomAllowance: 1500.0,
    admissionDate: '2026-09-22',
    mghOrderTimestamp: '2026-09-25T10:24:00+08:00',
    attendingDoctor: 'Dr. Fernando Gomez, FPCC',
    doctorPan: 'PAN-4409-1120',
    doctorAgreedFee: 25000.0,
    doctorExcessPf: 5000.0,
    doctorSignedAt: '2026-09-25T10:28:00+08:00',
    pharmacyRtsCleared: false,
    unreturnedMedsCount: 2,
    stage: 'PHARMACY_RTS_AUDIT',
    elapsedMinutes: 22,
    slaStatus: 'NORMAL',
    primaryDiagnosis: 'Hypertensive Emergency w/ Chest Pain',
    primaryIcd10: 'I10',
    hmo: {
      providerName: 'Pacific Cross',
      cardMasked: 'PX-5501-****-4412',
      policyMbl: 300000.0,
      mblRemaining: 265000.0,
      dailyRoomAllowance: 1500.0,
      initialLoaApproved: true,
      finalLoaStatus: 'PENDING_SUBMISSION',
      approvedAmount: 0,
      disallowedConsumables: 2400.0,
      turnaroundMinutes: 38,
      adjusterName: 'Rowena Santos',
      adjusterContact: 'rowena.s@pacificcross.com.ph'
    },
    philhealth: {
      id: 'claim-ph-2210',
      primaryIcd10: 'I10',
      primaryDescription: 'Essential (Primary) Hypertension',
      caseRateCode: 'I10',
      totalCaseRate: 12000.0,
      hciAmount: 8400.0,
      pfAmount: 3600.0,
      isNbb: false,
      rthRiskScore: 0.08,
      cf4VitalsRecorded: true,
      cf4CourseInWardRecorded: true,
      cf4LabsConsistent: true,
      eSoaXmlConformity: true,
      status: 'CLEAN',
      claimAgingDays: 2,
      assignedAuditor: 'Grace Tan'
    },
    items: garciaItems,
    waterfall: recalculateWaterfall(garciaItems, false, 8400.0, 3600.0, 0, 1500.0, 5000.0),
    disputes: [
      {
        id: 'disp-05',
        encounterId: 'enc-2210',
        itemId: 'item-503',
        itemDescription: 'Norepinephrine 4mg/4mL Ampoules (Unreturned Meds)',
        contestedAmount: 2400.0,
        reason: '2 unreturned ampoules left on 2nd floor ward crash cart requiring pharmacy credit slip.',
        status: 'OPEN',
        createdAt: '2026-09-25T10:30:00+08:00',
        assignedStaff: 'Elena Santos',
        department: 'Ward Pharmacy'
      }
    ],
    timeline: createTimeline([
      {
        timestamp: '2026-09-25T10:24:00+08:00',
        timeDisplay: '10:24 AM',
        title: 'MGH Order Entered',
        description: 'Dr. Fernando Gomez signed discharge order.',
        actor: 'Dr. Fernando Gomez',
        type: 'CLINICAL',
        status: 'COMPLETED'
      },
      {
        timestamp: '2026-09-25T10:28:00+08:00',
        timeDisplay: '10:28 AM',
        title: 'Doctor PF Signed',
        description: 'Cardiologist confirmed ₱25,000 fee.',
        actor: 'Dr. Fernando Gomez',
        type: 'BILLING',
        status: 'COMPLETED'
      },
      {
        timestamp: '2026-09-25T10:30:00+08:00',
        timeDisplay: '10:30 AM',
        title: 'Pharmacy RTS Flagged',
        description: 'Ward nurse dispatched physical ampoules back to central pharmacy for credit slip.',
        actor: 'Ward 2 Nurse Station',
        type: 'PHARMACY',
        status: 'BLOCKED'
      }
    ])
  },

  // 6. Corazon D. Mendoza - Cleared Case (Gate Pass Issued & Verified)
  {
    id: 'enc-3314',
    encounterNumber: 'ENC-2026-3314',
    patient: {
      id: 'pat-106',
      mrn: 'MRN-331408',
      maskedName: 'MENDOZA, Corazon D.',
      philhealthPin: '15-8812-3301-4',
      isSeniorCitizen: true,
      isPwd: false,
      age: 62,
      gender: 'F',
      contactNumber: '+63 917 220 8819'
    },
    roomBed: 'Bed 314-A',
    roomCategory: 'WARD',
    dailyRoomRate: 1000.0,
    dailyRoomAllowance: 1000.0,
    admissionDate: '2026-09-24',
    mghOrderTimestamp: '2026-09-25T10:15:00+08:00',
    attendingDoctor: 'Dr. Roberto Cruz, FPCP',
    doctorPan: 'PAN-3319-5501',
    doctorAgreedFee: 6000.0,
    doctorExcessPf: 0,
    doctorSignedAt: '2026-09-25T10:20:00+08:00',
    pharmacyRtsCleared: true,
    unreturnedMedsCount: 0,
    stage: 'CLEARED_GATE_PASS',
    elapsedMinutes: 31,
    slaStatus: 'NORMAL',
    primaryDiagnosis: 'CKD Stage 5 on Maintenance Hemodialysis',
    primaryIcd10: 'N18.5',
    hmo: {
      providerName: 'Maxicare',
      cardMasked: 'MX-3310-****-9921',
      policyMbl: 150000.0,
      mblRemaining: 142000.0,
      dailyRoomAllowance: 1000.0,
      initialLoaApproved: true,
      finalLoaStatus: 'APPROVED',
      approvalCode: 'MX-APV-993182',
      approvedAmount: 3800.0,
      disallowedConsumables: 0,
      turnaroundMinutes: 18,
      adjusterName: 'Sarah Dimasupil',
      adjusterContact: 'sarah.d@maxicare.com.ph'
    },
    philhealth: {
      id: 'claim-ph-3314',
      primaryIcd10: 'N18.5',
      primaryDescription: 'Chronic Kidney Disease, Stage 5',
      caseRateCode: 'N18.5',
      totalCaseRate: 8000.0,
      hciAmount: 5600.0,
      pfAmount: 2400.0,
      isNbb: true,
      rthRiskScore: 0.01,
      cf4VitalsRecorded: true,
      cf4CourseInWardRecorded: true,
      cf4LabsConsistent: true,
      eSoaXmlConformity: true,
      status: 'CLEAN',
      claimAgingDays: 1,
      assignedAuditor: 'Grace Tan'
    },
    items: mendozaItems,
    waterfall: recalculateWaterfall(mendozaItems, true, 5600.0, 2400.0, 3800.0, 0, 0),
    dischargePass: {
      passNumber: 'PASS-MC-88319',
      encounterId: 'enc-3314',
      patientName: 'MENDOZA, Corazon D.',
      roomBed: 'Bed 314-A',
      settledAmount: 0.0,
      settlementChannel: 'QR_PH',
      issuedAt: '2026-09-25T10:46:00+08:00',
      verifiedAt: '2026-09-25T10:49:15+08:00',
      status: 'VERIFIED_AT_LOBBY',
      hmacSignature: 'a7f9c8d3e2b10492817456bcdef98124'
    },
    disputes: [],
    timeline: createTimeline([
      {
        timestamp: '2026-09-25T10:15:00+08:00',
        timeDisplay: '10:15 AM',
        title: 'MGH Order Entered',
        description: 'Nephrology rounds completed. Discharge order initialized.',
        actor: 'Dr. Roberto Cruz',
        type: 'CLINICAL',
        status: 'COMPLETED'
      },
      {
        timestamp: '2026-09-25T10:28:00+08:00',
        timeDisplay: '10:28 AM',
        title: 'Maxicare eLOA Approved',
        description: 'Final LOA approved for ₱3,800 under code MX-APV-993182.',
        actor: 'Maxicare Portal',
        type: 'PAYER',
        status: 'COMPLETED'
      },
      {
        timestamp: '2026-09-25T10:46:00+08:00',
        timeDisplay: '10:46 AM',
        title: 'Digital Gate Pass Generated',
        description: 'Zero balance clearance confirmed. HMAC QR gate pass generated.',
        actor: 'Elena Santos',
        type: 'DISCHARGE',
        status: 'COMPLETED'
      },
      {
        timestamp: '2026-09-25T10:49:15+08:00',
        timeDisplay: '10:49 AM',
        title: 'Exit Scanned at Lobby',
        description: 'Security Officer Bert Aquino scanned digital pass. Patient discharged.',
        actor: 'Bert Aquino (Lobby Security)',
        type: 'DISCHARGE',
        status: 'COMPLETED'
      }
    ])
  },

  // 7. Arthur V. Alcantara - Critical PhilHealth CF4 Documentation Discrepancy
  {
    id: 'enc-6021',
    encounterNumber: 'ENC-2026-6021',
    patient: {
      id: 'pat-107',
      mrn: 'MRN-602114',
      maskedName: 'ALCANTARA, Arthur V.',
      philhealthPin: '03-8812-4491-9',
      isSeniorCitizen: false,
      isPwd: false,
      age: 54,
      gender: 'M',
      contactNumber: '+63 917 881 2940'
    },
    roomBed: 'Bed 408-A',
    roomCategory: 'REGULAR_PRIVATE',
    dailyRoomRate: 3500.0,
    dailyRoomAllowance: 2000.0,
    admissionDate: '2026-09-21',
    mghOrderTimestamp: '2026-09-25T09:58:00+08:00',
    attendingDoctor: 'Dr. Cristina Abad, FPCS',
    doctorPan: 'PAN-8812-7719',
    doctorAgreedFee: 38000.0,
    doctorExcessPf: 8000.0,
    doctorSignedAt: '2026-09-25T10:10:00+08:00',
    pharmacyRtsCleared: true,
    unreturnedMedsCount: 0,
    stage: 'MGH_DECLARED',
    elapsedMinutes: 46,
    slaStatus: 'BREACH',
    primaryDiagnosis: 'Acute Calculous Cholecystitis',
    primaryIcd10: 'K80.20',
    hmo: {
      providerName: 'Maxicare',
      cardMasked: 'MX-4401-****-8812',
      policyMbl: 250000.0,
      mblRemaining: 215000.0,
      dailyRoomAllowance: 2000.0,
      initialLoaApproved: true,
      finalLoaStatus: 'AWAITING_CODE',
      approvedAmount: 42000.0,
      disallowedConsumables: 3200.0,
      turnaroundMinutes: 58,
      adjusterName: 'Sarah Dimasupil',
      adjusterContact: 'sarah.d@maxicare.com.ph'
    },
    philhealth: {
      id: 'claim-ph-6021',
      primaryIcd10: 'K80.20',
      primaryDescription: 'Calculus of Gallbladder w/ Acute Cholecystitis',
      caseRateCode: '47562',
      totalCaseRate: 31000.0,
      hciAmount: 19000.0,
      pfAmount: 12000.0,
      isNbb: false,
      rthRiskScore: 0.78,
      cf4VitalsRecorded: true,
      cf4CourseInWardRecorded: false,
      cf4LabsConsistent: false,
      eSoaXmlConformity: false,
      status: 'WARNING',
      claimAgingDays: 3,
      assignedAuditor: 'Grace Tan',
      deficiencyReason:
        'Missing operative findings and histology report on Claim Form 4. Discrepancy between admission and discharge diagnosis codes.'
    },
    items: alcantaraItems,
    waterfall: recalculateWaterfall(alcantaraItems, false, 19000.0, 12000.0, 42000.0, 6000.0, 8000.0),
    disputes: [],
    timeline: createTimeline([
      {
        timestamp: '2026-09-25T09:58:00+08:00',
        timeDisplay: '09:58 AM',
        title: 'MGH Order Entered (46m ago)',
        description: 'Dr. Cristina Abad issued discharge order.',
        actor: 'Dr. Cristina Abad',
        type: 'CLINICAL',
        status: 'COMPLETED'
      },
      {
        timestamp: '2026-09-25T10:15:00+08:00',
        timeDisplay: '10:15 AM',
        title: 'Pre-Flight Scrubber Alert (RTH 0.78)',
        description: 'eClaims 3.0 validator caught missing CF4 operative notes. Claim transmission halted to prevent RTH rejection.',
        actor: 'Grace Tan (Claims Auditor)',
        type: 'PAYER',
        status: 'BLOCKED'
      }
    ])
  },

  // 8. Maria Clara O. Bautista - SLA Breached due to Assistant Surgeon Fee Dispute
  {
    id: 'enc-9104',
    encounterNumber: 'ENC-2026-9104',
    patient: {
      id: 'pat-108',
      mrn: 'MRN-910421',
      maskedName: 'BAUTISTA, Maria Clara O.',
      philhealthPin: '11-4491-0021-6',
      isSeniorCitizen: false,
      isPwd: false,
      age: 29,
      gender: 'F',
      contactNumber: '+63 920 441 9921'
    },
    roomBed: 'Bed 318-B',
    roomCategory: 'SEMI_PRIVATE',
    dailyRoomRate: 2200.0,
    dailyRoomAllowance: 1800.0,
    admissionDate: '2026-09-23',
    mghOrderTimestamp: '2026-09-25T09:52:00+08:00',
    attendingDoctor: 'Dr. Patricia Lim, FPOGS',
    doctorPan: 'PAN-7721-3310',
    doctorAgreedFee: 28000.0,
    doctorExcessPf: 5000.0,
    doctorSignedAt: '2026-09-25T10:05:00+08:00',
    pharmacyRtsCleared: true,
    unreturnedMedsCount: 0,
    stage: 'PENDING_SETTLEMENT',
    elapsedMinutes: 52,
    slaStatus: 'BREACH',
    primaryDiagnosis: 'Primary Cesarean Section Delivery',
    primaryIcd10: 'O82.0',
    hmo: {
      providerName: 'Intellicare',
      cardMasked: 'IN-8812-****-3319',
      policyMbl: 180000.0,
      mblRemaining: 154000.0,
      dailyRoomAllowance: 1800.0,
      initialLoaApproved: true,
      finalLoaStatus: 'APPROVED',
      approvalCode: 'INT-APV-771924',
      approvedAmount: 38000.0,
      disallowedConsumables: 0,
      turnaroundMinutes: 28,
      adjusterName: 'Mark Villanueva',
      adjusterContact: 'mark.v@intellicare.net.ph'
    },
    philhealth: {
      id: 'claim-ph-9104',
      primaryIcd10: 'O82.0',
      primaryDescription: 'Single Delivery by Cesarean Section',
      caseRateCode: '59510',
      totalCaseRate: 28000.0,
      hciAmount: 16800.0,
      pfAmount: 11200.0,
      isNbb: false,
      rthRiskScore: 0.03,
      cf4VitalsRecorded: true,
      cf4CourseInWardRecorded: true,
      cf4LabsConsistent: true,
      eSoaXmlConformity: true,
      status: 'CLEAN',
      claimAgingDays: 1,
      assignedAuditor: 'Grace Tan'
    },
    items: bautistaItems,
    waterfall: recalculateWaterfall(bautistaItems, false, 16800.0, 11200.0, 38000.0, 1200.0, 17500.0),
    disputes: [
      {
        id: 'disp-02',
        encounterId: 'enc-9104',
        itemId: 'item-804',
        itemDescription: 'Assistant Surgeon Fee: C-Section Extraction & Peritoneal Closure',
        contestedAmount: 12500.0,
        reason:
          'Patient husband strongly disputes unannounced assistant surgeon fee of ₱12,500 that was not part of the accredited package orientation.',
        status: 'OPEN',
        createdAt: '2026-09-25T10:15:00+08:00',
        assignedStaff: 'Elena Santos (Billing Specialist)',
        department: 'Obstetrics & Gynecology'
      }
    ],
    timeline: createTimeline([
      {
        timestamp: '2026-09-25T09:52:00+08:00',
        timeDisplay: '09:52 AM',
        title: 'MGH Order Declared (52m ago)',
        description: 'Postpartum recovery verified. Dr. Lim entered discharge authorization.',
        actor: 'Dr. Patricia Lim',
        type: 'CLINICAL',
        status: 'COMPLETED'
      },
      {
        timestamp: '2026-09-25T10:15:00+08:00',
        timeDisplay: '10:15 AM',
        title: 'Billing Confrontation at Cashier',
        description: 'Husband refused to sign SOA due to ₱12,500 unexpected assistant surgeon charge.',
        actor: 'Husband (Guarantor)',
        type: 'LEGAL',
        status: 'BLOCKED'
      },
      {
        timestamp: '2026-09-25T10:25:00+08:00',
        timeDisplay: '10:25 AM',
        title: 'Supervisory Review Escalated',
        description: 'Revenue cycle supervisor reviewing hospital courtesy waiver to clear room bed.',
        actor: 'Elena Santos',
        type: 'BILLING',
        status: 'PENDING'
      }
    ])
  },

  // 9. Rolando T. Gutierrez - Stroke, RA 9439 Promissory Note Execution
  {
    id: 'enc-4552',
    encounterNumber: 'ENC-2026-4552',
    patient: {
      id: 'pat-109',
      mrn: 'MRN-455209',
      maskedName: 'GUTIERREZ, Rolando T.',
      philhealthPin: '07-3319-8821-4',
      isSeniorCitizen: false,
      isPwd: false,
      age: 52,
      gender: 'M',
      contactNumber: '+63 919 552 1109'
    },
    roomBed: 'Bed 506',
    roomCategory: 'REGULAR_PRIVATE',
    dailyRoomRate: 3000.0,
    dailyRoomAllowance: 1500.0,
    admissionDate: '2026-09-19',
    mghOrderTimestamp: '2026-09-25T10:02:00+08:00',
    attendingDoctor: 'Dr. Manuel Reyes, FPCP',
    doctorPan: 'PAN-1092-4418',
    doctorAgreedFee: 35000.0,
    doctorExcessPf: 9900.0,
    doctorSignedAt: '2026-09-25T10:12:00+08:00',
    pharmacyRtsCleared: true,
    unreturnedMedsCount: 0,
    stage: 'PENDING_SETTLEMENT',
    elapsedMinutes: 42,
    slaStatus: 'WARNING',
    primaryDiagnosis: 'Acute Ischemic Stroke with Hemiparesis',
    primaryIcd10: 'I63.9',
    hmo: {
      providerName: 'Medicard',
      cardMasked: 'MC-7712-****-4409',
      policyMbl: 80000.0,
      mblRemaining: 35000.0,
      dailyRoomAllowance: 1500.0,
      initialLoaApproved: true,
      finalLoaStatus: 'APPROVED',
      approvalCode: 'MC-APV-884192',
      approvedAmount: 13600.0,
      disallowedConsumables: 0,
      turnaroundMinutes: 20,
      adjusterName: 'Carla De Jesus',
      adjusterContact: 'carla.dj@medicard.com.ph'
    },
    philhealth: {
      id: 'claim-ph-4552',
      primaryIcd10: 'I63.9',
      primaryDescription: 'Cerebral Infarction, Unspecified',
      caseRateCode: 'I63.9',
      totalCaseRate: 38000.0,
      hciAmount: 27000.0,
      pfAmount: 11000.0,
      isNbb: false,
      rthRiskScore: 0.02,
      cf4VitalsRecorded: true,
      cf4CourseInWardRecorded: true,
      cf4LabsConsistent: true,
      eSoaXmlConformity: true,
      status: 'CLEAN',
      claimAgingDays: 5,
      assignedAuditor: 'Grace Tan'
    },
    items: gutierrezItems,
    waterfall: recalculateWaterfall(gutierrezItems, false, 27000.0, 11000.0, 13600.0, 9000.0, 9900.0),
    promissoryNote: {
      id: 'PN-2026-089',
      encounterId: 'enc-4552',
      borrowerName: 'GUTIERREZ, Eduardo T. (Son)',
      borrowerRelationship: 'CHILD',
      borrowerIdType: 'PHILSYS_NATIONAL_ID',
      borrowerIdNumber: '4410-9921-8841-0021',
      principalAmount: 24600.0,
      installmentMonths: 6,
      monthlyInstallment: 4100.0,
      firstDueDate: '2026-10-25',
      digitalSignatureTimestamp: '2026-09-25T10:35:00+08:00',
      status: 'ACTIVE'
    },
    disputes: [],
    timeline: createTimeline([
      {
        timestamp: '2026-09-25T10:02:00+08:00',
        timeDisplay: '10:02 AM',
        title: 'MGH Order Entered',
        description: 'Neuro rehab transfer clearance issued by Dr. Reyes.',
        actor: 'Dr. Manuel Reyes',
        type: 'CLINICAL',
        status: 'COMPLETED'
      },
      {
        timestamp: '2026-09-25T10:22:00+08:00',
        timeDisplay: '10:22 AM',
        title: 'Medicard MBL Exhausted',
        description: 'Policy maximum reached. Remaining ₱24,600 out-of-pocket payable by patient.',
        actor: 'Medicard Portal',
        type: 'PAYER',
        status: 'COMPLETED'
      },
      {
        timestamp: '2026-09-25T10:35:00+08:00',
        timeDisplay: '10:35 AM',
        title: 'RA 9439 Promissory Note Executed',
        description: 'Son executed 6-month installment contract with PhilSys National ID verification.',
        actor: 'Arthur Delgado (CFO / Billing Director)',
        type: 'LEGAL',
        status: 'COMPLETED'
      }
    ])
  },

  // 10. Lourdes E. Villanueva - HMO Disallowed Consumables Dispute (Bone Cement)
  {
    id: 'enc-1889',
    encounterNumber: 'ENC-2026-1889',
    patient: {
      id: 'pat-110',
      mrn: 'MRN-188920',
      maskedName: 'VILLANUEVA, Lourdes E.',
      philhealthPin: '09-4412-8819-2',
      isSeniorCitizen: true,
      isPwd: false,
      age: 64,
      gender: 'F',
      contactNumber: '+63 917 339 4410'
    },
    roomBed: 'Bed 415',
    roomCategory: 'SUITE',
    dailyRoomRate: 4000.0,
    dailyRoomAllowance: 2000.0,
    admissionDate: '2026-09-21',
    mghOrderTimestamp: '2026-09-25T10:15:00+08:00',
    attendingDoctor: 'Dr. Enrico Santos, FPOA',
    doctorPan: 'PAN-2210-9941',
    doctorAgreedFee: 45000.0,
    doctorExcessPf: 6000.0,
    doctorSignedAt: '2026-09-25T10:22:00+08:00',
    pharmacyRtsCleared: true,
    unreturnedMedsCount: 0,
    stage: 'HMO_FINAL_LOA',
    elapsedMinutes: 29,
    slaStatus: 'WARNING',
    primaryDiagnosis: 'Severe Primary Osteoarthritis, Right Knee',
    primaryIcd10: 'M17.11',
    hmo: {
      providerName: 'Pacific Cross',
      cardMasked: 'PX-9912-****-3301',
      policyMbl: 400000.0,
      mblRemaining: 345000.0,
      dailyRoomAllowance: 2000.0,
      initialLoaApproved: true,
      finalLoaStatus: 'DISALLOWED_ITEMS',
      approvedAmount: 67000.0,
      disallowedConsumables: 14200.0,
      turnaroundMinutes: 44,
      adjusterName: 'Rowena Santos',
      adjusterContact: 'rowena.s@pacificcross.com.ph'
    },
    philhealth: {
      id: 'claim-ph-1889',
      primaryIcd10: 'M17.11',
      primaryDescription: 'Primary Gonarthrosis, Unilateral',
      caseRateCode: '27447',
      totalCaseRate: 45000.0,
      hciAmount: 24000.0,
      pfAmount: 21000.0,
      isNbb: false,
      rthRiskScore: 0.02,
      cf4VitalsRecorded: true,
      cf4CourseInWardRecorded: true,
      cf4LabsConsistent: true,
      eSoaXmlConformity: true,
      status: 'CLEAN',
      claimAgingDays: 4,
      assignedAuditor: 'Grace Tan'
    },
    items: villanuevaItems,
    waterfall: recalculateWaterfall(villanuevaItems, true, 24000.0, 21000.0, 67000.0, 8000.0, 6000.0),
    disputes: [
      {
        id: 'disp-03',
        encounterId: 'enc-1889',
        itemId: 'item-1003',
        itemDescription: 'Palacos R+G Bone Cement with Gentamicin (2 Packs)',
        contestedAmount: 6071.43,
        reason:
          'Pacific Cross adjuster struck out antibiotic bone cement as an excluded sundry. Orthopedic surgeon filed appeal for clinical necessity.',
        status: 'HMO_RECONSIDERED',
        createdAt: '2026-09-25T10:30:00+08:00',
        assignedStaff: 'Marco Valenzuela (HMO Coordinator)',
        department: 'Orthopedic Surgery'
      }
    ],
    timeline: createTimeline([
      {
        timestamp: '2026-09-25T10:15:00+08:00',
        timeDisplay: '10:15 AM',
        title: 'MGH Order Entered',
        description: 'Post-op mobility test passed. MGH order entered.',
        actor: 'Dr. Enrico Santos',
        type: 'CLINICAL',
        status: 'COMPLETED'
      },
      {
        timestamp: '2026-09-25T10:30:00+08:00',
        timeDisplay: '10:30 AM',
        title: 'Pacific Cross Struck Out Bone Cement',
        description: 'Adjuster marked ₱14,200 supplies as non-covered. HMO coordinator filed formal reconsideration.',
        actor: 'Pacific Cross Adjuster',
        type: 'PAYER',
        status: 'BLOCKED'
      }
    ])
  },

  // 11. Danilo J. Soriano - Pharmacy RTS In Progress
  {
    id: 'enc-7110',
    encounterNumber: 'ENC-2026-7110',
    patient: {
      id: 'pat-111',
      mrn: 'MRN-711082',
      maskedName: 'SORIANO, Danilo J.',
      philhealthPin: '20-9921-3310-7',
      isSeniorCitizen: false,
      isPwd: false,
      age: 49,
      gender: 'M',
      contactNumber: '+63 922 441 0029'
    },
    roomBed: 'Bed 208-B',
    roomCategory: 'WARD',
    dailyRoomRate: 1000.0,
    dailyRoomAllowance: 1000.0,
    admissionDate: '2026-09-22',
    mghOrderTimestamp: '2026-09-25T10:26:00+08:00',
    attendingDoctor: 'Dr. Cristina Abad, FPCS',
    doctorPan: 'PAN-8812-7719',
    doctorAgreedFee: 12000.0,
    doctorExcessPf: 0,
    doctorSignedAt: '2026-09-25T10:30:00+08:00',
    pharmacyRtsCleared: false,
    unreturnedMedsCount: 1,
    stage: 'PHARMACY_RTS_AUDIT',
    elapsedMinutes: 18,
    slaStatus: 'NORMAL',
    primaryDiagnosis: 'Diabetic Foot Ulcer with Debridement',
    primaryIcd10: 'E11.52',
    hmo: {
      providerName: 'PhilCare',
      cardMasked: 'PC-2219-****-8810',
      policyMbl: 150000.0,
      mblRemaining: 132000.0,
      dailyRoomAllowance: 1000.0,
      initialLoaApproved: true,
      finalLoaStatus: 'PENDING_SUBMISSION',
      approvedAmount: 0,
      disallowedConsumables: 0,
      turnaroundMinutes: 22,
      adjusterName: 'Jason Pineda',
      adjusterContact: 'jason.p@philcare.com.ph'
    },
    philhealth: {
      id: 'claim-ph-7110',
      primaryIcd10: 'E11.52',
      primaryDescription: 'Type 2 Diabetes Mellitus with Diabetic Foot Ulcer',
      caseRateCode: 'E11.52',
      totalCaseRate: 16000.0,
      hciAmount: 11200.0,
      pfAmount: 4800.0,
      isNbb: false,
      rthRiskScore: 0.03,
      cf4VitalsRecorded: true,
      cf4CourseInWardRecorded: true,
      cf4LabsConsistent: true,
      eSoaXmlConformity: true,
      status: 'CLEAN',
      claimAgingDays: 2,
      assignedAuditor: 'Grace Tan'
    },
    items: sorianoItems,
    waterfall: recalculateWaterfall(sorianoItems, false, 11200.0, 4800.0, 0, 0, 0),
    disputes: [],
    timeline: createTimeline([
      {
        timestamp: '2026-09-25T10:26:00+08:00',
        timeDisplay: '10:26 AM',
        title: 'MGH Order Entered',
        description: 'Surgical wound clean. Dr. Abad approved discharge.',
        actor: 'Dr. Cristina Abad',
        type: 'CLINICAL',
        status: 'COMPLETED'
      },
      {
        timestamp: '2026-09-25T10:32:00+08:00',
        timeDisplay: '10:32 AM',
        title: 'Pharmacy Return in Progress',
        description: '1 tube Silver Sulfadiazine dispatched to central pharmacy for credit slip.',
        actor: 'Ward Nurse',
        type: 'PHARMACY',
        status: 'PENDING'
      }
    ])
  },

  // 12. Josefina R. Aquino - Awaiting Maxicare eLOA Code
  {
    id: 'enc-8339',
    encounterNumber: 'ENC-2026-8339',
    patient: {
      id: 'pat-112',
      mrn: 'MRN-833910',
      maskedName: 'AQUINO, Josefina R.',
      philhealthPin: '16-0021-9941-8',
      isSeniorCitizen: false,
      isPwd: false,
      age: 52,
      gender: 'F',
      contactNumber: '+63 908 441 8812'
    },
    roomBed: 'Bed 322',
    roomCategory: 'SEMI_PRIVATE',
    dailyRoomRate: 2000.0,
    dailyRoomAllowance: 1500.0,
    admissionDate: '2026-09-23',
    mghOrderTimestamp: '2026-09-25T10:18:00+08:00',
    attendingDoctor: 'Dr. Fernando Gomez, FPCC',
    doctorPan: 'PAN-4409-1120',
    doctorAgreedFee: 15000.0,
    doctorExcessPf: 3000.0,
    doctorSignedAt: '2026-09-25T10:24:00+08:00',
    pharmacyRtsCleared: true,
    unreturnedMedsCount: 0,
    stage: 'HMO_FINAL_LOA',
    elapsedMinutes: 26,
    slaStatus: 'WARNING',
    primaryDiagnosis: 'Unstable Angina Pectoris',
    primaryIcd10: 'I20.0',
    hmo: {
      providerName: 'Maxicare',
      cardMasked: 'MX-7720-****-1192',
      policyMbl: 200000.0,
      mblRemaining: 182000.0,
      dailyRoomAllowance: 1500.0,
      initialLoaApproved: true,
      finalLoaStatus: 'AWAITING_CODE',
      approvedAmount: 17000.0,
      disallowedConsumables: 0,
      turnaroundMinutes: 32,
      adjusterName: 'Sarah Dimasupil',
      adjusterContact: 'sarah.d@maxicare.com.ph'
    },
    philhealth: {
      id: 'claim-ph-8339',
      primaryIcd10: 'I20.0',
      primaryDescription: 'Unstable Angina',
      caseRateCode: 'I20.0',
      totalCaseRate: 15000.0,
      hciAmount: 10500.0,
      pfAmount: 4500.0,
      isNbb: false,
      rthRiskScore: 0.02,
      cf4VitalsRecorded: true,
      cf4CourseInWardRecorded: true,
      cf4LabsConsistent: true,
      eSoaXmlConformity: true,
      status: 'CLEAN',
      claimAgingDays: 1,
      assignedAuditor: 'Grace Tan'
    },
    items: aquinoItems,
    waterfall: recalculateWaterfall(aquinoItems, false, 10500.0, 4500.0, 17000.0, 1500.0, 3000.0),
    disputes: [],
    timeline: createTimeline([
      {
        timestamp: '2026-09-25T10:18:00+08:00',
        timeDisplay: '10:18 AM',
        title: 'MGH Order Entered',
        description: 'Stress ECG normal. Dr. Gomez entered discharge order.',
        actor: 'Dr. Fernando Gomez',
        type: 'CLINICAL',
        status: 'COMPLETED'
      },
      {
        timestamp: '2026-09-25T10:28:00+08:00',
        timeDisplay: '10:28 AM',
        title: 'Maxicare Submission Pending Code',
        description: 'eSOA transmitted to Maxicare portal. Awaiting approval code.',
        actor: 'Marco Valenzuela',
        type: 'PAYER',
        status: 'PENDING'
      }
    ])
  },

  // 13. Ferdinand G. Navarro - Cleared Surgical Case (Gate Pass Issued)
  {
    id: 'enc-9201',
    encounterNumber: 'ENC-2026-9201',
    patient: {
      id: 'pat-113',
      mrn: 'MRN-920194',
      maskedName: 'NAVARRO, Ferdinand G.',
      philhealthPin: '05-3312-8841-2',
      isSeniorCitizen: false,
      isPwd: false,
      age: 38,
      gender: 'M',
      contactNumber: '+63 918 229 1140'
    },
    roomBed: 'Bed 602',
    roomCategory: 'SEMI_PRIVATE',
    dailyRoomRate: 1800.0,
    dailyRoomAllowance: 1500.0,
    admissionDate: '2026-09-20',
    mghOrderTimestamp: '2026-09-25T10:16:00+08:00',
    attendingDoctor: 'Dr. Enrico Santos, FPOA',
    doctorPan: 'PAN-2210-9941',
    doctorAgreedFee: 28000.0,
    doctorExcessPf: 5200.0,
    doctorSignedAt: '2026-09-25T10:20:00+08:00',
    pharmacyRtsCleared: true,
    unreturnedMedsCount: 0,
    stage: 'CLEARED_GATE_PASS',
    elapsedMinutes: 28,
    slaStatus: 'NORMAL',
    primaryDiagnosis: 'Closed Diaphyseal Fracture of Right Femur',
    primaryIcd10: 'S72.301A',
    hmo: {
      providerName: 'Intellicare',
      cardMasked: 'IN-5510-****-9921',
      policyMbl: 300000.0,
      mblRemaining: 242000.0,
      dailyRoomAllowance: 1500.0,
      initialLoaApproved: true,
      finalLoaStatus: 'APPROVED',
      approvalCode: 'INT-APV-99120',
      approvedAmount: 50000.0,
      disallowedConsumables: 0,
      turnaroundMinutes: 16,
      adjusterName: 'Mark Villanueva',
      adjusterContact: 'mark.v@intellicare.net.ph'
    },
    philhealth: {
      id: 'claim-ph-9201',
      primaryIcd10: 'S72.301A',
      primaryDescription: 'Fracture of Shaft of Right Femur',
      caseRateCode: '27244',
      totalCaseRate: 30800.0,
      hciAmount: 18000.0,
      pfAmount: 12800.0,
      isNbb: false,
      rthRiskScore: 0.01,
      cf4VitalsRecorded: true,
      cf4CourseInWardRecorded: true,
      cf4LabsConsistent: true,
      eSoaXmlConformity: true,
      status: 'CLEAN',
      claimAgingDays: 5,
      assignedAuditor: 'Grace Tan'
    },
    items: navarroItems,
    waterfall: recalculateWaterfall(navarroItems, false, 18000.0, 12800.0, 50000.0, 1200.0, 5200.0),
    dischargePass: {
      passNumber: 'PASS-INT-99120',
      encounterId: 'enc-9201',
      patientName: 'NAVARRO, Ferdinand G.',
      roomBed: 'Bed 602',
      settledAmount: 6400.0,
      settlementChannel: 'QR_PH',
      issuedAt: '2026-09-25T10:44:00+08:00',
      verifiedAt: '2026-09-25T10:47:30+08:00',
      status: 'ACTIVE_READY_FOR_EXIT',
      hmacSignature: 'f8b2c4e1a0942817456bcdef98124019'
    },
    disputes: [],
    timeline: createTimeline([
      {
        timestamp: '2026-09-25T10:16:00+08:00',
        timeDisplay: '10:16 AM',
        title: 'MGH Order Entered',
        description: 'Weight-bearing ambulation confirmed. Discharge authorized.',
        actor: 'Dr. Enrico Santos',
        type: 'CLINICAL',
        status: 'COMPLETED'
      },
      {
        timestamp: '2026-09-25T10:35:00+08:00',
        timeDisplay: '10:35 AM',
        title: 'QR Ph Settlement Completed',
        description: 'Remaining ₱6,400 paid via Maya QR Ph terminal at cashier.',
        actor: 'Main Cashier',
        type: 'BILLING',
        status: 'COMPLETED'
      },
      {
        timestamp: '2026-09-25T10:44:00+08:00',
        timeDisplay: '10:44 AM',
        title: 'Digital Gate Pass Issued',
        description: 'Exit pass generated. Ready for lobby departure.',
        actor: 'Elena Santos',
        type: 'DISCHARGE',
        status: 'COMPLETED'
      }
    ])
  },

  // 14. Teresa L. Dimaculangan - PhilHealth MDR Dependency Coding Error
  {
    id: 'enc-3419',
    encounterNumber: 'ENC-2026-3419',
    patient: {
      id: 'pat-114',
      mrn: 'MRN-341982',
      maskedName: 'DIMACULANGAN, Teresa L.',
      philhealthPin: '01-4491-2209-3',
      isSeniorCitizen: true,
      isPwd: false,
      age: 67,
      gender: 'F',
      contactNumber: '+63 920 119 4482'
    },
    roomBed: 'Bed 518',
    roomCategory: 'REGULAR_PRIVATE',
    dailyRoomRate: 3200.0,
    dailyRoomAllowance: 1800.0,
    admissionDate: '2026-09-22',
    mghOrderTimestamp: '2026-09-25T10:32:00+08:00',
    attendingDoctor: 'Dr. Fernando Gomez, FPCC',
    doctorPan: 'PAN-4409-1120',
    doctorAgreedFee: 16000.0,
    doctorExcessPf: 3000.0,
    doctorSignedAt: '2026-09-25T10:38:00+08:00',
    pharmacyRtsCleared: true,
    unreturnedMedsCount: 0,
    stage: 'MGH_DECLARED',
    elapsedMinutes: 12,
    slaStatus: 'NORMAL',
    primaryDiagnosis: 'Congestive Heart Failure NYHA III',
    primaryIcd10: 'I50.9',
    hmo: {
      providerName: 'Medicard',
      cardMasked: 'MC-3319-****-8812',
      policyMbl: 120000.0,
      mblRemaining: 104000.0,
      dailyRoomAllowance: 1800.0,
      initialLoaApproved: true,
      finalLoaStatus: 'PENDING_SUBMISSION',
      approvedAmount: 0,
      disallowedConsumables: 0,
      turnaroundMinutes: 25,
      adjusterName: 'Carla De Jesus',
      adjusterContact: 'carla.dj@medicard.com.ph'
    },
    philhealth: {
      id: 'claim-ph-3419',
      primaryIcd10: 'I50.9',
      primaryDescription: 'Heart Failure, Unspecified',
      caseRateCode: 'I50.9',
      totalCaseRate: 15700.0,
      hciAmount: 10900.0,
      pfAmount: 4800.0,
      isNbb: false,
      rthRiskScore: 0.65,
      cf4VitalsRecorded: true,
      cf4CourseInWardRecorded: true,
      cf4LabsConsistent: true,
      eSoaXmlConformity: false,
      status: 'INTERCEPTED',
      claimAgingDays: 2,
      assignedAuditor: 'Grace Tan',
      deficiencyReason:
        'PhilHealth Member Data Record (MDR) maiden name mismatch on primary insured record. Pre-flight intercepted to prevent RTH rejection.'
    },
    items: dimaculanganItems,
    waterfall: recalculateWaterfall(dimaculanganItems, true, 10900.0, 4800.0, 10000.0, 4200.0, 3000.0),
    disputes: [],
    timeline: createTimeline([
      {
        timestamp: '2026-09-25T10:32:00+08:00',
        timeDisplay: '10:32 AM',
        title: 'MGH Order Entered',
        description: 'Fluid overload resolved. Dr. Gomez entered discharge order.',
        actor: 'Dr. Fernando Gomez',
        type: 'CLINICAL',
        status: 'COMPLETED'
      },
      {
        timestamp: '2026-09-25T10:39:00+08:00',
        timeDisplay: '10:39 AM',
        title: 'PhilHealth PIN Intercepted',
        description: 'Pre-flight auditor caught maiden name mismatch on PhilHealth portal. Updating MDR record.',
        actor: 'Grace Tan (Claims Auditor)',
        type: 'PAYER',
        status: 'BLOCKED'
      }
    ])
  },

  // 15. Ramon K. Castillo - Bleeding Peptic Ulcer, Cashier Payment in Progress
  {
    id: 'enc-6624',
    encounterNumber: 'ENC-2026-6624',
    patient: {
      id: 'pat-115',
      mrn: 'MRN-662410',
      maskedName: 'CASTILLO, Ramon K.',
      philhealthPin: '14-9921-3301-8',
      isSeniorCitizen: false,
      isPwd: false,
      age: 41,
      gender: 'M',
      contactNumber: '+63 908 119 2244'
    },
    roomBed: 'Bed 214',
    roomCategory: 'SEMI_PRIVATE',
    dailyRoomRate: 2000.0,
    dailyRoomAllowance: 1500.0,
    admissionDate: '2026-09-22',
    mghOrderTimestamp: '2026-09-25T10:10:00+08:00',
    attendingDoctor: 'Dr. Manuel Reyes, FPCP',
    doctorPan: 'PAN-1092-4418',
    doctorAgreedFee: 22000.0,
    doctorExcessPf: 5100.0,
    doctorSignedAt: '2026-09-25T10:15:00+08:00',
    pharmacyRtsCleared: true,
    unreturnedMedsCount: 0,
    stage: 'PENDING_SETTLEMENT',
    elapsedMinutes: 34,
    slaStatus: 'WARNING',
    primaryDiagnosis: 'Bleeding Duodenal Ulcer with Endoscopic Hemostasis',
    primaryIcd10: 'K25.0',
    hmo: {
      providerName: 'Pacific Cross',
      cardMasked: 'PX-4410-****-9921',
      policyMbl: 200000.0,
      mblRemaining: 168000.0,
      dailyRoomAllowance: 1500.0,
      initialLoaApproved: true,
      finalLoaStatus: 'APPROVED',
      approvalCode: 'PX-APV-441920',
      approvedAmount: 20300.0,
      disallowedConsumables: 4600.0,
      turnaroundMinutes: 35,
      adjusterName: 'Rowena Santos',
      adjusterContact: 'rowena.s@pacificcross.com.ph'
    },
    philhealth: {
      id: 'claim-ph-6624',
      primaryIcd10: 'K25.0',
      primaryDescription: 'Acute Duodenal Ulcer with Hemorrhage',
      caseRateCode: '43239',
      totalCaseRate: 20500.0,
      hciAmount: 12900.0,
      pfAmount: 7600.0,
      isNbb: false,
      rthRiskScore: 0.02,
      cf4VitalsRecorded: true,
      cf4CourseInWardRecorded: true,
      cf4LabsConsistent: true,
      eSoaXmlConformity: true,
      status: 'CLEAN',
      claimAgingDays: 2,
      assignedAuditor: 'Grace Tan'
    },
    items: castilloItems,
    waterfall: recalculateWaterfall(castilloItems, false, 12900.0, 7600.0, 20300.0, 1500.0, 5100.0),
    promissoryNote: {
      id: 'PN-2026-090',
      encounterId: 'enc-6624',
      borrowerName: 'CASTILLO, Maria Elena (Spouse)',
      borrowerRelationship: 'SPOUSE',
      borrowerIdType: 'UMID',
      borrowerIdNumber: 'CRN-0111-4491-8821',
      principalAmount: 11200.0,
      installmentMonths: 3,
      monthlyInstallment: 3733.33,
      firstDueDate: '2026-10-25',
      digitalSignatureTimestamp: '2026-09-25T10:41:00+08:00',
      status: 'ACTIVE'
    },
    disputes: [],
    timeline: createTimeline([
      {
        timestamp: '2026-09-25T10:10:00+08:00',
        timeDisplay: '10:10 AM',
        title: 'MGH Order Entered',
        description: 'Endoscopic clips intact. Hemoglobin stable (>11g/dL). Discharge cleared.',
        actor: 'Dr. Manuel Reyes',
        type: 'CLINICAL',
        status: 'COMPLETED'
      },
      {
        timestamp: '2026-09-25T10:28:00+08:00',
        timeDisplay: '10:28 AM',
        title: 'Pacific Cross eLOA Approved',
        description: 'Approved under code PX-APV-441920 with ₱4,600 hemoclip supply exclusion.',
        actor: 'Pacific Cross Adjuster',
        type: 'PAYER',
        status: 'COMPLETED'
      },
      {
        timestamp: '2026-09-25T10:38:00+08:00',
        timeDisplay: '10:38 AM',
        title: 'GCash Payment Initiated at Cashier',
        description: 'Patient wife settling ₱11,200 balance at cashier terminal.',
        actor: 'Main Cashier',
        type: 'BILLING',
        status: 'PENDING'
      }
    ])
  }
];

// ============================================================================
const ALL_RAW_ENCOUNTERS: Encounter[] = [
  ...RAW_INITIAL_ENCOUNTERS,
  ...generateAdditionalEncounters(16, 250)
];

export const INITIAL_ENCOUNTERS: Encounter[] = ALL_RAW_ENCOUNTERS.map((enc) => ({
  ...enc,
  promissoryNote: enc.promissoryNote ? { ...enc.promissoryNote,
    monthlyInstallment: calculateInstallmentPlan(enc.promissoryNote.principalAmount, enc.promissoryNote.installmentMonths).monthlyInstallment
  } : undefined,
  bedNumber: enc.roomBed,
  roomType: enc.roomCategory.replace(/_/g, ' '),
  elapsedMinutesInStage: enc.elapsedMinutes,
  chargemasterItems: enc.items.map((it) => ({
    ...it,
    isDisputed: it.status === 'CONTESTED' || enc.disputes.some((d) => d.itemId === it.id)
  })),
  philHealth: {
    ...enc.philhealth,
    diagnosisDescription: enc.philhealth.primaryDescription
  },
  hmo: {
    ...enc.hmo,
    hmoName: enc.hmo.providerName,
    loaNumber: enc.hmo.approvalCode || enc.hmo.cardMasked,
    loaStatus: enc.hmo.finalLoaStatus
  },
  patient: {
    ...enc.patient,
    fullName: enc.patient.maskedName,
    pin: enc.patient.philhealthPin,
    seniorCitizenId: enc.patient.isSeniorCitizen ? `SC-${enc.patient.mrn.replace('MRN-', '')}` : undefined,
    pwdId: enc.patient.isPwd ? `PWD-${enc.patient.mrn.replace('MRN-', '')}` : undefined
  },
  attendingDoctorObj: {
    name: enc.attendingDoctor,
    prcLicense: enc.doctorPan.replace('PAN-', 'PRC-'),
    specialization: 'Attending Specialist (FPCP / FPCS / FPOA / FPOGS)',
    contactNumber: '+63 917 882 1920',
    declaredFee: enc.doctorAgreedFee,
    accreditedScheduleRate: enc.doctorAgreedFee - enc.doctorExcessPf,
    status: enc.doctorSignedAt ? 'SIGNED' : 'PENDING_SIGN'
  },
  waterfall: {
    ...enc.waterfall,
    grossCharges: enc.waterfall.grossTotal
  }
}));

