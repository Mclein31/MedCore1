# Execution boundary — October 9, 2026

These initial observations are transcribed from tool results. The linked logs are subsequent recorded attempts. No successful PostgreSQL connection or hospital mutation occurred during this audit.

| Attempt | Exit / result | Evidence |
|---|---|---|
| `npm run seed` | Exit 1: `listen EPERM` on the tsx IPC pipe, before seeding | Initial tool result |
| `node --import ./node_modules/tsx/dist/loader.mjs scripts/seedPostgres.ts` | Exit 1: PostgreSQL `connect EPERM` on both `::1:5432` and `127.0.0.1:5432`, before acquiring a client or issuing `BEGIN` | Initial tool result |
| `curl -sS --max-time 5 -i http://127.0.0.1:3000/api/health` | curl error 7; no HTTP response | Initial tool result |
| Same health request on port 8787 | curl error 7; no HTTP response | Initial tool result |
| Start current standalone API with `PORT=3000 HOST=127.0.0.1`, using the loader | Exit 1: `listen EPERM 127.0.0.1:3000` | [API start log](evidence/environment-api-start.log) |
| Dedicated PostgreSQL payment suite with `MEDCORE_VALIDATION_DATABASE_URL=postgresql://mclein@127.0.0.1:5432/medcore_payment_validation_masteraudit` | Exit 1: `connect EPERM 127.0.0.1:5432`, before validation DB creation | [PostgreSQL attempt](evidence/postgres-payment-attempt.log) |
| Root and mobile dependency scans | Exit 1: npm registry `ENOTFOUND`; no vulnerability result obtained | [Root](evidence/root-dependencies.json), [mobile](evidence/mobile-dependencies.json) |

`lsof` showed PostgreSQL listening locally and the existing Metro process on 8081. It showed no API listener on 3000 or dashboard listener on 5173. No existing service was terminated or reconfigured. The loaded permission policy automatically rejects sandbox escalation, so no unauthorized alternative execution path was used.

This blocks live login/cookies, SQL row reads and mutations, API-to-database reconciliation, real rollback/races, and device synchronization certification. An in-memory handler response, fixture calculation or server-rendered component does not replace these checks.
