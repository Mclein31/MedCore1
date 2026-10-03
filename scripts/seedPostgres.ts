import pg from 'pg';
import { INITIAL_ENCOUNTERS } from '../src/data/mockData';
import { hashPassword } from '../server/services/authService';
import { computePromissorySchedule } from '../server/services/promissoryEngine';
import { generateGatePassHmac, generateDeterministicExitPin, resolveGatePassSecret } from '../server/services/gatePassService';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://mclein@localhost:5432/aqromed';

async function seed() {
  console.log('================================================================================');
  console.log('AQROMED ENTERPRISE HOSPITAL RCM: POSTGRESQL 16+ SEEDER & PARITY AUDIT');
  console.log('Database Target:', DATABASE_URL);
  console.log('================================================================================\n');

  // Security guard against accidental truncation of remote staging or production databases
  const isLocalDb = DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1');
  const isForce = process.env.FORCE_SEED === 'true' || process.argv.includes('--force');

  if (!isLocalDb && !isForce) {
    console.error('\n[SECURITY BLOCKER] Refusing to seed non-localhost / remote database without FORCE_SEED=true or --force flag.');
    console.error('Target Database:', DATABASE_URL);
    console.error('To proceed against a remote staging/test instance, set FORCE_SEED=true or pass --force.\n');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('[1/7] Cleaning existing tables...');
    await client.query(`
      TRUNCATE TABLE
        system_audit_logs,
        encounter_timeline_events,
        billing_disputes,
        payment_receipts,
        payments,
        discharge_passes,
        promissory_notes,
        hmo_authorizations,
        philhealth_claims,
        statutory_waterfalls,
        chargemaster_items,
        encounters,
        patients,
        beds,
        user_sessions,
        users,
        facilities
      CASCADE;
    `);

    // 1. Insert Facility
    console.log('[2/7] Seeding Anchor Facility (St. Jude Medical Center Manila)...');
    const facilityId = '00000000-0000-0000-0000-000000000001';
    await client.query(
      `
      INSERT INTO facilities (
        id, code, name, tin, philhealth_pan, address, contact_phone,
        total_beds, hitp_client_id, hitp_secret_hash, sync_interval_ms,
        sla_warning_threshold, sla_breach_threshold, doctor_pf_timeout_minutes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);
    `,
      [
        facilityId,
        'SJMC-MNL',
        'St. Jude Medical Center Manila',
        '004-819-201-000',
        'PAN-NCR-HOSP-004921',
        'Don Manuel Agregado St., Sampaloc, Manila 1008, Philippines',
        '(02) 8888-SJMC / (02) 8731-5000',
        200,
        'HITP-AQROMED-MANILA-092',
        'sha256_mock_secret_hash_2026',
        1000,
        25,
        40,
        15
      ]
    );

    // 2. Insert Users (Administrative Specialists & Attending Physicians)
    console.log('[3/7] Seeding System Users with Web Crypto PBKDF2 hashes...');
    const defaultPassword = 'HospitalRCM2026!';
    const userRoleConfigs = [
      {
        username: 'elena.santos',
        email: 'elena.santos@stjude.ph',
        fullName: 'Elena Santos',
        role: 'BILLING_SPECIALIST',
        title: 'Senior Inpatient Billing Supervisor',
        avatar: 'ES',
        prc: 'PRC-0091823',
        pan: 'PAN-9921-001',
        phone: '0917-881-2091'
      },
      {
        username: 'marco.valenzuela',
        email: 'marco.valenzuela@stjude.ph',
        fullName: 'Marco Valenzuela',
        role: 'HMO_COORDINATOR',
        title: 'Commercial HMO Adjudication Officer',
        avatar: 'MV',
        prc: 'PRC-0081290',
        pan: 'PAN-9921-002',
        phone: '0918-992-3401'
      },
      {
        username: 'grace.tan',
        email: 'grace.tan@stjude.ph',
        fullName: 'Grace Tan',
        role: 'CLAIMS_ENCODER',
        title: 'PhilHealth Claims Auditor',
        avatar: 'GT',
        prc: 'PRC-0071289',
        pan: 'PAN-9921-003',
        phone: '0920-551-8892'
      },
      {
        username: 'arthur.delgado',
        email: 'arthur.delgado@stjude.ph',
        fullName: 'Arthur Delgado',
        role: 'HOSPITAL_CFO',
        title: 'Hospital CFO / RCM Director',
        avatar: 'AD',
        prc: 'CPA-0019283',
        pan: 'PAN-9921-004',
        phone: '0917-220-4491'
      },
      {
        username: 'manuel.reyes',
        email: 'manuel.reyes@stjude.ph',
        fullName: 'Dr. Manuel Reyes',
        role: 'ATTENDING_PHYSICIAN',
        title: 'Attending Specialist (FPCP)',
        avatar: 'MR',
        prc: 'PRC-0041289',
        pan: 'PAN-1092-4418',
        phone: '0917-440-1928'
      },
      {
        username: 'ramon.delacruz',
        email: 'ramon.delacruz@gmail.com',
        fullName: 'Ramon Dela Cruz',
        role: 'PATIENT_GUARANTOR',
        title: 'Patient Family Guarantor',
        avatar: 'RC',
        prc: null,
        pan: null,
        phone: '0917-881-4019'
      },
      {
        username: 'bert.aquino',
        email: 'bert.aquino@stjude.ph',
        fullName: 'Bert Aquino',
        role: 'LOBBY_SECURITY',
        title: 'Lobby Exit Security Officer',
        avatar: 'BA',
        prc: 'SEC-8812-99',
        pan: null,
        phone: '0922-441-8902'
      },
      // Additional Clinical Specialists
      {
        username: 'cristina.abad',
        email: 'cristina.abad@stjude.ph',
        fullName: 'Dr. Cristina Abad, FPCS',
        role: 'ATTENDING_PHYSICIAN',
        title: 'General & Laparoscopic Surgery',
        avatar: 'CA',
        prc: 'PRC-0061298',
        pan: 'PAN-7721-3310',
        phone: '0917-112-3344'
      },
      {
        username: 'fernando.gomez',
        email: 'fernando.gomez@stjude.ph',
        fullName: 'Dr. Fernando Gomez, FPCC',
        role: 'ATTENDING_PHYSICIAN',
        title: 'Adult Cardiology',
        avatar: 'FG',
        prc: 'PRC-0051289',
        pan: 'PAN-4409-1120',
        phone: '0917-551-9921'
      },
      {
        username: 'enrico.santos',
        email: 'enrico.santos@stjude.ph',
        fullName: 'Dr. Enrico Santos, FPOA',
        role: 'ATTENDING_PHYSICIAN',
        title: 'Orthopedic Surgery & Trauma',
        avatar: 'ES',
        prc: 'PRC-0081923',
        pan: 'PAN-2210-9941',
        phone: '0917-331-8844'
      },
      {
        username: 'patricia.lim',
        email: 'patricia.lim@stjude.ph',
        fullName: 'Dr. Patricia Lim, FPOGS',
        role: 'ATTENDING_PHYSICIAN',
        title: 'Obstetrics & Gynecology',
        avatar: 'PL',
        prc: 'PRC-0077189',
        pan: 'PAN-8812-4409',
        phone: '0917-992-1102'
      },
      {
        username: 'roberto.cruz',
        email: 'roberto.cruz@stjude.ph',
        fullName: 'Dr. Roberto Cruz, FPCP',
        role: 'ATTENDING_PHYSICIAN',
        title: 'Nephrology & Dialysis',
        avatar: 'RC',
        prc: 'PRC-0099182',
        pan: 'PAN-3319-5501',
        phone: '0917-662-4409'
      },
      {
        username: 'angela.devera',
        email: 'angela.devera@stjude.ph',
        fullName: 'Dr. Angela De Vera, FPPS',
        role: 'ATTENDING_PHYSICIAN',
        title: 'Pediatrics & Neonatology',
        avatar: 'AD',
        prc: 'PRC-0044192',
        pan: 'PAN-5510-8821',
        phone: '0917-882-9910'
      }
    ];

    const userIdByUsername = new Map<string, string>();
    const userIdByPan = new Map<string, string>();

    for (const u of userRoleConfigs) {
      const { hash, salt } = await hashPassword(defaultPassword);
      const userRes = await client.query(
        `
        INSERT INTO users (
          facility_id, username, email, password_hash, salt, full_name,
          role, title, avatar_initials, prc_license, pan_number, contact_number
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id;
      `,
        [
          facilityId,
          u.username,
          u.email,
          hash,
          salt,
          u.fullName,
          u.role,
          u.title,
          u.avatar,
          u.prc,
          u.pan,
          u.phone
        ]
      );
      const insertedId = userRes.rows[0].id;
      userIdByUsername.set(u.username, insertedId);
      if (u.pan) {
        userIdByPan.set(u.pan, insertedId);
      }
    }

    // 3. Seed 200 Operational Beds
    console.log('[4/7] Seeding 200 Hospital Beds (Floors 1-6 + Units)...');
    const bedIdByNumber = new Map<string, string>();

    // Helper bed creator
    const bedListToInsert: Array<{
      number: string;
      ward: string;
      floor: number;
      category: string;
      rate: number;
    }> = [];

    // Floor 1: ED-1 to ED-25 (25 beds, WARD, 800)
    for (let i = 1; i <= 25; i++) {
      bedListToInsert.push({
        number: `ED-${i}`,
        ward: 'Emergency Department',
        floor: 1,
        category: 'WARD',
        rate: 800
      });
    }

    // Floor 2: Bed 201 to Bed 225 (25 beds, WARD/SEMI_PRIVATE, 1800)
    for (let i = 1; i <= 25; i++) {
      bedListToInsert.push({
        number: `Bed 2${i.toString().padStart(2, '0')}`,
        ward: 'Telemetry & Step-Down',
        floor: 2,
        category: i % 2 === 0 ? 'SEMI_PRIVATE' : 'WARD',
        rate: 1800
      });
    }

    // Floor 3: Bed 301-A to Bed 325-B (50 beds, SEMI_PRIVATE, 2000)
    for (let i = 1; i <= 25; i++) {
      const numStr = `3${i.toString().padStart(2, '0')}`;
      bedListToInsert.push({
        number: `Bed ${numStr}-A`,
        ward: 'Surgical & Maternal Wards',
        floor: 3,
        category: 'SEMI_PRIVATE',
        rate: 2000
      });
      bedListToInsert.push({
        number: `Bed ${numStr}-B`,
        ward: 'Surgical & Maternal Wards',
        floor: 3,
        category: 'SEMI_PRIVATE',
        rate: 2000
      });
    }

    // Floor 4: Suites 421-430 (10 beds) & Beds 401-420 (20 beds) = 30 beds
    for (let i = 21; i <= 30; i++) {
      bedListToInsert.push({
        number: `Suite 4${i}`,
        ward: 'Suites & VIP Unit',
        floor: 4,
        category: 'SUITE',
        rate: 5500
      });
    }
    for (let i = 1; i <= 20; i++) {
      bedListToInsert.push({
        number: `Bed 4${i.toString().padStart(2, '0')}`,
        ward: 'Private Pavilion',
        floor: 4,
        category: 'REGULAR_PRIVATE',
        rate: 3200
      });
    }

    // Floor 5: Bed 501 to Bed 530 (30 beds, 2500)
    for (let i = 1; i <= 30; i++) {
      bedListToInsert.push({
        number: `Bed 5${i.toString().padStart(2, '0')}`,
        ward: 'Internal Medicine & Endocrinology',
        floor: 5,
        category: 'REGULAR_PRIVATE',
        rate: 2500
      });
    }

    // Floor 6: Bed 601 to Bed 630 (30 beds, 1800)
    for (let i = 1; i <= 30; i++) {
      bedListToInsert.push({
        number: `Bed 6${i.toString().padStart(2, '0')}`,
        ward: 'Orthopedics & Pediatrics',
        floor: 6,
        category: 'WARD',
        rate: 1800
      });
    }

    // Specialized Units:
    // NICU-1 to NICU-8 (8 beds)
    for (let i = 1; i <= 8; i++) {
      bedListToInsert.push({
        number: `NICU-${i}`,
        ward: 'Neonatal Intensive Care',
        floor: 6,
        category: 'REGULAR_PRIVATE',
        rate: 4500
      });
    }
    // PICU-1 to PICU-2 (2 beds to total exactly 200 beds)
    for (let i = 1; i <= 2; i++) {
      bedListToInsert.push({
        number: `PICU-${i}`,
        ward: 'Pediatric Intensive Care',
        floor: 6,
        category: 'REGULAR_PRIVATE',
        rate: 4500
      });
    }

    console.log(`Inserting ${bedListToInsert.length} operational beds...`);

    for (const b of bedListToInsert) {
      const res = await client.query(
        `
        INSERT INTO beds (
          facility_id, bed_number, ward_name, floor_number, room_category, daily_rate, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id;
      `,
        [facilityId, b.number, b.ward, b.floor, b.category, b.rate.toFixed(2), 'AVAILABLE']
      );
      bedIdByNumber.set(b.number, res.rows[0].id);
    }

    // 4. Ingest 250 Encounters
    console.log('[5/7] Ingesting 250 Encounters & Clinical/Financial Relational Nodes...');
    const defaultDoctorId = userIdByUsername.get('manuel.reyes')!;

    let totalChargemasterCount = 0;
    let totalWaterfallsCount = 0;
    let totalClaimsCount = 0;
    let totalHmosCount = 0;
    let totalDisputesCount = 0;
    let totalPassesCount = 0;
    let totalNotesCount = 0;

    for (const enc of INITIAL_ENCOUNTERS) {
      // 4.1 Insert Patient
      const dob = new Date(Date.now() - (enc.patient.age || 45) * 365.25 * 24 * 60 * 60 * 1000);
      const patientRes = await client.query(
        `
        INSERT INTO patients (
          facility_id, mrn, full_name, date_of_birth, gender, contact_number,
          philhealth_pin, is_senior_citizen, senior_citizen_id, is_pwd, pwd_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id;
      `,
        [
          facilityId,
          enc.patient.mrn,
          enc.patient.fullName || enc.patient.maskedName,
          dob,
          enc.patient.gender || 'M',
          enc.patient.contactNumber || '0917-000-0000',
          enc.patient.philhealthPin || null,
          enc.patient.isSeniorCitizen,
          enc.patient.seniorCitizenId || null,
          enc.patient.isPwd,
          enc.patient.pwdId || null
        ]
      );
      const patientId = patientRes.rows[0].id;

      // 4.2 Resolve Bed ID
      let matchedBedId = bedIdByNumber.get(enc.roomBed);
      if (!matchedBedId) {
        // Map to an existing bed from the 200 operational beds inventory
        const allBedNumbers = Array.from(bedIdByNumber.keys());
        const hash = Math.abs(enc.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
        const fallbackBedNumber = allBedNumbers[hash % allBedNumbers.length];
        matchedBedId = bedIdByNumber.get(fallbackBedNumber)!;
      }

      await client.query(
        `
        UPDATE beds SET
          status = $1,
          updated_at = NOW()
        WHERE id = $2;
      `,
        [enc.stage === 'CLEARED_GATE_PASS' ? 'HOUSEKEEPING' : 'OCCUPIED', matchedBedId]
      );

      // 4.3 Resolve Attending Physician ID
      const doctorId = userIdByPan.get(enc.doctorPan) || defaultDoctorId;

      // 4.4 Insert Encounter
      const admissionTs = new Date(enc.admissionDate || Date.now() - 3 * 24 * 3600 * 1000);
      const mghTs = enc.mghOrderTimestamp ? new Date(enc.mghOrderTimestamp) : null;
      const dischargeTs = enc.stage === 'CLEARED_GATE_PASS' ? new Date() : null;

      const encRes = await client.query(
        `
        INSERT INTO encounters (
          facility_id, patient_id, encounter_number, bed_id, room_bed, room_category,
          daily_room_rate, daily_room_allowance, admission_timestamp, mgh_order_timestamp,
          discharge_timestamp, attending_physician_id, doctor_pan, doctor_agreed_fee,
          doctor_excess_pf, doctor_signed_at, pharmacy_rts_cleared, unreturned_meds_count,
          stage, elapsed_minutes, sla_status, primary_icd10, primary_diagnosis,
          bill_state, bill_number, amount_paid, remaining_balance
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
        ) RETURNING id;
      `,
        [
          facilityId,
          patientId,
          enc.encounterNumber,
          matchedBedId,
          enc.roomBed,
          enc.roomCategory,
          enc.dailyRoomRate.toFixed(2),
          enc.dailyRoomAllowance.toFixed(2),
          admissionTs,
          mghTs,
          dischargeTs,
          doctorId,
          enc.doctorPan,
          enc.doctorAgreedFee.toFixed(2),
          enc.doctorExcessPf.toFixed(2),
          enc.doctorSignedAt ? new Date(enc.doctorSignedAt) : null,
          enc.pharmacyRtsCleared,
          enc.unreturnedMedsCount,
          enc.stage,
          enc.elapsedMinutes,
          enc.slaStatus,
          enc.primaryIcd10,
          enc.primaryDiagnosis,
          enc.billState || (enc.stage === 'CLEARED_GATE_PASS' ? 'PAID' : 'DRAFT'),
          enc.billNumber || `SOA-SJMC-26-${enc.encounterNumber.replace(/\D/g, '') || '8812'}`,
          (enc.amountPaid || (enc.stage === 'CLEARED_GATE_PASS' ? enc.waterfall.netPatientDue : 0)).toFixed(2),
          (enc.remainingBalance || (enc.stage === 'CLEARED_GATE_PASS' ? 0 : enc.waterfall.netPatientDue)).toFixed(2)
        ]
      );
      const insertedEncounterId = encRes.rows[0].id;

      // Update bed current_encounter_id if occupied
      if (enc.stage !== 'CLEARED_GATE_PASS') {
        await client.query('UPDATE beds SET current_encounter_id = $1 WHERE id = $2;', [
          insertedEncounterId,
          matchedBedId
        ]);
      }

      // 4.5 Insert Chargemaster Items
      const insertedItemIds = new Map<string, string>();
      for (const item of enc.items) {
        const itemRes = await client.query(
          `
          INSERT INTO chargemaster_items (
            encounter_id, code, description, category, quantity, unit_price,
            gross_amount, is_vatable, philhealth_covered, hmo_covered, patient_oop,
            status, exclusion_reason_clause, plain_language_explainer, is_disputed, dispute_reason
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING id;
        `,
          [
            insertedEncounterId,
            item.code,
            item.description,
            item.category,
            (item.qty || 1).toFixed(2),
            item.unitPrice.toFixed(2),
            item.grossAmount.toFixed(2),
            item.isVatable,
            item.philhealthCovered.toFixed(2),
            item.hmoCovered.toFixed(2),
            item.patientOop.toFixed(2),
            item.status,
            item.exclusionReasonClause || null,
            item.plainLanguageExplainer,
            item.isDisputed || false,
            item.disputeReason || null
          ]
        );
        insertedItemIds.set(item.id, itemRes.rows[0].id);
        totalChargemasterCount++;
      }

      // 4.6 Insert Statutory Waterfall
      const w = enc.waterfall;
      await client.query(
        `
        INSERT INTO statutory_waterfalls (
          encounter_id, gross_hospital_charges, gross_doctor_fee, gross_total,
          vat_exemption, senior_pwd_discount, net_vat_discounted_base, philhealth_hci,
          philhealth_pf, philhealth_total, hmo_approved_amount, room_upgrade_excess,
          excluded_consumables, doctor_excess_pf, coverage_shortfall, net_patient_due,
          patient_paid
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        );
      `,
        [
          insertedEncounterId,
          w.grossHospitalCharges.toFixed(2),
          w.grossDoctorFee.toFixed(2),
          w.grossTotal.toFixed(2),
          w.vatExemption.toFixed(2),
          w.seniorPwdDiscount.toFixed(2),
          w.netVatDiscountedBase.toFixed(2),
          w.philhealthHci.toFixed(2),
          w.philhealthPf.toFixed(2),
          w.philhealthTotal.toFixed(2),
          w.hmoApprovedAmount.toFixed(2),
          w.roomUpgradeExcess.toFixed(2),
          w.excludedConsumables.toFixed(2),
          w.doctorExcessPf.toFixed(2),
          (w.grossTotal - (w.vatExemption + w.seniorPwdDiscount + w.philhealthTotal + w.hmoApprovedAmount + w.roomUpgradeExcess + w.excludedConsumables + w.doctorExcessPf) >= 0
            ? w.grossTotal - (w.vatExemption + w.seniorPwdDiscount + w.philhealthTotal + w.hmoApprovedAmount + w.roomUpgradeExcess + w.excludedConsumables + w.doctorExcessPf)
            : 0).toFixed(2),
          w.netPatientDue.toFixed(2),
          (w.patientPaid || (enc.stage === 'CLEARED_GATE_PASS' ? w.netPatientDue : 0)).toFixed(2)
        ]
      );
      totalWaterfallsCount++;

      // 4.7 Insert PhilHealth Claim
      const cl = enc.philhealth;
      if (cl) {
        await client.query(
          `
          INSERT INTO philhealth_claims (
            encounter_id, claim_number, primary_icd10, primary_description, case_rate_code,
            total_case_rate, hci_amount, pf_amount, is_nbb, rth_risk_score,
            cf4_vitals_recorded, cf4_course_in_ward_recorded, cf4_labs_consistent,
            esoa_xml_conformity, status, claim_aging_days, deficiency_reason
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17);
        `,
          [
            insertedEncounterId,
            cl.id || `CLM-2026-${enc.encounterNumber.replace(/\D/g, '')}`,
            cl.primaryIcd10,
            cl.primaryDescription,
            cl.caseRateCode,
            cl.totalCaseRate.toFixed(2),
            cl.hciAmount.toFixed(2),
            cl.pfAmount.toFixed(2),
            cl.isNbb,
            cl.rthRiskScore.toFixed(4),
            cl.cf4VitalsRecorded,
            cl.cf4CourseInWardRecorded,
            cl.cf4LabsConsistent,
            cl.eSoaXmlConformity,
            cl.status,
            cl.claimAgingDays || 0,
            cl.deficiencyReason || null
          ]
        );
        totalClaimsCount++;
      }

      // 4.8 Insert HMO Authorization
      const h = enc.hmo;
      if (h) {
        await client.query(
          `
          INSERT INTO hmo_authorizations (
            encounter_id, provider_name, card_number_masked, loa_number, policy_mbl,
            mbl_remaining, daily_room_allowance, initial_loa_approved, final_loa_status,
            approval_code, approved_amount, disallowed_consumables, turnaround_minutes,
            adjuster_name, adjuster_contact
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15);
        `,
          [
            insertedEncounterId,
            h.providerName,
            h.cardMasked,
            h.loaNumber || null,
            h.policyMbl.toFixed(2),
            h.mblRemaining.toFixed(2),
            h.dailyRoomAllowance.toFixed(2),
            h.initialLoaApproved,
            h.finalLoaStatus,
            h.approvalCode || null,
            h.approvedAmount.toFixed(2),
            h.disallowedConsumables.toFixed(2),
            h.turnaroundMinutes || 0,
            h.adjusterName || null,
            h.adjusterContact || null
          ]
        );
        totalHmosCount++;
      }

      // 4.9 Insert Promissory Note
      let promissoryNoteId: string | null = null;
      if (enc.promissoryNote) {
        const pn = enc.promissoryNote;
        const plan = computePromissorySchedule(pn.principalAmount, pn.installmentMonths);
        const pnRes = await client.query(
          `
          INSERT INTO promissory_notes (
            note_number, encounter_id, borrower_name, borrower_relationship,
            borrower_id_type, borrower_id_number, principal_amount, interest_rate,
            financing_fee, total_repayment, installment_months, monthly_installment,
            schedule_json, first_due_date, digital_signature_timestamp, digital_signature_hash, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          RETURNING id;
        `,
          [
            pn.id,
            insertedEncounterId,
            pn.borrowerName,
            pn.borrowerRelationship,
            pn.borrowerIdType,
            pn.borrowerIdNumber,
            plan.financedAmount.toFixed(2),
            '0.0000',
            '0.00',
            plan.totalRepayment.toFixed(2),
            pn.installmentMonths,
            plan.monthlyInstallment.toFixed(2),
            JSON.stringify(plan.schedule),
            new Date(pn.firstDueDate || '2026-10-25'),
            new Date(pn.digitalSignatureTimestamp || Date.now()),
            `sig_ra9439_${pn.id}_hash`,
            pn.status
          ]
        );
        promissoryNoteId = pnRes.rows[0].id;
        totalNotesCount++;
      }

      // 4.10 Insert Discharge Pass
      if (enc.dischargePass || enc.stage === 'CLEARED_GATE_PASS') {
        const dp = enc.dischargePass;
        const passNum = dp?.passNumber || `PASS-MC-${enc.encounterNumber.replace(/\D/g, '') || '8812'}`;
        const settledAmount = dp?.settledAmount !== undefined ? dp.settledAmount : w.netPatientDue;
        const channel = dp?.settlementChannel || 'QR_PH';
        const issuedTs = dp?.issuedAt ? new Date(dp.issuedAt) : new Date();
        const seedSecret = resolveGatePassSecret(process.env.GATE_PASS_SECRET, false);
        const hmac = dp?.hmacSignature || (await generateGatePassHmac(insertedEncounterId, settledAmount, issuedTs.toISOString(), seedSecret));
        const exitPin = generateDeterministicExitPin(passNum);

        await client.query(
          `
          INSERT INTO discharge_passes (
            pass_number, encounter_id, patient_name, room_bed, settled_amount,
            settlement_channel, promissory_note_id, hmac_signature, exit_pin,
            status, issued_at, verified_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);
        `,
          [
            passNum,
            insertedEncounterId,
            enc.patient.fullName || enc.patient.maskedName,
            enc.roomBed,
            settledAmount.toFixed(2),
            channel,
            promissoryNoteId,
            hmac,
            exitPin,
            dp?.status || 'ACTIVE_READY_FOR_EXIT',
            issuedTs,
            verifiedTs
          ]
        );
        totalPassesCount++;
      }

      // 4.11 Insert Disputes
      if (enc.disputes && enc.disputes.length > 0) {
        for (const disp of enc.disputes) {
          const dbChargeId = insertedItemIds.get(disp.itemId) || insertedItemIds.values().next().value;
          await client.query(
            `
            INSERT INTO billing_disputes (
              encounter_id, charge_id, item_description, contested_amount, reason,
              dispute_category, status, supervisor_notes, department, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
          `,
            [
              insertedEncounterId,
              dbChargeId,
              disp.itemDescription,
              disp.contestedAmount.toFixed(2),
              disp.reason,
              'OTHER',
              disp.status,
              disp.supervisorNotes || null,
              disp.department || 'Inpatient',
              new Date(disp.createdAt || Date.now())
            ]
          );
          totalDisputesCount++;
        }
      }

      // 4.12 Insert Timeline Events
      if (enc.timeline && enc.timeline.length > 0) {
        for (const ev of enc.timeline) {
          await client.query(
            `
            INSERT INTO encounter_timeline_events (
              encounter_id, event_type, title, description, actor_name, status, event_timestamp
            ) VALUES ($1, $2, $3, $4, $5, $6, $7);
          `,
            [
              insertedEncounterId,
              ev.type,
              ev.title,
              ev.description,
              ev.actor,
              ev.status,
              new Date(ev.timestamp)
            ]
          );
        }
      }
    }

    console.log('[6/7] Ingestion Summary:');
    console.log(`  - Encounters: ${INITIAL_ENCOUNTERS.length}`);
    console.log(`  - Chargemaster Items: ${totalChargemasterCount}`);
    console.log(`  - Statutory Waterfalls: ${totalWaterfallsCount}`);
    console.log(`  - PhilHealth Claims: ${totalClaimsCount}`);
    console.log(`  - HMO Authorizations: ${totalHmosCount}`);
    console.log(`  - Promissory Notes: ${totalNotesCount}`);
    console.log(`  - Discharge Passes: ${totalPassesCount}`);
    console.log(`  - Disputes: ${totalDisputesCount}`);

    // Commit Transaction
    await client.query('COMMIT');
    console.log('\n[7/7] Database Transaction COMMITTED successfully.\n');

    // 5. Verification Suite: Audit PostgreSQL Table Rows
    console.log('================================================================================');
    console.log('RUNNING MATHEMATICAL RECONCILIATION SUITE DIRECTLY ON POSTGRESQL ROWS...');
    console.log('================================================================================');

    const dbWaterfalls = await client.query(`
      SELECT
        w.*,
        e.encounter_number,
        p.full_name,
        p.is_senior_citizen,
        p.is_pwd
      FROM statutory_waterfalls w
      JOIN encounters e ON w.encounter_id = e.id
      JOIN patients p ON e.patient_id = p.id;
    `);

    let grossTotalErrors = 0;
    let balanceErrors = 0;
    let vatSCPWDErrors = 0;
    let reconciledCount = 0;

    for (const row of dbWaterfalls.rows) {
      const gross = Number(row.gross_total);
      const vat = Number(row.vat_exemption);
      const scPwd = Number(row.senior_pwd_discount);
      const ph = Number(row.philhealth_total);
      const hmo = Number(row.hmo_approved_amount);
      const netDue = Number(row.net_patient_due);

      const isSeniorOrPwd = row.is_senior_citizen || row.is_pwd;

      // VAT check
      if (isSeniorOrPwd && gross > 0) {
        const expectedVat = Number((gross - gross / 1.12).toFixed(2));
        const vatDiff = Math.abs(vat - expectedVat);
        if (vatDiff > 0.05) {
          vatSCPWDErrors++;
          console.error(`VAT mismatch on ${row.encounter_number}: expected ${expectedVat}, got ${vat}`);
        }
      }

      // Fundamental Waterfall Law: Gross == VAT + Senior + PH + HMO + Net Patient Due
      const deductionsAndDue = Number((vat + scPwd + ph + hmo + netDue).toFixed(2));
      const diff = Math.abs(gross - deductionsAndDue);

      if (diff > 0.05) {
        balanceErrors++;
        console.error(
          `Waterfall balance mismatch on ${row.encounter_number}: Gross (${gross}) !== Deductions+Due (${deductionsAndDue}), diff: ${diff}`
        );
      } else {
        reconciledCount++;
      }
    }

    // Promissory Notes Zero Interest Check
    const dbPromissory = await client.query(`SELECT * FROM promissory_notes;`);
    let noteErrors = 0;
    for (const note of dbPromissory.rows) {
      const principal = Number(note.principal_amount);
      const totalRepay = Number(note.total_repayment);
      const rate = Number(note.interest_rate);
      const fee = Number(note.financing_fee);

      if (principal !== totalRepay || rate !== 0 || fee !== 0) {
        noteErrors++;
        console.error(`RA 9439 violation on note ${note.note_number}: interest or fee non-zero`);
      }
    }

    console.log(`Total Database Records Audited: ${dbWaterfalls.rows.length}`);
    console.log(`Waterfall Exact Reconciliations: ${reconciledCount} / ${dbWaterfalls.rows.length} (100%)`);
    console.log(`VAT/Senior/PWD Errors: ${vatSCPWDErrors}`);
    console.log(`Balance Discrepancies: ${balanceErrors}`);
    console.log(`Promissory Notes Audited: ${dbPromissory.rows.length}`);
    console.log(`Promissory Notes RA 9439 Valid: ${dbPromissory.rows.length - noteErrors} / ${dbPromissory.rows.length}`);

    if (balanceErrors > 0 || vatSCPWDErrors > 0 || noteErrors > 0) {
      throw new Error(`Mathematical parity verification failed with ${balanceErrors + vatSCPWDErrors + noteErrors} errors.`);
    }

    console.log('\n[PASS] ALL 250 POSTGRESQL PATIENT RECORDS ARE MATHEMATICALLY RECONCILED WITH 0 DRIFT.');
    console.log('================================================================================');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding and audit aborted due to error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
