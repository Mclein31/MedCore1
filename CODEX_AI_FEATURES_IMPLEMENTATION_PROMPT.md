# CODEX DIRECTIVE: ARCHITECTURE & IMPLEMENTATION OF MEDCORE MULTI-AGENT AI SUITE (DASHBOARD + MOBILE + SERVER)

> **Target Agent**: Autonomous Full-Stack Software Engineer / OpenAI Codex / Antigravity Agent  
> **Target Project**: MedCore / AQROMED (`/Users/mclein/Documents/Developer/Personal_Projects/MedCore1`)  
> **Target Applications**: Staff Dashboard (`apps/dashboard`), Patient Mobile App (`apps/mobile`), Core Backend API (`apps/server`)  
> **Document Role**: Authoritative Technical Specification & Execution Prompt  
> **Security & Compliance Baseline**: Republic Act No. 10173 (Philippine Data Privacy Act of 2012), RA 9439 (Anti-Hospital Detention Law), PhilHealth Circulars 2019-0002 & 2023-0026  

---

## 1. EXECUTIVE MISSION & ARCHITECTURAL OVERVIEW

You are tasked with engineering, integrating, and verifying the end-to-end **MedCore Multi-Agent Artificial Intelligence Suite** across the backend API, the hospital staff web dashboard, and the patient mobile application.

MedCore is the dedicated Financial Intelligence and Multi-Payer Reconciliation Middleware sitting between hospital legacy systems (HIS/EMR), state/commercial payers (PhilHealth, private HMOs), and patients.

The AI suite empowers both hospital billing personnel and admitted patients by introducing specialized intelligence modules:
1. **"Cora" — Multilingual Patient Billing & Discharge Concierge** on the Patient Mobile App (`apps/mobile`): Provides plain-language explanations ("Why Do I Owe This?"), tracks active discharge milestones, explains statutory patient rights under RA 9439, guides zero-interest promissory notes, and drafts line-item billing disputes.
2. **Clinical Claims Forensic Pre-Flight Scrubber & PhilHealth RTH Predictor** on the Staff Dashboard (`apps/dashboard`): Ingests Claim Form 4 (CF4) clinical narratives, ICD-10 diagnostic codes, RVS surgical procedure codes, and machine-readable eSOA XML to compute a Return-to-Hospital (RTH) predictive risk score (0.00 to 1.00) and generate proactive clinical remediation recommendations.
3. **Automated HMO Medical Necessity Appeal & Dispute Letter Drafter** on the Staff Dashboard (`apps/dashboard`): Formulates formal, legally grounded medical necessity appeal letters for denied inpatient medical sundries (PPE, surgical consumables, restricted antibiotics) and room-tier upgrade differentials.
4. **Executive RCM Telemetry & Bottleneck Briefing Generator** on the Staff Dashboard (`apps/dashboard`): Synthesizes discharge queue velocity, stage dwell times, Days in Accounts Receivable (DAR), and bed turnover metrics into actionable daily briefings for hospital leadership.
5. **Multimodal Government ID & Benefit Card Scanner** across Mobile and Dashboard: Extracts PhilHealth PINs, Senior Citizen OSCA IDs, PWD IDs, and HMO member numbers directly from physical photo uploads.

---

## 2. NON-NEGOTIABLE ARCHITECTURAL INVARIANTS & CONSTRAINTS

Before writing any code, internalize and strictly enforce these architectural laws:

### 2.1 The Golden Invariant: Absolute Separation of Math vs. Generative AI
- **Generative AI NEVER calculates financial balances, discounts, or mutates ledger amounts.**
- All Philippine statutory financial mathematics—encompassing the 12% VAT exemption, 20% Senior Citizen and PWD discounts (RA 9994/RA 10754), PhilHealth All Case Rates (ACR) case-rate splits (Circular 2019-0002), private HMO benefit deductions, and 0% interest promissory note installment schedules (RA 9439)—are strictly executed by the local, deterministic rule engines:
  - `apps/server/src/services/statutoryWaterfall.ts`
  - `apps/server/src/services/promissoryEngine.ts`
- **Zero Centavo Drift**: Financial ledgers must balance to the exact centavo (`Math.round(val * 100)`). Tolerating drift > ₱0.00 is strictly prohibited.
- When an AI agent explains a bill (e.g., Cora), it receives pre-calculated, deterministic numbers from the server snapshot and is strictly instructed to explain those exact figures without inventing or recalculating balances.

### 2.2 Data Privacy Act of 2012 (RA 10173) Compliance: Zero PHI Leakage
- Cloud LLMs must **NEVER** receive unmasked Protected Health Information (PHI).
- All AI queries must pass through a dedicated backend proxy service (`apps/server/src/services/ai/phiScrubber.ts`) that executes bidirectional deterministic pseudonymization:
  - Patient Full Name $\rightarrow$ `[PATIENT_PSEUDONYM_A]`
  - Medical Record Number (MRN) $\rightarrow$ `[MRN_MASKED_X]`
  - PhilHealth Identification Number (PIN) $\rightarrow$ `[PHILHEALTH_PIN_MASKED]`
  - Attending Physician Name & PAN $\rightarrow$ `[PHYSICIAN_A]`
  - Room & Bed Number $\rightarrow$ `[ROOM_MASKED]`
  - Contact Numbers & Addresses $\rightarrow$ `[PHONE_MASKED]`, `[ADDRESS_MASKED]`
- The token-to-identity map is retained in transient, in-memory server session context and is scrubbed immediately after response synthesis. Unmasked PHI is never logged or cached externally.

### 2.3 Resilient Offline Fallback & Test Continuity
- If `GEMINI_API_KEY` is missing or when running in test mode (`NODE_ENV === 'test'`), the system must gracefully fall back to local rule-based mock responses with zero unhandled exceptions.
- Existing verification suites (`npm run test:api`, `npm run test:financial`, `npm --prefix apps/mobile run test`) must continue to pass 100% without breakage.

---

## 3. MODEL SELECTION MATRIX & SPECIFICATIONS

Every AI module in MedCore is mapped to a designated model based on reasoning capability, latency profile, context window, multilingual fidelity, and cost efficiency:

| Module / Feature | Target Surface | Primary Model | Fallback Model | Modality | Key Parameters |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cora Concierge Chatbot** | Patient Mobile App (`apps/mobile`) | **Google Gemini 2.5 Flash** (`gemini-2.5-flash`) | Gemini 1.5 Flash (`gemini-1.5-flash-latest`) | Text / Streaming | Temp: `0.3`<br>Top-P: `0.8`<br>Max Tokens: `1024` |
| **Cora Voice Input** | Patient Mobile App (`apps/mobile`) | **OpenAI Whisper Large v3 Turbo** (`@cf/openai/whisper-large-v3-turbo` or OpenAI API) | Native Device Speech-to-Text | Audio $\rightarrow$ Text | Language: `tl`, `en`, `auto` |
| **Clinical Claims Forensic Scrubber** | Staff Dashboard (`apps/dashboard`) | **Google Gemini 2.5 Flash** (Structured Output) | **Google Gemini 1.5 Pro** (`gemini-1.5-pro-latest`) | Text $\rightarrow$ Structured JSON | Temp: `0.1`<br>Response Schema: `Zod / JSON Schema` |
| **HMO Appeal Letter Drafter** | Staff Dashboard (`apps/dashboard`) | **Google Gemini 2.5 Flash** | **Google Gemini 1.5 Pro** | Text $\rightarrow$ Markdown / Text | Temp: `0.2`<br>Top-P: `0.9`<br>Max Tokens: `2048` |
| **Executive RCM Briefing** | Staff Dashboard (`apps/dashboard`) | **Google Gemini 2.5 Flash** | Gemini 1.5 Flash | Text $\rightarrow$ Markdown / JSON | Temp: `0.2`<br>Max Tokens: `1024` |
| **Government ID & Card OCR** | Mobile & Dashboard Intake | **Google Gemini 2.5 Flash Multimodal** | Local OCR / Form Fallback | Image $\rightarrow$ Structured JSON | Temp: `0.1`<br>Response Schema: `Zod` |

### Detailed Model Rationale

1. **Google Gemini 2.5 Flash (`gemini-2.5-flash`)**:
   - **Primary Engine**: Powers Cora, Claims Scrubbing, HMO Appeals, and Executive Briefings.
   - **Why**: Features sub-second Time to First Token (TTFT < 800ms), 1-million-token context window, excellent native comprehension of Philippine languages (Tagalog, Taglish, Ilocano) and medical terminology, native JSON schema enforcement, and zero upfront licensing expenditure via Google AI Studio.
2. **Google Gemini 1.5 Pro (`gemini-1.5-pro-latest`)**:
   - **Deep Forensic Escalation**: Used for complex multi-page CF4 clinical chart audits where patients have extensive multi-week ICU courses, complex operative notes, and discordant multi-payer diagnoses requiring deep multi-hop clinical reasoning.
3. **OpenAI Whisper Large v3 Turbo**:
   - **Voice Engine**: Ingests spoken Taglish voice memos from elderly patients or stressed family caregivers and converts them to clean text for Cora processing. Supported natively via Cloudflare Workers AI bindings or standard REST endpoint.

---

## 4. DETAILED IMPLEMENTATION ROADMAP

---

### PART 1: BACKEND AI INFRASTRUCTURE (`apps/server`)

#### 1.1 Environment & Configuration
1. Update `.env.example` and read configuration from environment:
   ```env
   # Google Gemini AI Configuration
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-2.5-flash
   GEMINI_PRO_MODEL=gemini-1.5-pro-latest
   
   # Cloudflare Workers AI / Whisper (Optional for Voice)
   CLOUDFLARE_ACCOUNT_ID=
   CLOUDFLARE_API_TOKEN=
   ```
2. Create `apps/server/src/config/aiConfig.ts`:
   - Export typed configuration object reading `process.env`.
   - Provide a helper `isAiEnabled(): boolean` checking for `GEMINI_API_KEY`.

#### 1.2 PHI De-Identification & Re-Hydration Service
Create `apps/server/src/services/ai/phiScrubber.ts`:
- **Interface**:
  ```typescript
  export interface ScrubbedPayload {
    scrubbedText: string;
    tokenMap: Map<string, string>; // e.g. '[PATIENT_NAME_1]' -> 'Juan S. Dela Cruz'
  }
  ```
- **Capabilities**:
  - `scrubPatientData(raw: string, patientContext: { fullName: string; mrn: string; philhealthId?: string; contactNumber?: string; roomBed?: string }): ScrubbedPayload`
  - Replaces all occurrences of the patient's full name, first name, last name, MRN, phone number, and PhilHealth ID with token placeholders: `[PATIENT_PSEUDONYM]`, `[MRN_MASKED]`, `[PHILHEALTH_ID_MASKED]`, `[ROOM_MASKED]`.
  - Also executes standard regex scrubbing for Philippine phone numbers (`/(\+?63|0)9\d{9}/g` $\rightarrow$ `[PHONE_MASKED]`) and PhilHealth PIN formats (`/\d{2}-\d{9}-\d{1}/g` $\rightarrow$ `[PHILHEALTH_PIN_MASKED]`).
  - `rehydrateText(scrubbedResponse: string, tokenMap: Map<string, string>): string`: Replaces tokens back with user-facing identifiers before returning the payload to the authenticated client.

#### 1.3 Gemini Client SDK & Resilient Provider
Create `apps/server/src/services/ai/geminiClient.ts`:
- Use direct Google AI Studio REST endpoints (`https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}`) or `@google/genai` library via native Node `fetch`.
- Implement automatic exponential backoff retry (up to 3 retries on HTTP 429 / 503).
- Implement mock provider fallback when `!isAiEnabled()`:
  - If `geminiApiKey` is not configured, return deterministic, pre-structured mock responses for all features so development and testing proceed without external API dependencies.
- Support both plain text generation and structured JSON generation (via `generationConfig.responseMimeType: "application/json"`).

#### 1.4 Feature 1 Service: Cora Concierge Service
Create `apps/server/src/services/ai/coraService.ts`:
- **Input Context**:
  - `patientId`: String
  - `encounterId`: String
  - `userMessage`: String
  - `language`: `'en'` | `'fil'` (Taglish) | `'ilo'` (Ilocano)
  - `mode`: `'GENERAL'` | `'WHY_DO_I_OWE'` | `'DISCHARGE_STATUS'` | `'PROMISSORY_ASSISTANCE'` | `'DISPUTE_DRAFT'`
- **Context Injection**:
  - Fetch encounter record from `apps/server/src/routes/patient.ts` logic (`encounters`, `waterfall`, `dischargeChecklist`, `promissoryNote`).
  - Pass deterministic numbers into the prompt:
    ```
    Gross Total: ₱{waterfall.grossTotal}
    VAT Exemption (12%): ₱{waterfall.vatExemption}
    Senior/PWD Discount (20%): ₱{waterfall.seniorPwdDiscount}
    PhilHealth Coverage: ₱{waterfall.philhealthTotal}
    HMO Approved Amount: ₱{waterfall.hmoApprovedAmount}
    Net Patient Responsibility: ₱{waterfall.netPatientDue}
    Remaining Balance to Pay: ₱{remainingBalance}
    Current Discharge Stage: {encounter.stage}
    Checklist Pending Items: {pendingSteps}
    ```
- **System Instructions**:
  - "You are Cora, the compassionate, transparent, and legally precise Patient Billing Concierge for MedCore hospital middleware."
  - "Rule 1: NEVER calculate or adjust any financial amounts. All balances provided to you are mathematically certified by the hospital billing system. Use only the exact figures provided."
  - "Rule 2: Speak in a warm, comforting, highly professional tone in the requested language (English, Taglish, or Ilocano). Explain medical itemizations using simple everyday analogies."
  - "Rule 3: If explaining discharge delays, clearly explain that hospital billing must finalize doctor professional fee signatures and HMO approvals before the gate pass can be released, protecting the patient from unexpected future bills."
  - "Rule 4: If the patient expresses financial distress, inform them of their legal rights under Republic Act No. 9439 (Anti-Hospital Detention Law): non-private ward patients cannot be detained for non-payment and have the legal right to sign a 0% interest digital promissory note with flexible installments (3, 6, or 12 months)."
  - "Rule 5: If the user wishes to dispute an item, ask what item looks incorrect and generate a structured JSON ticket for the billing supervisor."

#### 1.5 Feature 2 Service: Claims Forensic Scrubber Service
Create `apps/server/src/services/ai/claimsForensicService.ts`:
- **Input Context**:
  - `encounterId`: String
  - Raw CF4 unstructured fields (chief complaint, physical examination, daily course in ward, doctor's notes, medication administration record).
  - eSOA XML payload (generated from `apps/server/src/services/xmlGenerator.ts`).
  - Primary & secondary ICD-10 codes, RVS surgical procedure codes.
- **Model Call**:
  - Target Model: `gemini-2.5-flash` (or `gemini-1.5-pro` if chart text > 30,000 characters).
  - Enforce Structured JSON Output conforming to this schema:
    ```typescript
    export interface ClaimsAuditResult {
      rthRiskScore: number; // 0.00 to 1.00
      riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
      passThreshold: boolean; // true if score <= 0.15
      flags: Array<{
        category: 'DIAGNOSTIC_DISCREPANCY' | 'MISSING_CF4_FIELD' | 'MEDICATION_DISCORDANCE' | 'SPC_RULE_RISK';
        severity: 'CRITICAL' | 'WARNING' | 'INFO';
        field: string;
        description: string;
        remediation: string;
      }>;
      clinicalSummary: string;
      suggestedDoctorAddendum: string | null;
      cleanClaimReadiness: number; // 0 to 100 percentage
    }
    ```
- **Key Forensic Rules Checked**:
  - **PhilHealth Circular 2019-0002**: Mandatory clinical justification for primary and secondary All Case Rates.
  - **Medication vs. Diagnosis Match**: If IV Ceftriaxone or Meropenem is billed, is there a substantiated infectious diagnosis and fever/WBC elevation documented in the ward course?
  - **Single Period of Confinement (SPC) Check**: Flag if patient was readmitted within 90 days for the same condition, citing PhilHealth Circular No. 2024-0021 (Abolition of SPC) and providing refiling guidance under Circular No. 2025-0015.

#### 1.6 Feature 3 Service: HMO Appeal Letter Drafter Service
Create `apps/server/src/services/ai/hmoAppealService.ts`:
- **Input Context**:
  - `encounterId`: String
  - `disputeId` / `deniedItemDescription`: String (e.g. "PPE & Sterile Packs (₱4,500)", "Restricted Antibiotic - Meropenem 1g (₱8,200)", or "Room Upgrade Differential (₱3,000)")
  - `hmoProviderName`: String (e.g. "Maxicare Healthcare", "Intellicare / Asalus", "Medicard Philippines")
  - `attendingPhysician`: String & PRC / PAN ID
  - Inpatient clinical chart excerpt (operative notes, infection control protocols, emergency admission orders)
- **Prompt Directive**:
  - Draft a formal, authoritative, professional Medico-Legal Reconsideration & Medical Necessity Appeal Letter addressed to the HMO Medical Director.
  - Structure:
    1. Official Hospital Letterhead & Reference Header (Encounter ID, LOA Authorization No., Member Policy No.).
    2. Formal Statement of Dispute against the disallowance.
    3. Clinical & Evidentiary Justification: Correlate the specific consumable or upgraded accommodation with clinical necessity (e.g., CDC / DOH infection control guidelines requiring surgical barrier drapes; emergency non-availability of standard ward beds necessitating temporary intermediate care without penalty).
    4. Regulatory & Contractual References: Cite Philippine Insurance Commission regulations regarding timely claims adjudication and fair consumer treatment (RA 11765).
    5. Actionable Demand: Request immediate reinstatement of coverage within 48 hours to avoid patient out-of-pocket cost shifting.
    6. Attending Physician & Medical Director Signature Block.

#### 1.7 Feature 4 Service: Executive RCM Telemetry Briefing Service
Create `apps/server/src/services/ai/executiveBriefingService.ts`:
- **Input Data Aggregation**:
  - Queries active encounters, average dwell times per discharge stage:
    - Stage 1: `DOCTOR_PF_PENDING` $\rightarrow$ average delay in minutes.
    - Stage 2: `PHARMACY_CLEARANCE` $\rightarrow$ average delay.
    - Stage 3: `HMO_APPROVAL` $\rightarrow$ average delay.
    - Stage 4: `BILLING_FINALIZATION` $\rightarrow$ average delay.
    - Stage 5: `PENDING_SETTLEMENT` / Cashier.
  - Days in Accounts Receivable (DAR) across PhilHealth and top 5 HMOs.
  - Bed turnover velocity and estimated bed-hours lost to discharge clearance bottlenecks.
- **Output**:
  - Executive 3-minute morning briefing formatted in clear markdown cards:
    - **Key Bottlenecks**: Highlights the specific department causing the largest lag (e.g., "Inpatient Pharmacy RTS verification averaging 142 mins across 6 patients").
    - **Financial Risk Alerts**: Outstanding high-balance HMO LOAs awaiting final claim codes.
    - **Reclaimed Bed-Hours**: Quantifies bed availability gained through digital discharge passes.
    - **Top 3 Recommended Actions for Hospital Leadership**.

#### 1.8 API Route Mounts (`apps/server/src/routes/ai.ts`)
Create `apps/server/src/routes/ai.ts` and mount in `apps/server/src/index.ts`:
```typescript
app.route('/api/v1/ai', aiRoutes);
```
**Endpoints**:
1. `POST /api/v1/ai/cora/chat`: Authenticated patient or demo user. Takes `{ message, language?, mode?, encounterId? }`, executes PHI scrubbing, calls Gemini 2.5 Flash, re-hydrates tokens, returns `{ reply, mode, suggestedActions }`.
2. `POST /api/v1/ai/claims/preflight-scrub`: Authenticated staff user. Takes `{ encounterId }`, compiles clinical and eSOA records, calls Gemini 2.5 Flash with structured output, returns `ClaimsAuditResult`.
3. `POST /api/v1/ai/hmo/generate-appeal`: Authenticated staff user. Takes `{ encounterId, deniedItem, hmoId, justificationNotes? }`, returns `{ appealLetterMarkdown, referenceNumber }`.
4. `POST /api/v1/ai/executive/briefing`: Authenticated staff / executive user. Returns `{ briefingMarkdown, generatedAt, metricsSummary }`.
5. `POST /api/v1/ai/ocr/extract-card`: Accepts image data (Base64) and card category (`'GOVERNMENT_ID'` | `'HMO_CARD'`), calls Gemini 2.5 Flash Multimodal, returns parsed structured fields (`idType`, `idNumber`, `memberFullName`, `validUntil`, `providerName`).

---

### PART 2: PATIENT MOBILE APP AI INTEGRATION (`apps/mobile`)

#### 2.1 Mobile AI API Client
Create `apps/mobile/src/services/aiApi.ts`:
- Implements:
  - `sendCoraMessage(message: string, language: string, mode?: string, encounterId?: string): Promise<{ reply: string; suggestedActions?: string[] }>`
  - `scanBenefitCard(imageBase64: string, cardType: string): Promise<ScannedCardData>`
- Inherits existing authentication tokens and patient scoping headers (`X-Medcore-Patient-Id`) from `apps/mobile/src/lib/auth.tsx`.

#### 2.2 Cora Concierge UI Components
1. **Create `apps/mobile/src/components/CoraAssistantModal.tsx`**:
   - A dedicated bottom-sheet / full-screen conversational modal.
   - **Header**:
     - Cora avatar with pulse indicator.
     - Title: "Cora — Hospital Concierge".
     - Language Selector Pill: `English` | `Taglish` | `Ilokano`.
     - Close button.
   - **Body**:
     - Chat bubble stream with smooth scrolling.
     - Distinguishes user messages (brand teal) from Cora responses (paper surface with soft shadow).
     - Renders formatted markdown (bullet points, bold amounts).
   - **Quick Action Pills**:
     - "Why do I owe this amount?"
     - "Where is my discharge clearance at?"
     - "How do I apply for a 0% promissory note?"
     - "I want to dispute a hospital charge."
   - **Input Bar**:
     - Text input field with clean submit button.
     - Microphone icon triggering voice query recording.

2. **Create `apps/mobile/src/components/CoraFloatingPill.tsx`**:
   - Floating Action Button (FAB) anchored at the bottom-right of `HomeScreen.tsx` and `BillScreen.tsx`.
   - Subtle pulse animation with label: "Ask Cora".
   - Tapping immediately opens `CoraAssistantModal`.

#### 2.3 Integrating AI into Mobile Screens
1. **In `apps/mobile/src/screens/BillScreen.tsx`**:
   - Under the `Hero` remaining balance card, add a high-visibility interactive action button:
     ```tsx
     <Pressable
       onPress={() => openCoraWithMode('WHY_DO_I_OWE')}
       style={/* styled pill */}
     >
       <Icon name="sparkles" size={16} color={C.brand} />
       <Text style={/* text */}>Explain My Bill with Cora AI</Text>
     </Pressable>
     ```
   - When tapped, opens Cora with the initial prompt pre-loaded: *"Can you explain in plain terms why my remaining balance is ₱{balance} and how PhilHealth and HMO were applied?"*.
2. **In `apps/mobile/src/screens/HomeScreen.tsx`**:
   - Next to the discharge milestone stepper, add:
     ```tsx
     <Pressable onPress={() => openCoraWithMode('DISCHARGE_STATUS')}>
       <Text style={/* subtext */}>What does "{currentEncounter.stage}" mean? Ask Cora $\rightarrow$</Text>
     </Pressable>
     ```
3. **In `apps/mobile/src/screens/RecordDetailScreen.tsx` (Itemized Bill View)**:
   - On each itemized line item, alongside the "Dispute" option, add:
     - "Ask Cora about this charge" $\rightarrow$ opens Cora explaining what the medication or procedural fee represents in non-clinical language.

---

### PART 3: STAFF DASHBOARD AI INTEGRATION (`apps/dashboard`)

#### 3.1 Dashboard AI API Client
Create `apps/dashboard/src/api/ai.ts` and re-export in `apps/dashboard/src/api/index.ts`:
- Methods:
  - `claimsAi.preflightScrub(encounterId: string): Promise<ClaimsAuditResult>`
  - `hmoAi.generateAppeal(encounterId: string, deniedItem: string, hmoId: string, notes?: string): Promise<{ appealLetterMarkdown: string; referenceNumber: string }>`
  - `rcmAi.getExecutiveBriefing(): Promise<{ briefingMarkdown: string; generatedAt: string }>`

#### 3.2 Feature 1: Clinical Claims Pre-Flight Scrubber in `ClaimsEsoaPage.tsx`
1. **Create `apps/dashboard/src/components/ai/ClaimsPreflightScrubberModal.tsx`**:
   - Modal launched from `ClaimsEsoaPage.tsx` via a prominent **"Run AI Pre-Flight Audit"** button.
   - **Header**:
     - Title: "PhilHealth eClaims 3.0 Clinical Forensic Scrubber".
     - Badge: Model used (`Gemini 2.5 Flash / 1.5 Pro`).
   - **Visual Risk Gauge**:
     - Circular / semi-circular RTH Risk Score gauge (0.00 to 1.00).
     - Color code: Green ($< 0.08$), Yellow ($0.08 - 0.15$), Red ($> 0.15$).
     - Clean-claim readiness percentage (e.g., "98.4% Clean Claim Confidence").
   - **Flagged Discrepancies Table**:
     - Category tag (`DIAGNOSTIC_DISCREPANCY`, `MISSING_CF4_FIELD`, `MEDICATION_DISCORDANCE`, `SPC_RULE_RISK`).
     - Severity indicator (`CRITICAL`, `WARNING`, `INFO`).
     - Description of why PhilHealth claims processors would return this to hospital (RTH).
     - **"Recommended Clinical Addendum"**: Actionable text ready to copy-paste or submit to the attending doctor's chart.
   - **One-Click Action**:
     - "Export Audit Dossier (PDF/Text)" and "Mark Claim Cleared for Gateway Transmission".
2. **Wire into `apps/dashboard/src/pages/ClaimsEsoaPage.tsx`**:
   - Add the audit button alongside the existing "Download XML" and "Print eSOA" buttons.
   - Display a mini AI RTH Status Badge directly in the claims table summary.

#### 3.3 Feature 2: Automated HMO Appeal Drafter in `DisputesExceptionsPage.tsx` & `CoverageApprovalsPage.tsx`
1. **Create `apps/dashboard/src/components/ai/HmoAppealGeneratorModal.tsx`**:
   - In `DisputesExceptionsPage.tsx` and `CoverageApprovalsPage.tsx`, when viewing a denied charge or consumable exclusion, provide a **"Draft AI Medical Necessity Appeal"** button.
   - The modal triggers `POST /api/v1/ai/hmo/generate-appeal` and displays:
     - Real-time markdown preview of the formal appeal letter.
     - Editable textarea allowing the billing specialist or HMO coordinator to adjust details.
     - Pre-populated citations of Insurance Commission guidelines and clinical protocols.
     - **Action Controls**:
       - "Copy Appeal to Clipboard".
       - "Print Appeal with Hospital Letterhead" (using existing printing utilities).
       - "Attach to HMO e-Submission Dossier".

#### 3.4 Feature 3: Executive Telemetry AI Briefing in `RcmAnalyticsPage.tsx` & `CommandCenterPage.tsx`
1. **Create `apps/dashboard/src/components/ai/ExecutiveAiBriefingCard.tsx`**:
   - Positioned at the top of `RcmAnalyticsPage.tsx` and as an expandable drawer on `CommandCenterPage.tsx`.
   - Displays the daily synthesized operational briefing:
     - **Executive Highlights**: 3 key bullet points on cash collection velocity, PhilHealth claim throughput, and HMO turnaround.
     - **Active Clearance Bottlenecks**: Highlights departments currently holding back discharges.
     - **Bed-Hours Reclaimed**: Visual KPI showing hours saved by parallelizing multi-payer billing.
     - Refresh button triggering real-time re-analysis.

#### 3.5 Feature 4: Staff AI Command Palette in `GlobalCommandBar.tsx`
1. Update `apps/dashboard/src/components/layout/GlobalCommandBar.tsx`:
   - Add an AI Assistant icon button (or keyboard shortcut `Cmd+K` / `Ctrl+K`) that toggles a quick AI query bar for staff.
   - Allows instant natural language queries such as:
     - *"Show all patients waiting for HMO LOA code"*
     - *"What is holding up discharge for room 412?"*
     - *"Summarize Juan Dela Cruz's remaining balance breakdown"*

---

## 5. AUTOMATED TESTING, UNIT VERIFICATION & INTEGRATION SPECS

Create comprehensive test suites to guarantee zero regression and verify AI functionality:

### 5.1 Backend AI Test Suite (`apps/server/__tests__/aiServices.test.ts`)
Run via: `npx tsx apps/server/__tests__/aiServices.test.ts`
Implement test assertions covering:
1. **PHI Scrubber Integrity**:
   - Assert that passing a patient's name ("Juan Dela Cruz"), MRN ("MRN-2026-8812"), and phone ("0917-881-8812") produces scrubbed text containing ONLY `[PATIENT_PSEUDONYM]`, `[MRN_MASKED]`, etc.
   - Assert that no raw patient names or phone numbers exist in the string passed to the LLM client.
   - Assert that `rehydrateText()` restores the proper tokens when presenting back to the user.
2. **Deterministic Offline Fallback**:
   - Unset `GEMINI_API_KEY` in test environment.
   - Call `coraService.generateReply()` $\rightarrow$ verify it returns a valid, helpful fallback message without throwing errors.
   - Call `claimsForensicService.runPreflightAudit()` $\rightarrow$ verify it returns a valid `ClaimsAuditResult` with schema conformance.
   - Call `hmoAppealService.draftAppeal()` $\rightarrow$ verify it returns a formatted appeal letter string.
3. **Structured Claims Audit Schema Conformance**:
   - Verify `ClaimsAuditResult` strictly satisfies:
     - `rthRiskScore` is a finite number between 0.00 and 1.00.
     - `flags` is an array of typed objects.
     - Zero centavo drift on any referenced financial numbers.

### 5.2 Mobile Component Tests (`apps/mobile/__tests__/cora.test.tsx`)
Run via: `npm --prefix apps/mobile run test`
- Assert that `CoraAssistantModal` mounts without crashing.
- Assert that switching between English, Taglish, and Ilocano updates prompt payload language parameter.
- Assert that selecting "Why do I owe this?" renders the deterministic waterfall numbers accurately.

### 5.3 Full Regression Suite Certification
Execute the complete test battery to verify zero side-effects on existing core features:
```bash
# 1. Backend API & Auth Suite
npm run test:api

# 2. Philippine Statutory Deduction & Centavo-Drift Audit
npm run test:financial

# 3. Mobile Sync, Offline Engine & Storage Suite
npm --prefix apps/mobile run test

# 4. Server Patient Workflows Suite
npm --prefix apps/mobile run test:server

# 5. Cryptographic Gate Pass QR Generation Suite
npm --prefix apps/mobile run test:qr
```
*All tests must pass with zero failures.*

---

## 6. STEP-BY-STEP EXECUTION CHECKLIST FOR THE IMPLEMENTING AGENT

Follow this exact sequence to implement and verify the AI suite:

- [ ] **Step 1: Backend Scaffolding & Configuration**
  - Add AI configuration in `apps/server/src/config/aiConfig.ts`.
  - Implement bidirectional PHI de-identifier in `apps/server/src/services/ai/phiScrubber.ts`.
  - Implement resilient Gemini 2.5 Flash / 1.5 Pro client with offline fallback in `apps/server/src/services/ai/geminiClient.ts`.
- [ ] **Step 2: Core AI Services Implementation**
  - Create `apps/server/src/services/ai/coraService.ts` (with English, Taglish, Ilocano localization & financial grounding).
  - Create `apps/server/src/services/ai/claimsForensicService.ts` (CF4 analysis, RTH score 0.00-1.00, SPC retro-audit).
  - Create `apps/server/src/services/ai/hmoAppealService.ts` (medico-legal consumable and room differential appeal drafter).
  - Create `apps/server/src/services/ai/executiveBriefingService.ts` (RCM telemetry & bottleneck briefings).
  - Mount endpoints in `apps/server/src/routes/ai.ts` and register in `apps/server/src/index.ts`.
- [ ] **Step 3: Patient Mobile App Integration (`apps/mobile`)**
  - Create `apps/mobile/src/services/aiApi.ts`.
  - Implement `apps/mobile/src/components/CoraAssistantModal.tsx` and `CoraFloatingPill.tsx`.
  - Integrate Cora triggers into `apps/mobile/src/screens/BillScreen.tsx` ("Explain My Bill with Cora AI") and `HomeScreen.tsx`.
  - Add item-level dispute assistant in `apps/mobile/src/screens/RecordDetailScreen.tsx`.
- [ ] **Step 4: Hospital Staff Dashboard Integration (`apps/dashboard`)**
  - Create `apps/dashboard/src/api/ai.ts`.
  - Implement `apps/dashboard/src/components/ai/ClaimsPreflightScrubberModal.tsx` and wire into `apps/dashboard/src/pages/ClaimsEsoaPage.tsx`.
  - Implement `apps/dashboard/src/components/ai/HmoAppealGeneratorModal.tsx` and wire into `apps/dashboard/src/pages/DisputesExceptionsPage.tsx` and `CoverageApprovalsPage.tsx`.
  - Implement `apps/dashboard/src/components/ai/ExecutiveAiBriefingCard.tsx` and wire into `apps/dashboard/src/pages/RcmAnalyticsPage.tsx` and `CommandCenterPage.tsx`.
- [ ] **Step 5: Testing, Certification & Documentation**
  - Write and execute `apps/server/__tests__/aiServices.test.ts`.
  - Run all baseline tests (`npm run test:api`, `npm run test:financial`, `npm --prefix apps/mobile run test`).
  - Document completed endpoints and configuration in project docs.

---

## 7. ACCEPTANCE CRITERIA FOR ZERO-DEFECT COMPLETION

The implementation is considered complete **only when all of the following conditions are verified**:
1. **Mathematical Invariant Preserved**: Generative AI components never alter or recompute any financial waterfall ledger values; all numbers in AI text are 100% grounded in deterministic server values with 0.00 centavo drift.
2. **Privacy Law Enforced**: Zero unmasked PHI (names, MRNs, phone numbers, PhilHealth PINs) is sent to external LLM providers; PHI scrubber tests pass with 100% coverage.
3. **Cora Operational on Mobile**: Tapping "Explain My Bill" or the floating Cora button opens the assistant, smoothly renders plain-language explanations in English, Taglish, and Ilocano, and explains discharge progress accurately.
4. **Forensic Scrubber Operational on Dashboard**: Tapping "Run AI Pre-Flight Audit" on `ClaimsEsoaPage.tsx` analyzes the encounter, displays the RTH risk gauge (0.00 to 1.00), flags discrepancies, and generates doctor addenda.
5. **HMO Appeal Drafter Operational**: Billing coordinators can generate formal medical necessity reconsideration letters with one click, edit the draft, and copy or print with hospital letterhead.
6. **Executive Briefing Operational**: RCM Analytics displays clear daily executive summaries of discharge delays, bottleneck departments, and reclaimed bed-hours.
7. **Offline Resiliency**: In the absence of API keys or during offline runs, the system falls back to structured local mock responses without crashes.
8. **Test Suites Green**: 100% of existing and new automated test suites pass without warnings or errors.
