# MedCore API Contracts & Architecture Specification

> **Status**: Current Production Prototype Specification  
> **Platform Version**: 3.2.0  
> **Architecture Model**: Shared Backend (Single Source of Truth) → Web Command Center + Future Native Mobile Clients

---

## 1. Architectural Topology

```text
                    MEDCORE BACKEND
             PostgreSQL 16+ & API Layer (Hono)
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
      MEDCORE DASHBOARD        MEDCORE MOBILE APP
       Web / Desktop           Native Mobile
       
       Vercel hosting          Xcode (iOS) / Android Studio (Android)
       Prototype (CURRENT)     Physical Devices (FUTURE)
```

### Shared Backend Principles
1. **Single Source of Truth**: All statutory deduction waterfalls (RA 9994 20% SC/PWD, RA 10754 12% VAT exemption, RA 11223 UHC), PhilHealth ACR/DRG rates, commercial HMO LOA approvals, and RA 9439 0% interest promissory note schedules are calculated **strictly on the backend**.
2. **Zero Calculation Drift**: Neither the web dashboard nor future mobile applications calculate out-of-pocket amounts independently. Both consume authoritative backend responses.
3. **Database Sharing**: The database (PostgreSQL 16+) is unified. No replica drift between client platforms.

---

## 2. Current API Endpoints (Live & Operational)

Base Path: `/api/v1`

### Authentication & Sessions (`/api/v1/auth`)

| Method | Endpoint | Description | Auth Mode | Status |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Authenticates hospital staff or user credentials. Returns user session and bearer token in JSON. Sets HTTP-Only cookie. | Public | **CURRENT** |
| `POST` | `/api/v1/auth/logout` | Terminates active user session and invalidates tokens. | Bearer / Cookie | **CURRENT** |
| `GET` | `/api/v1/auth/me` | Returns authenticated user profile and permissions. | Bearer / Cookie | **CURRENT** |
| `POST` | `/api/v1/auth/switch-role` | Switches active role for presenter/demo evaluation (non-production). | Bearer / Cookie | **CURRENT** |

### Encounters & Patient Records (`/api/v1/encounters`)

| Method | Endpoint | Description | Auth Mode | Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/encounters` | Lists all active inpatient encounters. Supports `search`, `status`, `stage`, `hmo` query filters. | Bearer / Cookie | **CURRENT** |
| `GET` | `/api/v1/encounters/:id` | Returns full hydrated encounter (patient, bed, attending doctor, waterfall, items, philhealth, hmo, disputes, passes, notes, payment history). | Bearer / Cookie | **CURRENT** |
| `POST` | `/api/v1/encounters` | Pre-admission intake / admits patient into bed. | Bearer / Cookie | **CURRENT** |
| `PATCH` | `/api/v1/encounters/:id` | Modifies encounter clinical metadata (diagnosis, attending physician, bed). | Bearer / Cookie | **CURRENT** |
| `DELETE` | `/api/v1/encounters/:id` | Discharges and closes active encounter. | Bearer / Cookie | **CURRENT** |
| `POST` | `/api/v1/encounters/:id/advance-stage` | Advances the 6-stage discharge state machine (`MGH` → `PF` → `RTS` → `LOA` → `SETTLEMENT` → `CLEARED`). | Bearer / Cookie | **CURRENT** |

### Billing, Ledgers & Chargemaster (`/api/v1/encounters`, `/api/v1/charges`)

| Method | Endpoint | Description | Auth Mode | Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/encounters/:id/ledger` | Returns itemized charges, statutory deductions, and out-of-pocket drivers. | Bearer / Cookie | **CURRENT** |
| `GET` | `/api/v1/encounters/:id/statement` | Returns official eSOA statement object for printing or sharing. | Bearer / Cookie | **CURRENT** |
| `GET` | `/api/v1/encounters/:id/invoice` | Alias for statement endpoint. | Bearer / Cookie | **CURRENT** |
| `POST` | `/api/v1/encounters/:encounterId/charges` | Adds a chargemaster item to the patient encounter and recalculates waterfall atomically. | Bearer / Cookie | **CURRENT** |
| `PATCH` | `/api/v1/charges/:chargeId` | Updates an existing charge item (quantity, unit price, status). | Bearer / Cookie | **CURRENT** |
| `DELETE` | `/api/v1/charges/:chargeId` | Deletes a charge item with foreign-key dispute restriction check. | Bearer / Cookie | **CURRENT** |

### Clinical & Payer Clearance (`/api/v1/encounters/:id/...`)

| Method | Endpoint | Description | Auth Mode | Status |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/encounters/:id/doctor/sign` | Records physician quick-sign with agreed professional fee. | Bearer / Cookie | **CURRENT** |
| `POST` | `/api/v1/encounters/:id/doctor/accredited-ceiling` | Applies Philippine Medical Association / HMO accredited fee ceiling. | Bearer / Cookie | **CURRENT** |
| `POST` | `/api/v1/encounters/:id/pharmacy/clear-rts` | Audits and clears unused pharmacy return-to-stock items. | Bearer / Cookie | **CURRENT** |
| `POST` | `/api/v1/encounters/:id/hmo/final-loa` | Ingests final Letter of Authorization from commercial HMO gateway. | Bearer / Cookie | **CURRENT** |

### Billing Disputes & Supervisory Waivers (`/api/v1/...`)

| Method | Endpoint | Description | Auth Mode | Status |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/encounters/:id/disputes` | Files a dispute against a specific line item charge (`CONTESTED`). | Bearer / Cookie | **CURRENT** |
| `POST` | `/api/v1/disputes/:id/supervisory-waive` | Hospital billing supervisor waives contested balance with audit rationale. | Bearer / Cookie | **CURRENT** |

### Payments & Promissory Notes (`/api/v1/...`)

| Method | Endpoint | Description | Auth Mode | Status |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/encounters/:id/payments` | Processes settlement via QR Ph, GCash, Maya, Card, or Cash. Generates official receipt. Supports `Idempotency-Key`. | Bearer / Cookie | **CURRENT** |
| `POST` | `/api/v1/encounters/:id/promissory-notes` | Executes legally binding RA 9439 0% interest promissory note (3/6/12 months) and advances patient clearance atomically. | Bearer / Cookie | **CURRENT** |
| `GET` | `/api/v1/promissory-notes` | Lists active promissory notes and payment schedules across facility. | Bearer / Cookie | **CURRENT** |

### Discharge Gate Pass (`/api/v1/discharge/...`)

| Method | Endpoint | Description | Auth Mode | Status |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/discharge/passes/verify` | Lobby exit security verifies QR pass number and 4-digit PIN. | Bearer / Cookie | **CURRENT** |

### Claims & Statutory XML (`/api/v1/claims/...`)

| Method | Endpoint | Description | Auth Mode | Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/claims/:claimId/esoa-xml` | Streams official PhilHealth eClaims 3.0 eSOA XML payload. | Bearer / Cookie | **CURRENT** |

### Bed Inventory & Hospital RCM Analytics (`/api/v1/...`)

| Method | Endpoint | Description | Auth Mode | Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/beds` | Returns bed inventory and occupancy status. | Bearer / Cookie | **CURRENT** |
| `PATCH` | `/api/v1/beds/:bedId/status` | Updates bed housekeeping / maintenance status. | Bearer / Cookie | **CURRENT** |
| `GET` | `/api/v1/analytics/rcm-metrics` | Returns executive RCM metrics, trapped revenue KPIs, and 30-day TAT. | Bearer / Cookie | **CURRENT** |
| `GET` | `/api/health` | Live PostgreSQL connectivity check and database latency ping. | Public | **CURRENT** |

---

## 3. Future Native Mobile Application Requirements (Planned)

When creating the standalone native mobile project (iOS in Xcode, Android in Android Studio), the mobile client will consume existing endpoints above, supplemented by the following future endpoints:

| Domain | Method | Endpoint | Description | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Patient Magic Auth** | `POST` | `/api/v1/auth/mobile/magic-link` | Verifies SMS/WhatsApp token to log in patient on native device without password. | **FUTURE** |
| **Biometric Auth** | `POST` | `/api/v1/auth/mobile/biometric` | Exchange FaceID/Fingerprint signed challenge for session token. | **FUTURE** |
| **Push Notifications** | `POST` | `/api/v1/notifications/register-device` | Registers APNs (Apple) / FCM (Google) device push notification token. | **FUTURE** |
| **Push Notifications** | `GET` | `/api/v1/notifications` | Fetches active billing alerts, eSOA dispatches, and gate pass approvals. | **FUTURE** |
| **Patient Statements** | `GET` | `/api/v1/patient/bills/:id` | Dedicated mobile-optimized summary endpoint for patient statement. | **FUTURE** |
| **Native Wallet Webhook**| `POST` | `/api/v1/payments/webhook/:gateway` | Server-to-server webhook callback from GCash / Maya native SDKs. | **FUTURE** |

---

## 4. Client Transport Configuration

### Web Dashboard (Vercel)
- Base URL configurable via `VITE_API_URL` environment variable:
  - Local Dev: `VITE_API_URL=` (proxied to `http://127.0.0.1:8787`)
  - Prototype / Demo: `VITE_API_URL=https://api.medcore.example.com`
- CORS: Allowed via `apps/server/src/index.ts` (accepts `*.vercel.app` preview URLs and custom domains).
- Auth: Automatically passes session cookies and/or `Authorization: Bearer <token>`.

### Native Mobile App (iOS / Android)
- Base URL configurable via build flavors / environment config:
  - iOS Debug: `http://localhost:8787` (Simulator) or `http://192.168.x.x:8787` (Physical device)
  - Android Debug: `http://10.0.2.2:8787` (Emulator) or `http://192.168.x.x:8787` (Physical device)
  - Prototype / Production: `https://api.medcore.example.com`
- CORS: Not applicable. Native mobile network stacks (NSURLSession, OkHttp) issue direct socket HTTP requests without browser `Origin` constraints.
- Auth: Saves `token` from `/api/v1/auth/login` securely in iOS Keychain / Android EncryptedSharedPreferences and transmits `Authorization: Bearer <token>` in all requests.
