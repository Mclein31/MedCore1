import {
  Encounter,
  Patient,
  ChargemasterItem,
  StatutoryWaterfall,
  PhilHealthClaim,
  HmoAuthorization,
  DischargePass,
  PromissoryNote,
  BillingDispute,
  EncounterTimelineEvent,
  DischargeStage,
  SlaStatus
} from '../types/domain';
import { recalculateWaterfall } from '../utils/waterfall';

// ============================================================================
// DETERMINISTIC LEHMER PSEUDO-RANDOM NUMBER GENERATOR
// Guarantees identical dataset output across runs without randomness jitter
// ============================================================================
function createPrng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ============================================================================
// SEED DATA POOLS (PHILIPPINE TERTIARY HOSPITAL CONTEXT)
// ============================================================================

const MALE_FIRST_NAMES = [
  'Jose', 'Juan', 'Angelo', 'Danilo', 'Arthur', 'Roberto', 'Manuel', 'Enrico',
  'Ferdinand', 'Ramon', 'Eduardo', 'Paolo', 'Noel', 'Gabriel', 'Antonio', 'Carlos',
  'Ricardo', 'Jaime', 'Francisco', 'Rafael', 'Emilio', 'Vicente', 'Renato', 'Wilfredo',
  'Gerardo', 'Leonardo', 'Benjamin', 'Jonathan', 'Christopher', 'Mark', 'Christian',
  'Joel', 'Roderick', 'Arnel', 'Ernesto', 'Reynaldo', 'Salvador', 'Rogelio', 'Dominador',
  'Efren', 'Rodrigo', 'Mario', 'Nestor', 'Rolando', 'Armando', 'Cesar', 'Alfonso'
];

const FEMALE_FIRST_NAMES = [
  'Maria', 'Carmela', 'Corazon', 'Teresa', 'Lourdes', 'Josefina', 'Cristina', 'Patricia',
  'Angela', 'Clarissa', 'Katrina', 'Maria Lourdes', 'Rosalinda', 'Elena', 'Rowena', 'Maricel',
  'Arlene', 'Remedios', 'Divina', 'Cherry', 'Jocelyn', 'Catherine', 'Jennifer', 'Michelle',
  'Analyn', 'Marites', 'Flordeliza', 'Gloria', 'Zenaida', 'Imelda', 'Cynthia', 'Susan',
  'Miriam', 'Evelyn', 'Vilma', 'Nora', 'Gina', 'Liezl', 'Marilou', 'Melba', 'Amparo',
  'Consuelo', 'Socorro', 'Perlita', 'Leonor', 'Milagros', 'Fe', 'Esperanza'
];

const MIDDLE_INITIALS = [
  'A.', 'B.', 'C.', 'D.', 'E.', 'F.', 'G.', 'H.', 'I.', 'J.', 'K.', 'L.',
  'M.', 'N.', 'O.', 'P.', 'Q.', 'R.', 'S.', 'T.', 'U.', 'V.', 'W.', 'Y.', 'Z.'
];

const LAST_NAMES = [
  'Santos', 'Dela Cruz', 'Reyes', 'Garcia', 'Bautista', 'Mendoza', 'Aquino', 'Dimaculangan',
  'Castillo', 'Villanueva', 'Soriano', 'Alcantara', 'Dizon', 'Navarro', 'Ramos', 'Tolentino',
  'Tan', 'Lim', 'Sy', 'Co', 'Macaraeg', 'Pineda', 'Ilagan', 'Magbanua', 'Evangelista',
  'Corpuz', 'Morales', 'David', 'Mercado', 'Valenzuela', 'De Leon', 'Ocampo', 'Castro',
  'Rivera', 'Flores', 'Santiago', 'Delos Reyes', 'Pascual', 'Domingo', 'Manalo', 'Salazar',
  'Aguilar', 'De Vera', 'Hernandez', 'Cruz', 'Villalobos', 'Padilla', 'Ferrer', 'Balagtas',
  'Gutierrez', 'Espiritu', 'Bernardo', 'Castaneda', 'Magsaysay', 'Sarmiento', 'Cabrera'
];

const DOCTORS = [
  { name: 'Dr. Cristina Abad, FPCS', pan: 'PAN-7721-3310', spec: 'General & Laparoscopic Surgery' },
  { name: 'Dr. Fernando Gomez, FPCC', pan: 'PAN-4409-1120', spec: 'Adult Cardiology' },
  { name: 'Dr. Manuel Reyes, FPCP', pan: 'PAN-1092-4418', spec: 'Internal Medicine & Critical Care' },
  { name: 'Dr. Enrico Santos, FPOA', pan: 'PAN-2210-9941', spec: 'Orthopedic Surgery & Trauma' },
  { name: 'Dr. Patricia Lim, FPOGS', pan: 'PAN-8812-4409', spec: 'Obstetrics & Gynecology' },
  { name: 'Dr. Roberto Cruz, FPCP', pan: 'PAN-3319-5501', spec: 'Nephrology & Dialysis' },
  { name: 'Dr. Angela De Vera, FPPS', pan: 'PAN-5510-8821', spec: 'Pediatrics & Neonatology' },
  { name: 'Dr. Victor Hernandez, FPNA', pan: 'PAN-9921-1102', spec: 'Adult Neurology' },
  { name: 'Dr. Eduardo Dizon, FPCP', pan: 'PAN-6624-9918', spec: 'Pulmonology & Critical Care' },
  { name: 'Dr. Ramon Mercado, FPSGS', pan: 'PAN-3391-7721', spec: 'Surgical Oncology' },
  { name: 'Dr. Katrina Sy, FPPS', pan: 'PAN-1192-3304', spec: 'Pediatric Intensive Care' },
  { name: 'Dr. Anthony Ramos, FPOA', pan: 'PAN-4481-2290', spec: 'Adult Spine & Reconstruction' },
  { name: 'Dr. Maria Lourdes Tolentino, FPCP', pan: 'PAN-5520-9918', spec: 'Endocrinology & Diabetes' }
];

const HMO_PROVIDERS = [
  { name: 'Maxicare', allowance: 1500, mblMin: 120000, mblMax: 250000, codePrefix: 'MX' },
  { name: 'Intellicare', allowance: 1800, mblMin: 150000, mblMax: 300000, codePrefix: 'INT' },
  { name: 'Medicard', allowance: 1500, mblMin: 100000, mblMax: 200000, codePrefix: 'MC' },
  { name: 'Pacific Cross', allowance: 1600, mblMin: 180000, mblMax: 400000, codePrefix: 'PX' },
  { name: 'PhilCare', allowance: 1200, mblMin: 80000, mblMax: 180000, codePrefix: 'PC' },
  { name: 'Etiqa Philippines', allowance: 1800, mblMin: 150000, mblMax: 250000, codePrefix: 'ETQ' },
  { name: 'Caritas Health Shield', allowance: 1000, mblMin: 80000, mblMax: 150000, codePrefix: 'CHS' },
  { name: 'Insular Health Care', allowance: 1500, mblMin: 120000, mblMax: 200000, codePrefix: 'IHC' }
];

interface ClinicalArchetype {
  icd10: string;
  description: string;
  caseRateCode: string;
  totalCaseRate: number;
  hciAmount: number;
  pfAmount: number;
  isNbb: boolean;
  baseHospitalGross: number;
  baseDoctorFee: number;
  roomCategory: 'WARD' | 'SEMI_PRIVATE' | 'REGULAR_PRIVATE' | 'SUITE';
  dailyRate: number;
  days: number;
  department: string;
  doctorIndex: number;
  meds: { code: string; name: string; cost: number }[];
  supplies: { code: string; name: string; cost: number }[];
  labs: { code: string; name: string; cost: number }[];
}

const CLINICAL_ARCHETYPES: ClinicalArchetype[] = [
  {
    icd10: 'J18.9',
    description: 'Pneumonia, Unspecified Organism (High Risk)',
    caseRateCode: 'J18.9',
    totalCaseRate: 48000,
    hciAmount: 33600,
    pfAmount: 14400,
    isNbb: false,
    baseHospitalGross: 62000,
    baseDoctorFee: 22000,
    roomCategory: 'REGULAR_PRIVATE',
    dailyRate: 3000,
    days: 4,
    department: 'Pulmonology',
    doctorIndex: 8,
    meds: [
      { code: 'RX-PIPTAZ-4.5', name: 'Piperacillin-Tazobactam 4.5g IV Vial', cost: 1850 },
      { code: 'RX-LEVO-750', name: 'Levofloxacin 750mg IV Infusion', cost: 1420 },
      { code: 'RX-NACC-600', name: 'N-Acetylcysteine 600mg Effervescent', cost: 480 }
    ],
    supplies: [
      { code: 'CSR-NEB-KIT', name: 'Aerosol Nebulizer Mask & Tubing Kit', cost: 650 },
      { code: 'CSR-O2-CAN', name: 'High-Flow Nasal Cannula with Heated Tubing', cost: 1850 }
    ],
    labs: [
      { code: 'LAB-CBC-PLT', name: 'Complete Blood Count with Platelet Series', cost: 620 },
      { code: 'LAB-BC-AER', name: 'Blood Culture & Sensitivity (Aerobic/Anaerobic)', cost: 2400 },
      { code: 'RAD-CXR-PA', name: 'Chest Radiography Digital PA / Lateral View', cost: 1150 }
    ]
  },
  {
    icd10: 'K35.8',
    description: 'Acute Appendicitis with Localized Peritonitis',
    caseRateCode: '47600',
    totalCaseRate: 36000,
    hciAmount: 23400,
    pfAmount: 12600,
    isNbb: false,
    baseHospitalGross: 48000,
    baseDoctorFee: 26000,
    roomCategory: 'SEMI_PRIVATE',
    dailyRate: 2000,
    days: 3,
    department: 'General Surgery',
    doctorIndex: 0,
    meds: [
      { code: 'RX-CEFU-750', name: 'Cefuroxime 750mg IV Vial', cost: 890 },
      { code: 'RX-METRO-500', name: 'Metronidazole 500mg IV Infusion', cost: 450 },
      { code: 'RX-TRAM-50', name: 'Tramadol HCl 50mg/mL Ampoule', cost: 380 }
    ],
    supplies: [
      { code: 'OR-APP-PACK', name: 'Appendectomy Surgical Laparotomy Drape Pack', cost: 4800 },
      { code: 'CSR-JP-DRAIN', name: 'Jackson-Pratt Closed Wound Suction Kit', cost: 2200 }
    ],
    labs: [
      { code: 'LAB-CBC-DIFF', name: 'CBC with Differential White Cell Count', cost: 620 },
      { code: 'RAD-US-APP', name: 'High-Resolution Grayscale Abdominal Ultrasound', cost: 2800 }
    ]
  },
  {
    icd10: 'A97.1',
    description: 'Dengue with Warning Signs (Severe Thrombocytopenia)',
    caseRateCode: 'A97.1',
    totalCaseRate: 24000,
    hciAmount: 16800,
    pfAmount: 7200,
    isNbb: true,
    baseHospitalGross: 28000,
    baseDoctorFee: 9000,
    roomCategory: 'WARD',
    dailyRate: 1000,
    days: 4,
    department: 'Internal Medicine',
    doctorIndex: 2,
    meds: [
      { code: 'RX-PLR-1L', name: 'Plain Lactated Ringer Solution 1000mL', cost: 280 },
      { code: 'RX-PCM-1G', name: 'Paracetamol 1000mg/100mL IV Infusion', cost: 680 }
    ],
    supplies: [
      { code: 'CSR-IV-INF', name: 'Microdrip Infusion Set with Air Vent', cost: 320 },
      { code: 'CSR-CAN-22G', name: 'Radiopaque IV Cannula 22 Gauge', cost: 240 }
    ],
    labs: [
      { code: 'LAB-PLT-SER', name: 'Serial Platelet Count & Hematocrit (q6h)', cost: 1800 },
      { code: 'LAB-NS1-AG', name: 'Dengue NS1 Antigen Rapid Immunochromatography', cost: 1650 }
    ]
  },
  {
    icd10: 'I63.9',
    description: 'Acute Ischemic Cerebral Infarction',
    caseRateCode: 'I63.9',
    totalCaseRate: 38000,
    hciAmount: 27000,
    pfAmount: 11000,
    isNbb: false,
    baseHospitalGross: 55000,
    baseDoctorFee: 20000,
    roomCategory: 'SEMI_PRIVATE',
    dailyRate: 2200,
    days: 5,
    department: 'Neurology',
    doctorIndex: 7,
    meds: [
      { code: 'RX-CITI-1G', name: 'Citicoline Sodium 1000mg/4mL Ampoule', cost: 950 },
      { code: 'RX-ATOR-40', name: 'Atorvastatin Calcium 40mg Film-Coated Tablet', cost: 120 },
      { code: 'RX-ENX-40', name: 'Enoxaparin Sodium 4000 IU / 0.4mL Prefilled Syringe', cost: 1250 }
    ],
    supplies: [
      { code: 'CSR-NGT-16F', name: 'Enteral Levin Nasogastric Feeding Tube 16Fr', cost: 420 },
      { code: 'CSR-FOL-16F', name: 'Foley Catheter Silicone 2-Way 16Fr with 10mL Balloon', cost: 580 }
    ],
    labs: [
      { code: 'RAD-CT-BRAIN', name: 'Computed Tomography (CT) Brain Non-Contrast', cost: 4500 },
      { code: 'LAB-LIPID-EXT', name: 'Expanded Lipid Profile (Cholesterol, HDL, LDL, Triglycerides)', cost: 1150 }
    ]
  },
  {
    icd10: 'O82.0',
    description: 'Primary Cesarean Section Delivery for Cephalopelvic Disproportion',
    caseRateCode: 'O82.0',
    totalCaseRate: 28500,
    hciAmount: 19950,
    pfAmount: 8550,
    isNbb: false,
    baseHospitalGross: 42000,
    baseDoctorFee: 24000,
    roomCategory: 'SEMI_PRIVATE',
    dailyRate: 2200,
    days: 3,
    department: 'Obstetrics & Gynecology',
    doctorIndex: 4,
    meds: [
      { code: 'RX-OXYT-10', name: 'Oxytocin 10 IU/mL Synthetic Ampoule', cost: 320 },
      { code: 'RX-CEFAZ-1G', name: 'Cefazolin Sodium 1g IV Vial', cost: 680 }
    ],
    supplies: [
      { code: 'OR-CS-PACK', name: 'Cesarean Delivery Surgical Drape & Instrument Pack', cost: 5200 },
      { code: 'CSR-NB-CORD', name: 'Sterile Newborn Umbilical Cord Clamp & Band', cost: 280 }
    ],
    labs: [
      { code: 'LAB-BLOOD-TYP', name: 'ABO and Rh Blood Group Typing with Crossmatching', cost: 1450 },
      { code: 'LAB-URINE-ROUT', name: 'Urinalysis Automated Chemistry & Microscopy', cost: 280 }
    ]
  },
  {
    icd10: 'K80.2',
    description: 'Calculus of Gallbladder with Chronic Cholecystitis (Lap Chole)',
    caseRateCode: '47562',
    totalCaseRate: 46500,
    hciAmount: 31500,
    pfAmount: 15000,
    isNbb: false,
    baseHospitalGross: 68000,
    baseDoctorFee: 32000,
    roomCategory: 'REGULAR_PRIVATE',
    dailyRate: 3200,
    days: 3,
    department: 'General Surgery',
    doctorIndex: 0,
    meds: [
      { code: 'RX-CEFTR-1G', name: 'Ceftriaxone Sodium 1g Sterile IV Powder', cost: 980 },
      { code: 'RX-KETOR-30', name: 'Ketorolac Tromethamine 30mg/mL Ampoule', cost: 420 }
    ],
    supplies: [
      { code: 'OR-LAP-SET', name: 'Laparoscopic Trocar Ports & Insufflation Tubing Set', cost: 6500 },
      { code: 'CSR-ENDO-BAG', name: 'Endoscopic Specimen Retrieval Catch Bag 10mm', cost: 2400 }
    ],
    labs: [
      { code: 'RAD-US-HBT', name: 'Ultrasound Hepatobiliary Tree, Gallbladder & Pancreas', cost: 2600 },
      { code: 'LAB-LFT-PANEL', name: 'Liver Function Test Panel (ALT, AST, AlkPhos, Bilirubin)', cost: 1950 }
    ]
  },
  {
    icd10: 'S72.301A',
    description: 'Closed Fracture of Shaft of Right Femur (ORIF with Intramedullary Nail)',
    caseRateCode: '27244',
    totalCaseRate: 30800,
    hciAmount: 18000,
    pfAmount: 12800,
    isNbb: false,
    baseHospitalGross: 78000,
    baseDoctorFee: 35000,
    roomCategory: 'REGULAR_PRIVATE',
    dailyRate: 3200,
    days: 5,
    department: 'Orthopedics',
    doctorIndex: 3,
    meds: [
      { code: 'RX-CEFA-1G', name: 'Cefazolin 1g IV Vial', cost: 680 },
      { code: 'RX-NALB-10', name: 'Nalbuphine HCl 10mg/mL Ampoule', cost: 580 }
    ],
    supplies: [
      { code: 'OR-ORTHO-NAIL', name: 'Femoral Interlocking Nail Titanium System', cost: 18500 },
      { code: 'CSR-CAST-SPL', name: 'Synthetic Fiberglass Casting Bandage 4-Inch', cost: 1200 }
    ],
    labs: [
      { code: 'RAD-XRAY-FEM', name: 'X-Ray Right Femur AP / Lateral Views', cost: 1400 },
      { code: 'LAB-PT-INR', name: 'Prothrombin Time with INR Coagulation Screen', cost: 780 }
    ]
  },
  {
    icd10: 'I21.0',
    description: 'Acute Transmural Myocardial Infarction of Anterior Wall (STEMI)',
    caseRateCode: 'I21.0',
    totalCaseRate: 48000,
    hciAmount: 33600,
    pfAmount: 14400,
    isNbb: false,
    baseHospitalGross: 86000,
    baseDoctorFee: 28000,
    roomCategory: 'REGULAR_PRIVATE',
    dailyRate: 4500,
    days: 4,
    department: 'Cardiology',
    doctorIndex: 1,
    meds: [
      { code: 'RX-CLOP-75', name: 'Clopidogrel Bisulfate 75mg Film-Coated Tablet', cost: 95 },
      { code: 'RX-HEP-5000', name: 'Unfractionated Heparin 5000 IU/mL Vial', cost: 850 },
      { code: 'RX-ISOD-5', name: 'Isosorbide Dinitrate 5mg Sublingual Tablet', cost: 85 }
    ],
    supplies: [
      { code: 'CSR-TELEM-ELEC', name: 'Continuous Cardiac Telemetry Pre-Gelled Electrodes', cost: 650 },
      { code: 'CSR-ART-LINE', name: 'Radial Artery Cannulation Transducer Kit', cost: 3200 }
    ],
    labs: [
      { code: 'LAB-TROP-I', name: 'High-Sensitivity Troponin I Quantitative Immunoassay', cost: 2200 },
      { code: 'RAD-2D-ECHO', name: 'Transthoracic 2D Echocardiography with Color Doppler', cost: 4200 }
    ]
  },
  {
    icd10: 'N18.5',
    description: 'Chronic Kidney Disease Stage 5 on Maintenance Hemodialysis',
    caseRateCode: 'N18.5',
    totalCaseRate: 8000,
    hciAmount: 5600,
    pfAmount: 2400,
    isNbb: true,
    baseHospitalGross: 12000,
    baseDoctorFee: 3000,
    roomCategory: 'WARD',
    dailyRate: 1000,
    days: 1,
    department: 'Nephrology',
    doctorIndex: 5,
    meds: [
      { code: 'RX-EPO-4000', name: 'Epoetin Alfa 4000 IU/0.4mL Prefilled Syringe', cost: 1450 },
      { code: 'RX-FE-SUCR', name: 'Iron Sucrose Complex 100mg/5mL Ampoule', cost: 890 }
    ],
    supplies: [
      { code: 'CSR-HD-DIAL', name: 'High-Flux Polysulfone Hemodialyzer Filter 1.8m²', cost: 2400 },
      { code: 'CSR-HD-LINES', name: 'Arterial and Venous Bloodline Tubing Set', cost: 950 }
    ],
    labs: [
      { code: 'LAB-BUN-CREAT', name: 'Blood Urea Nitrogen and Serum Creatinine', cost: 580 },
      { code: 'LAB-K-SERUM', name: 'Serum Electrolytes (Potassium, Sodium, Chloride)', cost: 680 }
    ]
  },
  {
    icd10: 'E11.0',
    description: 'Type 2 Diabetes Mellitus with Hyperglycemic Hyperosmolar State',
    caseRateCode: 'E11.0',
    totalCaseRate: 27000,
    hciAmount: 18900,
    pfAmount: 8100,
    isNbb: false,
    baseHospitalGross: 44000,
    baseDoctorFee: 16000,
    roomCategory: 'SEMI_PRIVATE',
    dailyRate: 2000,
    days: 4,
    department: 'Endocrinology',
    doctorIndex: 12,
    meds: [
      { code: 'RX-REG-INS', name: 'Regular Human Recombinant Insulin 100 IU/mL 10mL', cost: 1100 },
      { code: 'RX-NSS-1L', name: '0.9% Normal Saline Solution 1000mL IV Bottle', cost: 220 }
    ],
    supplies: [
      { code: 'CSR-GLUC-STRIP', name: 'Point-of-Care Capillary Glucose Strips (Pack of 25)', cost: 950 },
      { code: 'CSR-INF-PUMP', name: 'Volumetric Precision IV Infusion Pump Tubing', cost: 780 }
    ],
    labs: [
      { code: 'LAB-HBA1C-HPLC', name: 'Glycated Hemoglobin HbA1c via Ion-Exchange HPLC', cost: 1200 },
      { code: 'LAB-SER-OSM', name: 'Calculated Serum Osmolality and Anion Gap Panel', cost: 1450 }
    ]
  },
  {
    icd10: 'P36.9',
    description: 'Bacterial Sepsis of Newborn, Unspecified (NICU Inpatient)',
    caseRateCode: 'P36.9',
    totalCaseRate: 33000,
    hciAmount: 23100,
    pfAmount: 9900,
    isNbb: true,
    baseHospitalGross: 52000,
    baseDoctorFee: 18000,
    roomCategory: 'REGULAR_PRIVATE',
    dailyRate: 4500,
    days: 6,
    department: 'Neonatology',
    doctorIndex: 10,
    meds: [
      { code: 'RX-AMP-500', name: 'Ampicillin Sodium 500mg IV Powder Vial', cost: 380 },
      { code: 'RX-GENT-20', name: 'Gentamicin Sulfate 20mg/2mL Pediatric Ampoule', cost: 260 }
    ],
    supplies: [
      { code: 'CSR-NICU-LINE', name: 'Umbilical Artery / Vein Catheterization Dual Lumen 3.5Fr', cost: 3600 },
      { code: 'CSR-NEO-SENS', name: 'Neonatal Skin Surface Temperature Sensor Lead', cost: 720 }
    ],
    labs: [
      { code: 'LAB-NEO-BC', name: 'Pediatric Low-Volume Blood Culture Aerobic', cost: 2100 },
      { code: 'LAB-CRP-QUANT', name: 'C-Reactive Protein High-Sensitivity Quantitative', cost: 890 }
    ]
  },
  {
    icd10: 'A09',
    description: 'Infectious Gastroenteritis with Severe Dehydration and Acidosis',
    caseRateCode: 'A09',
    totalCaseRate: 13500,
    hciAmount: 9450,
    pfAmount: 4050,
    isNbb: true,
    baseHospitalGross: 18000,
    baseDoctorFee: 6500,
    roomCategory: 'WARD',
    dailyRate: 1000,
    days: 2,
    department: 'Pediatrics',
    doctorIndex: 6,
    meds: [
      { code: 'RX-D5-0.3', name: 'D5 0.3% Sodium Chloride 500mL Pediatric Infusion', cost: 240 },
      { code: 'RX-ZINC-SUL', name: 'Zinc Sulfate 20mg/5mL Pediatric Oral Drops', cost: 180 },
      { code: 'RX-PROBIO', name: 'Bacillus clausii Probiotic Spores Oral Suspension', cost: 420 }
    ],
    supplies: [
      { code: 'CSR-PED-IV', name: 'Soluset Burette 100mL Pediatric Infusion Chamber', cost: 450 },
      { code: 'CSR-BUTT-24G', name: 'Scalp Vein Butterfly Needle 24 Gauge', cost: 160 }
    ],
    labs: [
      { code: 'LAB-STOOL-EX', name: 'Fecalysis Direct Smear with Occult Blood Testing', cost: 320 },
      { code: 'LAB-SER-ELEC', name: 'Serum Sodium, Potassium, Chloride and Bicarbonate', cost: 850 }
    ]
  },
  {
    icd10: 'J45.9',
    description: 'Bronchial Asthma in Acute Exacerbation (Status Asthmaticus)',
    caseRateCode: 'J45.9',
    totalCaseRate: 16500,
    hciAmount: 11550,
    pfAmount: 4950,
    isNbb: false,
    baseHospitalGross: 24000,
    baseDoctorFee: 8500,
    roomCategory: 'SEMI_PRIVATE',
    dailyRate: 1800,
    days: 3,
    department: 'Pulmonology',
    doctorIndex: 8,
    meds: [
      { code: 'RX-SALB-NEB', name: 'Salbutamol + Ipratropium 2.5mg/500mcg Respule', cost: 120 },
      { code: 'RX-HYDR-100', name: 'Hydrocortisone Sodium Succinate 100mg IV Vial', cost: 420 }
    ],
    supplies: [
      { code: 'CSR-SPACER', name: 'Valved Holding Chamber Spacer with Pediatric Mask', cost: 850 },
      { code: 'CSR-PEF-MTR', name: 'Mechanical Peak Expiratory Flow Rate Meter', cost: 720 }
    ],
    labs: [
      { code: 'LAB-ABG-HEPB', name: 'Arterial Blood Gas Analysis with Co-Oximetry', cost: 1450 },
      { code: 'RAD-CXR-PORT', name: 'Portable Bedside Digital Chest Radiography', cost: 1350 }
    ]
  },
  {
    icd10: 'U07.1',
    description: 'COVID-19 Severe Pneumonia with Hypoxemic Respiratory Failure',
    caseRateCode: 'U07.1',
    totalCaseRate: 49950,
    hciAmount: 34965,
    pfAmount: 14985,
    isNbb: false,
    baseHospitalGross: 82000,
    baseDoctorFee: 26000,
    roomCategory: 'REGULAR_PRIVATE',
    dailyRate: 4200,
    days: 6,
    department: 'Infectious Disease',
    doctorIndex: 2,
    meds: [
      { code: 'RX-REM-100', name: 'Remdesivir 100mg Lyophilized IV Powder Vial', cost: 4200 },
      { code: 'RX-BARIC-4', name: 'Baricitinib 4mg Film-Coated Tablet', cost: 1650 },
      { code: 'RX-DEXA-8', name: 'Dexamethasone Sodium Phosphate 8mg/2mL Ampoule', cost: 280 }
    ],
    supplies: [
      { code: 'CSR-ISO-PPE', name: 'Level 4 Impermeable Viral Isolation Coverall & N95', cost: 2400 },
      { code: 'CSR-VENT-CIR', name: 'Dual-Heated Heated Wire Mechanical Ventilator Circuit', cost: 4200 }
    ],
    labs: [
      { code: 'LAB-RT-PCR', name: 'SARS-CoV-2 Real-Time Reverse Transcription PCR', cost: 2800 },
      { code: 'LAB-D-DIMER', name: 'Quantitative D-Dimer Fibrin Degradation Assay', cost: 1850 }
    ]
  },
  {
    icd10: 'S82.201A',
    description: 'Closed Fracture of Shaft of Left Tibia (ORIF with Compression Plate)',
    caseRateCode: '27752',
    totalCaseRate: 26000,
    hciAmount: 15600,
    pfAmount: 10400,
    isNbb: false,
    baseHospitalGross: 52000,
    baseDoctorFee: 22000,
    roomCategory: 'SEMI_PRIVATE',
    dailyRate: 2000,
    days: 4,
    department: 'Orthopedics',
    doctorIndex: 3,
    meds: [
      { code: 'RX-CEFAZ-1G', name: 'Cefazolin 1g IV Vial', cost: 680 },
      { code: 'RX-PARAC-1G', name: 'Paracetamol 1g/100mL IV Infusion', cost: 680 }
    ],
    supplies: [
      { code: 'OR-TIB-PLATE', name: 'Anatomic Contoured Tibial LCP Plate Titanium', cost: 14500 },
      { code: 'CSR-WND-VAC', name: 'Negative Pressure Wound Therapy Foam Dressing Pack', cost: 4800 }
    ],
    labs: [
      { code: 'RAD-XRAY-TIB', name: 'X-Ray Left Tibia-Fibula AP and Lateral Views', cost: 1200 }
    ]
  },
  {
    icd10: 'K40.9',
    description: 'Unilateral Inguinal Hernia without Obstruction (Lichtenstein Mesh Repair)',
    caseRateCode: '49505',
    totalCaseRate: 24000,
    hciAmount: 15600,
    pfAmount: 8400,
    isNbb: false,
    baseHospitalGross: 34000,
    baseDoctorFee: 18000,
    roomCategory: 'SEMI_PRIVATE',
    dailyRate: 2000,
    days: 2,
    department: 'General Surgery',
    doctorIndex: 0,
    meds: [
      { code: 'RX-CEFU-750', name: 'Cefuroxime 750mg IV Vial', cost: 890 },
      { code: 'RX-KETOR-30', name: 'Ketorolac 30mg/mL Ampoule', cost: 420 }
    ],
    supplies: [
      { code: 'OR-HERN-MESH', name: 'Monofilament Polypropylene Hernia Mesh 3x6 Inches', cost: 3800 },
      { code: 'CSR-SURG-GLV', name: 'Sterile Powder-Free Surgical Gloves Size 7.5', cost: 240 }
    ],
    labs: [
      { code: 'LAB-PREOP-PAN', name: 'Standard Pre-Operative Coagulation and CBC Panel', cost: 1450 }
    ]
  },
  {
    icd10: 'E04.2',
    description: 'Nontoxic Multinodular Goiter (Total Thyroidectomy)',
    caseRateCode: '60240',
    totalCaseRate: 35000,
    hciAmount: 22750,
    pfAmount: 12250,
    isNbb: false,
    baseHospitalGross: 58000,
    baseDoctorFee: 26000,
    roomCategory: 'REGULAR_PRIVATE',
    dailyRate: 3200,
    days: 3,
    department: 'Surgical Oncology',
    doctorIndex: 9,
    meds: [
      { code: 'RX-LEVOTH-100', name: 'Levothyroxine Sodium 100mcg Tablet', cost: 45 },
      { code: 'RX-CALC-CARB', name: 'Calcium Carbonate + Vitamin D3 500mg Tablet', cost: 35 }
    ],
    supplies: [
      { code: 'OR-HARMONIC', name: 'Ultrasonic Harmonic Scalpel Curved Shear Blade', cost: 9800 },
      { code: 'CSR-NERV-MON', name: 'Intraoperative Recurrent Laryngeal Nerve Monitor Probe', cost: 4500 }
    ],
    labs: [
      { code: 'LAB-THYR-PAN', name: 'Complete Thyroid Panel (TSH, Free T3, Free T4)', cost: 1850 },
      { code: 'LAB-PTH-INTRA', name: 'Intraoperative Intact Parathyroid Hormone (iPTH)', cost: 2600 }
    ]
  },
  {
    icd10: 'N10',
    description: 'Acute Pyelonephritis with Uncomplicated Sepsis',
    caseRateCode: 'N10',
    totalCaseRate: 32000,
    hciAmount: 22400,
    pfAmount: 9600,
    isNbb: false,
    baseHospitalGross: 45000,
    baseDoctorFee: 16000,
    roomCategory: 'SEMI_PRIVATE',
    dailyRate: 2000,
    days: 4,
    department: 'Internal Medicine',
    doctorIndex: 2,
    meds: [
      { code: 'RX-MERO-1G', name: 'Meropenem Trihydrate 1g Sterile IV Vial', cost: 2200 },
      { code: 'RX-CIPRO-400', name: 'Ciprofloxacin 400mg/200mL IV Infusion', cost: 980 }
    ],
    supplies: [
      { code: 'CSR-URINEMET', name: 'Precision Closed Hourly Urine Meter Drainage Bag', cost: 1250 }
    ],
    labs: [
      { code: 'LAB-UC-SENS', name: 'Urine Culture & Automated Colony Colony Identification', cost: 1600 },
      { code: 'RAD-KUB-US', name: 'Renal Ultrasound Kidneys, Ureters and Urinary Bladder', cost: 2400 }
    ]
  },
  {
    icd10: 'M17.1',
    description: 'Primary Unilateral Osteoarthritis of Right Knee (Total Knee Arthroplasty)',
    caseRateCode: '27447',
    totalCaseRate: 45000,
    hciAmount: 27000,
    pfAmount: 18000,
    isNbb: false,
    baseHospitalGross: 110000,
    baseDoctorFee: 42000,
    roomCategory: 'SUITE',
    dailyRate: 5000,
    days: 4,
    department: 'Orthopedics',
    doctorIndex: 11,
    meds: [
      { code: 'RX-VANCO-1G', name: 'Vancomycin HCl 1g Sterile IV Vial', cost: 1450 },
      { code: 'RX-CELE-200', name: 'Celecoxib 200mg Capsule', cost: 65 }
    ],
    supplies: [
      { code: 'OR-TKA-IMPL', name: 'Total Knee Prosthesis Modular Cobalt-Chrome Implant', cost: 42000 },
      { code: 'OR-BONE-CEM', name: 'Radiopaque Antibiotic Bone Cement Gentamicin 40g', cost: 6500 }
    ],
    labs: [
      { code: 'RAD-KNEE-XRAY', name: 'Right Knee Standing Weight-Bearing 3-View X-Ray', cost: 1650 }
    ]
  },
  {
    icd10: 'R10.4',
    description: 'Acute Abdominal Pain under Observation (ED Short Stay)',
    caseRateCode: 'R10.4',
    totalCaseRate: 9000,
    hciAmount: 6300,
    pfAmount: 2700,
    isNbb: true,
    baseHospitalGross: 14000,
    baseDoctorFee: 4500,
    roomCategory: 'WARD',
    dailyRate: 800,
    days: 1,
    department: 'Emergency Medicine',
    doctorIndex: 2,
    meds: [
      { code: 'RX-HYOS-20', name: 'Hyoscine-N-Butylbromide 20mg/mL Ampoule', cost: 280 },
      { code: 'RX-OMEP-40', name: 'Omeprazole 40mg IV Powder Vial with Solvent', cost: 650 }
    ],
    supplies: [
      { code: 'CSR-ED-PACK', name: 'Emergency Admission Triage & Phlebotomy Kit', cost: 480 }
    ],
    labs: [
      { code: 'LAB-AMYL-LIP', name: 'Serum Amylase and Lipase Pancreatic Enzymes', cost: 1250 },
      { code: 'RAD-ABDO-SUP', name: 'Acute Abdomen Series Supine and Upright Radiographs', cost: 1850 }
    ]
  }
];

// Room numbers across units
function getRoomForIndex(idx: number, archetype: ClinicalArchetype): { roomBed: string; category: Encounter['roomCategory']; rate: number } {
  const mod = idx % 25;
  if (archetype.department === 'Emergency Medicine') {
    return { roomBed: `ED-${(idx % 25) + 1}`, category: 'WARD', rate: 800 };
  }
  if (archetype.department === 'Neonatology') {
    return { roomBed: `NICU-${(idx % 8) + 1}`, category: 'REGULAR_PRIVATE', rate: 4500 };
  }
  if (archetype.department === 'Pediatric Intensive Care') {
    return { roomBed: `PICU-${(idx % 6) + 1}`, category: 'REGULAR_PRIVATE', rate: 4500 };
  }
  if (archetype.icd10 === 'I61.9' || archetype.icd10 === 'I21.0' && idx % 2 === 0) {
    return { roomBed: `ICU-${(idx % 12) + 1}`, category: 'REGULAR_PRIVATE', rate: 5500 };
  }
  if (archetype.department === 'Nephrology' && idx % 3 === 0) {
    return { roomBed: `Dialysis-${(idx % 12) + 1}`, category: 'WARD', rate: 1000 };
  }
  if (archetype.roomCategory === 'SUITE') {
    return { roomBed: `Suite 4${(mod % 10) + 21}`, category: 'SUITE', rate: 5500 };
  }
  if (archetype.department === 'Orthopedics' || archetype.department === 'Pediatrics') {
    return { roomBed: `Bed 6${(mod % 30) + 1}`, category: archetype.roomCategory, rate: archetype.dailyRate };
  }
  if (archetype.department === 'Internal Medicine' || archetype.department === 'Cardiology' || archetype.department === 'Endocrinology') {
    return { roomBed: `Bed 5${(mod % 30) + 1}`, category: archetype.roomCategory, rate: archetype.dailyRate };
  }
  if (archetype.department === 'General Surgery' || archetype.department === 'Obstetrics & Gynecology' || archetype.department === 'Surgical Oncology') {
    const letters = ['A', 'B'];
    return { roomBed: `Bed 3${(mod % 25) + 1}-${letters[idx % 2]}`, category: 'SEMI_PRIVATE', rate: 2000 };
  }
  if (archetype.roomCategory === 'REGULAR_PRIVATE') {
    return { roomBed: `Bed 4${(mod % 20) + 1}`, category: 'REGULAR_PRIVATE', rate: 3200 };
  }
  // Telemetry & Step-Down (2nd Floor)
  return { roomBed: `Bed 2${(mod % 25) + 1}`, category: archetype.roomCategory, rate: archetype.dailyRate };
}

// ============================================================================
// MAIN GENERATOR FUNCTION
// Generates encounters from startIndex up to totalTarget (e.g. 16 to 250)
// ============================================================================
export function generateAdditionalEncounters(startIndex: number, totalTarget: number): Encounter[] {
  const encounters: Encounter[] = [];
  const prng = createPrng(20260925);

  for (let i = startIndex; i <= totalTarget; i++) {
    const isMale = prng() > 0.5;
    const firstName = isMale
      ? MALE_FIRST_NAMES[Math.floor(prng() * MALE_FIRST_NAMES.length)]
      : FEMALE_FIRST_NAMES[Math.floor(prng() * FEMALE_FIRST_NAMES.length)];
    const middleInitial = MIDDLE_INITIALS[Math.floor(prng() * MIDDLE_INITIALS.length)];
    const lastName = LAST_NAMES[Math.floor(prng() * LAST_NAMES.length)];
    const maskedName = `${lastName.toUpperCase()}, ${firstName} ${middleInitial}`;

    const age = Math.floor(18 + prng() * 68);
    const isSeniorCitizen = age >= 60;
    const isPwd = !isSeniorCitizen && prng() < 0.08;

    const encNumber = `ENC-2026-${(1000 + i).toString()}`;
    const mrn = `MRN-${(200000 + i * 7).toString()}`;
    const philhealthPin = `${Math.floor(10 + prng() * 15)}-${Math.floor(1000 + prng() * 9000)}-${Math.floor(1000 + prng() * 9000)}-${Math.floor(prng() * 9)}`;

    // Select archetype
    const archetypeIndex = Math.floor(prng() * CLINICAL_ARCHETYPES.length);
    const arch = CLINICAL_ARCHETYPES[archetypeIndex];
    const roomInfo = getRoomForIndex(i, arch);
    const doctor = DOCTORS[arch.doctorIndex % DOCTORS.length];
    const hmoConfig = HMO_PROVIDERS[Math.floor(prng() * HMO_PROVIDERS.length)];

    // Scenario / Problem Category Assignment
    // 0: Clean (~58%)
    // 1: Missing Documentation (~12%)
    // 2: Coding/Diagnosis Mismatch (~7%)
    // 3: Incomplete Requirements (~5%)
    // 4: PhilHealth Benefit/Aging (~6%)
    // 5: HMO Final LOA / Disallowed Supplies (~8%)
    // 6: Billing / Unreturned Meds / Disputes (~6%)
    // 7: Promissory Note RA 9439 (special 6 cases)
    const probRoll = prng();
    let problemType:
      | 'CLEAN'
      | 'MISSING_DOCS'
      | 'CODING_MISMATCH'
      | 'INCOMPLETE_REQ'
      | 'PH_BENEFIT'
      | 'HMO_ISSUE'
      | 'BILLING_DISPUTE'
      | 'DENIED_RETURNED'
      | 'PENDING_APPROVAL' = 'CLEAN';

    if (probRoll < 0.55) {
      problemType = 'CLEAN';
    } else if (probRoll < 0.67) {
      problemType = 'MISSING_DOCS';
    } else if (probRoll < 0.74) {
      problemType = 'CODING_MISMATCH';
    } else if (probRoll < 0.79) {
      problemType = 'INCOMPLETE_REQ';
    } else if (probRoll < 0.85) {
      problemType = 'PH_BENEFIT';
    } else if (probRoll < 0.90) {
      problemType = 'HMO_ISSUE';
    } else if (probRoll < 0.94) {
      problemType = 'BILLING_DISPUTE';
    } else if (probRoll < 0.97) {
      problemType = 'DENIED_RETURNED';
    } else {
      problemType = 'PENDING_APPROVAL';
    }

    // Determine Stage
    let stage: DischargeStage = 'CLEARED_GATE_PASS';
    let slaStatus: SlaStatus = 'NORMAL';
    let elapsedMinutes = Math.floor(12 + prng() * 32);

    if (problemType === 'CLEAN') {
      const stageRoll = prng();
      if (stageRoll < 0.65) {
        stage = 'CLEARED_GATE_PASS';
        slaStatus = 'NORMAL';
      } else if (stageRoll < 0.82) {
        stage = 'PENDING_SETTLEMENT';
        slaStatus = 'NORMAL';
      } else if (stageRoll < 0.92) {
        stage = 'HMO_FINAL_LOA';
        slaStatus = 'NORMAL';
      } else {
        stage = 'MGH_DECLARED';
        slaStatus = 'NORMAL';
      }
    } else if (problemType === 'MISSING_DOCS') {
      stage = 'DOCTOR_PF_PENDING';
      slaStatus = prng() > 0.4 ? 'WARNING' : 'BREACH';
      elapsedMinutes = Math.floor(35 + prng() * 30);
    } else if (problemType === 'CODING_MISMATCH' || problemType === 'INCOMPLETE_REQ') {
      stage = 'MGH_DECLARED';
      slaStatus = 'WARNING';
      elapsedMinutes = Math.floor(25 + prng() * 25);
    } else if (problemType === 'HMO_ISSUE') {
      stage = 'HMO_FINAL_LOA';
      slaStatus = prng() > 0.3 ? 'WARNING' : 'BREACH';
      elapsedMinutes = Math.floor(40 + prng() * 35);
    } else if (problemType === 'BILLING_DISPUTE') {
      stage = prng() > 0.5 ? 'PHARMACY_RTS_AUDIT' : 'PENDING_SETTLEMENT';
      slaStatus = 'WARNING';
      elapsedMinutes = Math.floor(30 + prng() * 30);
    } else if (problemType === 'DENIED_RETURNED') {
      stage = 'DOCTOR_PF_PENDING';
      slaStatus = 'BREACH';
      elapsedMinutes = Math.floor(48 + prng() * 25);
    } else {
      stage = 'HMO_FINAL_LOA';
      slaStatus = 'WARNING';
      elapsedMinutes = Math.floor(32 + prng() * 20);
    }

    // PhilHealth Status & Auditing
    let phStatus: PhilHealthClaim['status'] = 'CLEAN';
    let rthRiskScore = Number((0.01 + prng() * 0.05).toFixed(2));
    let cf4Vitals = true;
    let cf4Course = true;
    let cf4Labs = true;
    let eSoaConformity = true;
    let deficiencyReason: string | undefined = undefined;
    let claimAgingDays = Math.floor(1 + prng() * 10);

    if (problemType === 'MISSING_DOCS') {
      phStatus = 'WARNING';
      rthRiskScore = Number((0.65 + prng() * 0.25).toFixed(2));
      cf4Course = false;
      eSoaConformity = false;
      deficiencyReason = 'Missing Claim Form 4 daily ward course notes and physician discharge summary.';
    } else if (problemType === 'CODING_MISMATCH') {
      phStatus = 'INTERCEPTED';
      rthRiskScore = Number((0.75 + prng() * 0.2).toFixed(2));
      cf4Labs = false;
      deficiencyReason = 'Pre-flight scrutiny caught primary ICD-10 diagnostic coding mismatch vs procedure summary.';
    } else if (problemType === 'INCOMPLETE_REQ') {
      phStatus = 'INTERCEPTED';
      rthRiskScore = Number((0.68 + prng() * 0.15).toFixed(2));
      eSoaConformity = false;
      deficiencyReason = 'PhilHealth Member Data Record (MDR) maiden name discrepancy requires member update.';
    } else if (problemType === 'PH_BENEFIT') {
      phStatus = 'WARNING';
      claimAgingDays = Math.floor(38 + prng() * 20);
      rthRiskScore = Number((0.45 + prng() * 0.25).toFixed(2));
      deficiencyReason = `Single Period of Confinement (SPC) advisory flagged. Claim aging ${claimAgingDays} days post-discharge.`;
    } else if (problemType === 'DENIED_RETURNED') {
      phStatus = 'RETURNED';
      claimAgingDays = Math.floor(25 + prng() * 15);
      rthRiskScore = Number((0.85 + prng() * 0.12).toFixed(2));
      cf4Labs = false;
      cf4Course = false;
      eSoaConformity = false;
      deficiencyReason = 'Returned to Hospital (RTH) by PhilHealth — Inadequate clinical documentation and missing CF4 operative notes.';
    }

    // HMO Final LOA details
    let finalLoaStatus: HmoAuthorization['finalLoaStatus'] = 'APPROVED';
    let disallowedConsumables = 0;
    let approvedAmount = arch.baseHospitalGross * 0.6;
    let turnaroundMinutes = Math.floor(12 + prng() * 22);

    if (problemType === 'HMO_ISSUE') {
      if (prng() > 0.5) {
        finalLoaStatus = 'AWAITING_CODE';
        turnaroundMinutes = Math.floor(35 + prng() * 30);
      } else {
        finalLoaStatus = 'DISALLOWED_ITEMS';
        disallowedConsumables = Math.floor(1500 + prng() * 5000);
      }
    } else if (problemType === 'PENDING_APPROVAL') {
      finalLoaStatus = 'UNDER_REVIEW';
      turnaroundMinutes = Math.floor(45 + prng() * 30);
    } else if (stage === 'HMO_FINAL_LOA') {
      finalLoaStatus = 'AWAITING_CODE';
    }

    // Chargemaster Items Generation
    const items: ChargemasterItem[] = [];

    // 1. Room item
    const roomGross = roomInfo.rate * arch.days;
    const roomAllowanceTotal = hmoConfig.allowance * arch.days;
    const roomUpgradeExcess = Math.max(0, roomGross - roomAllowanceTotal);
    items.push({
      id: `it-${i}-rm`,
      code: `RM-${roomInfo.category.substring(0, 4)}`,
      description: `${roomInfo.category.replace(/_/g, ' ')} Accommodation (${arch.days} Days @ ₱${roomInfo.rate.toLocaleString()}/day)`,
      category: 'ROOM_BOARD',
      qty: arch.days,
      unitPrice: roomInfo.rate,
      grossAmount: roomGross,
      isVatable: true,
      philhealthCovered: 0,
      hmoCovered: Math.min(roomGross, roomAllowanceTotal),
      patientOop: roomUpgradeExcess,
      status: 'COVERED',
      plainLanguageExplainer: `Daily accommodation charges for ${arch.days} days.`
    });

    // 2. Pharmacy items
    arch.meds.forEach((m, mIdx) => {
      const qty = Math.floor(2 + prng() * 6);
      const gross = m.cost * qty;
      items.push({
        id: `it-${i}-rx-${mIdx}`,
        code: m.code,
        description: m.name,
        category: 'PHARMACY',
        qty,
        unitPrice: m.cost,
        grossAmount: gross,
        isVatable: true,
        philhealthCovered: Math.min(gross, arch.hciAmount * 0.2),
        hmoCovered: gross * 0.7,
        patientOop: 0,
        status: 'COVERED',
        plainLanguageExplainer: 'Prescribed medication covered under hospital formulary and insurer package.'
      });
    });

    // 3. Central Supplies items
    arch.supplies.forEach((s, sIdx) => {
      const gross = s.cost;
      const isDisallowed = problemType === 'HMO_ISSUE' && sIdx === 0 && disallowedConsumables > 0;
      items.push({
        id: `it-${i}-csr-${sIdx}`,
        code: s.code,
        description: s.name,
        category: 'CENTRAL_SUPPLIES',
        qty: 1,
        unitPrice: s.cost,
        grossAmount: gross,
        isVatable: true,
        philhealthCovered: 0,
        hmoCovered: isDisallowed ? 0 : gross,
        patientOop: isDisallowed ? gross : 0,
        status: isDisallowed ? 'DISALLOWED_SUNDRY' : 'COVERED',
        exclusionReasonClause: isDisallowed ? `${hmoConfig.name} Schedule 8 non-covered sundry exclusion` : undefined,
        plainLanguageExplainer: isDisallowed ? 'Sundry consumable excluded under HMO policy.' : 'Standard clinical supplies.'
      });
    });

    // 4. Lab items
    arch.labs.forEach((l, lIdx) => {
      items.push({
        id: `it-${i}-lab-${lIdx}`,
        code: l.code,
        description: l.name,
        category: 'LABORATORY',
        qty: 1,
        unitPrice: l.cost,
        grossAmount: l.cost,
        isVatable: true,
        philhealthCovered: Math.min(l.cost, arch.hciAmount * 0.15),
        hmoCovered: l.cost * 0.8,
        patientOop: 0,
        status: 'COVERED',
        plainLanguageExplainer: 'Diagnostic and monitoring laboratory investigations.'
      });
    });

    // 5. Professional Fee item
    const doctorAgreedFee = arch.baseDoctorFee;
    const doctorExcessPf = problemType === 'CLEAN' ? 0 : Math.floor(1500 + prng() * 4500);
    items.push({
      id: `it-${i}-pf`,
      code: `PF-${doctor.pan.substring(4, 8)}`,
      description: `Attending Specialist Fee (${doctor.name})`,
      category: 'PROFESSIONAL_FEE',
      qty: 1,
      unitPrice: doctorAgreedFee,
      grossAmount: doctorAgreedFee,
      isVatable: false,
      philhealthCovered: arch.pfAmount,
      hmoCovered: Math.max(0, doctorAgreedFee - arch.pfAmount - doctorExcessPf),
      patientOop: doctorExcessPf,
      status: doctorExcessPf > 0 ? 'EXCESS_PF' : 'COVERED',
      plainLanguageExplainer: doctorExcessPf > 0 ? `Doctor declared fee exceeds HMO tariff by ₱${doctorExcessPf.toLocaleString()}.` : 'Contracted physician professional fee.'
    });

    // Unreturned meds & disputes
    let unreturnedMedsCount = 0;
    let pharmacyRtsCleared = true;
    const disputes: BillingDispute[] = [];

    if (problemType === 'BILLING_DISPUTE') {
      if (prng() > 0.5) {
        unreturnedMedsCount = Math.floor(1 + prng() * 3);
        pharmacyRtsCleared = false;
        const medItem = items.find((it) => it.category === 'PHARMACY') || items[1];
        medItem.status = 'CONTESTED';
        medItem.isDisputed = true;
        medItem.patientOop = medItem.grossAmount;
        medItem.disputeReason = 'Unreturned ward medication awaiting physical pharmacy credit slip.';
        disputes.push({
          id: `disp-${i}`,
          encounterId: `enc-${1000 + i}`,
          itemId: medItem.id,
          itemDescription: medItem.description,
          contestedAmount: medItem.grossAmount,
          reason: 'Unreturned ward medicine pending pharmacy RTS credit slip reconciliation.',
          status: 'OPEN',
          createdAt: '2026-09-25T10:20:00+08:00',
          assignedStaff: 'Elena Santos',
          department: 'Pharmacy'
        });
      } else {
        const dispItem = items[items.length - 2];
        dispItem.status = 'CONTESTED';
        dispItem.isDisputed = true;
        dispItem.patientOop = dispItem.grossAmount;
        dispItem.disputeReason = 'Patient family questions item quantity billed upon discharge.';
        disputes.push({
          id: `disp-${i}`,
          encounterId: `enc-${1000 + i}`,
          itemId: dispItem.id,
          itemDescription: dispItem.description,
          contestedAmount: dispItem.grossAmount,
          reason: 'Patient requests nursing supervisor verification of unused floor stock.',
          status: 'OPEN',
          createdAt: '2026-09-25T10:20:00+08:00',
          assignedStaff: 'Elena Santos',
          department: 'Ward Services'
        });
      }
    }

    // Statutory Waterfall Calculation
    const waterfall = recalculateWaterfall(
      items,
      isSeniorCitizen || isPwd,
      arch.hciAmount,
      arch.pfAmount,
      approvedAmount,
      roomUpgradeExcess,
      doctorExcessPf
    );

    // Gate Pass & Promissory Notes
    let dischargePass: DischargePass | undefined = undefined;
    let promissoryNote: PromissoryNote | undefined = undefined;

    if (stage === 'CLEARED_GATE_PASS') {
      dischargePass = {
        passNumber: `PASS-${hmoConfig.codePrefix}-${Math.floor(10000 + prng() * 90000)}`,
        encounterId: `enc-${1000 + i}`,
        patientName: maskedName,
        roomBed: roomInfo.roomBed,
        settledAmount: waterfall.netPatientDue,
        settlementChannel: prng() > 0.4 ? 'QR_PH' : 'GCASH',
        issuedAt: '2026-09-25T10:40:00+08:00',
        verifiedAt: prng() > 0.3 ? '2026-09-25T10:44:00+08:00' : undefined,
        status: 'ACTIVE_READY_FOR_EXIT',
        hmacSignature: `sig-${Math.floor(10000000 + prng() * 90000000).toString(16)}`
      };
    }

    // Special: Execute statutory promissory notes under RA 9439 for select inpatient cases with balance
    if (i >= 18 && i <= 23 && waterfall.netPatientDue > 0) {
      const term: 3 | 6 | 12 = i % 2 === 0 ? 6 : 3;
      const monthly = Number((waterfall.netPatientDue / term).toFixed(2));
      promissoryNote = {
        id: `PN-2026-${(91 + (i - 18)).toString().padStart(3, '0')}`,
        encounterId: `enc-${1000 + i}`,
        borrowerName: `${lastName.toUpperCase()}, ${isMale ? 'Maria (Spouse)' : 'Jose (Spouse)'}`,
        borrowerRelationship: 'SPOUSE',
        borrowerIdType: 'PHILSYS_NATIONAL_ID',
        borrowerIdNumber: `4410-${Math.floor(1000 + prng() * 9000)}-${Math.floor(1000 + prng() * 9000)}-0021`,
        principalAmount: waterfall.netPatientDue,
        installmentMonths: term,
        monthlyInstallment: monthly,
        firstDueDate: '2026-10-25',
        digitalSignatureTimestamp: '2026-09-25T10:35:00+08:00',
        status: 'ACTIVE'
      };
    }

    // Chronological Audit Timeline Events
    const timeline: EncounterTimelineEvent[] = [
      {
        id: `tle-${i}-1`,
        timestamp: '2026-09-25T09:45:00+08:00',
        timeDisplay: '09:45 AM',
        title: 'MGH Order Entered',
        description: `Attending physician ${doctor.name} entered discharge clearance.`,
        actor: doctor.name,
        type: 'CLINICAL',
        status: 'COMPLETED'
      },
      {
        id: `tle-${i}-2`,
        timestamp: '2026-09-25T10:05:00+08:00',
        timeDisplay: '10:05 AM',
        title: 'PhilHealth eClaims Pre-Flight Validation',
        description: phStatus === 'CLEAN' ? 'ACR bundle and CF4 clinical completeness validated.' : deficiencyReason || 'Auditor review pending.',
        actor: 'Grace Tan (Claims Auditor)',
        type: 'PAYER',
        status: phStatus === 'CLEAN' ? 'COMPLETED' : 'BLOCKED'
      },
      {
        id: `tle-${i}-3`,
        timestamp: '2026-09-25T10:18:00+08:00',
        timeDisplay: '10:18 AM',
        title: `${hmoConfig.name} Final LOA Adjudication`,
        description: finalLoaStatus === 'APPROVED' ? `eLOA confirmed under policy limit ₱${hmoConfig.mblMin.toLocaleString()}.` : 'Portal response pending authorization code.',
        actor: `${hmoConfig.name} Portal`,
        type: 'PAYER',
        status: finalLoaStatus === 'APPROVED' ? 'COMPLETED' : 'PENDING'
      }
    ];

    if (stage === 'CLEARED_GATE_PASS') {
      timeline.push({
        id: `tle-${i}-4`,
        timestamp: '2026-09-25T10:38:00+08:00',
        timeDisplay: '10:38 AM',
        title: 'Digital Gate Pass Issued',
        description: 'Settlement confirmed. Ready for lobby exit.',
        actor: 'Elena Santos',
        type: 'DISCHARGE',
        status: 'COMPLETED'
      });
    }

    // Assemble Encounter
    const enc: Encounter = {
      id: `enc-${1000 + i}`,
      encounterNumber: encNumber,
      patient: {
        id: `pat-${1000 + i}`,
        mrn,
        maskedName,
        philhealthPin,
        isSeniorCitizen,
        isPwd,
        age,
        gender: isMale ? 'M' : 'F',
        contactNumber: `+63 9${Math.floor(10 + prng() * 89)} ${Math.floor(100 + prng() * 900)} ${Math.floor(1000 + prng() * 9000)}`
      },
      roomBed: roomInfo.roomBed,
      bedNumber: roomInfo.roomBed,
      roomCategory: roomInfo.category,
      roomType: roomInfo.category.replace(/_/g, ' '),
      dailyRoomRate: roomInfo.rate,
      dailyRoomAllowance: hmoConfig.allowance,
      admissionDate: `2026-09-${(20 + (i % 5)).toString().padStart(2, '0')}`,
      mghOrderTimestamp: '2026-09-25T09:45:00+08:00',
      attendingDoctor: doctor.name,
      doctorPan: doctor.pan,
      doctorAgreedFee,
      doctorExcessPf,
      doctorSignedAt: '2026-09-25T10:00:00+08:00',
      pharmacyRtsCleared,
      unreturnedMedsCount,
      stage,
      elapsedMinutes,
      elapsedMinutesInStage: elapsedMinutes,
      slaStatus,
      primaryDiagnosis: arch.description,
      primaryIcd10: arch.icd10,
      hmo: {
        providerName: hmoConfig.name,
        hmoName: hmoConfig.name,
        cardMasked: `${hmoConfig.codePrefix}-${Math.floor(1000 + prng() * 9000)}-****-${Math.floor(1000 + prng() * 9000)}`,
        loaNumber: `${hmoConfig.codePrefix}-APV-${Math.floor(100000 + prng() * 900000)}`,
        loaStatus: finalLoaStatus,
        policyMbl: hmoConfig.mblMin,
        mblRemaining: hmoConfig.mblMin - approvedAmount,
        dailyRoomAllowance: hmoConfig.allowance,
        initialLoaApproved: true,
        finalLoaStatus,
        approvedAmount,
        disallowedConsumables,
        turnaroundMinutes,
        adjusterName: 'Payer Coordinator',
        adjusterContact: `claims@${hmoConfig.name.toLowerCase().replace(/\s+/g, '')}.com.ph`
      },
      philhealth: {
        id: `claim-ph-${1000 + i}`,
        primaryIcd10: arch.icd10,
        primaryDescription: arch.description,
        diagnosisDescription: arch.description,
        caseRateCode: arch.caseRateCode,
        totalCaseRate: arch.totalCaseRate,
        hciAmount: arch.hciAmount,
        pfAmount: arch.pfAmount,
        isNbb: arch.isNbb,
        rthRiskScore,
        cf4VitalsRecorded: cf4Vitals,
        cf4CourseInWardRecorded: cf4Course,
        cf4LabsConsistent: cf4Labs,
        eSoaXmlConformity: eSoaConformity,
        status: phStatus,
        claimAgingDays,
        assignedAuditor: 'Grace Tan',
        deficiencyReason
      },
      items,
      chargemasterItems: items,
      waterfall,
      dischargePass,
      promissoryNote,
      disputes,
      timeline
    };

    encounters.push(enc);
  }

  return encounters;
}
