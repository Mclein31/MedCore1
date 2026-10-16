# Moving the MedCore database from Ohio to Singapore

**Status:** completed 2026-10-16. The hosted app runs on Singapore `demo`.

**Switch verification (2026-10-16):**
- Hyperdrive `medcore-hyperdrive` now points at the `demo` **direct** endpoint (`ep-wandering-shadow-azd4q0ln`, ap-southeast-1), with caching disabled.
- **Live health:** HTTP 200, `CONNECTED`, 248 encounters. Warm DB latency is about 435–463 ms, against about 966 ms on Ohio (2026-10-10). The first calls after idle take about 1.8 s while Neon wakes the compute.
- `pg_stat_activity` shows the Hyperdrive sessions on `demo` and none on Ohio.
- **Local:** `npm run build` passes, server `tsc` passes, and `npm run dev:server` reaches `demo` in 53 ms. Login → `GET /encounters` (248) → `/auth/me` → logout → `/auth/me` 401 all pass.
- **Repo:** `neon init --branch demo` linked `.neon` (git-ignored), created `neon.ts`, added `@neon/config` and `@neon/env`, and pulled `DATABASE_URL`, `DATABASE_URL_UNPOOLED` and `NEON_BRANCH=demo` into `.env`.

## As performed (2026-10-16)

The setup mirrors AdvanCare: real data goes on `production`, and fictional data lives on a separate `demo` branch.

| Branch | Neon ID | Contents | Used by |
|---|---|---|---|
| `production` (default) | `br-red-sun-azu5b3fy` | Schema plus `drizzle.__drizzle_migrations` (4 rows), **0 data rows** | Nothing yet. Point Hyperdrive here for a real pilot. |
| `demo` (child of production, never expires) | `br-small-hall-azzh041j` | Full copy of Ohio | Hosted Worker (Hyperdrive) and local `.env` |

- **Project:** `medcore-sg` (`autumn-scene-83835371`), `aws-ap-southeast-1`, Postgres 17.
- **Copy:** `pg_dump -Fc` from the Ohio direct endpoint, then `pg_restore` into `demo` (full) and into `production` (`--schema-only`, plus `--data-only --schema=drizzle`).
- **Verification:**
  - All 21 tables match between Ohio and `demo`.
  - The payments total (₱43,300.00), the encounter `amount_paid` total (₱408,902.86) and `system_audit_logs_id_seq` (153) match.
  - `production` has 0 public rows.
- **Drift found:** `ai_conversations` and `ai_audit_logs` are in `schema.ts` but do not exist in the database (audit D12).
- **Ohio is untouched.** The hosted app still uses it until Hyperdrive is switched.
- **Local backups:** `.env.ohio-backup` (the original `.env`) and `.env.ohio-direct`, both git-ignored with mode 600. Branch URLs are in `.env.migration`, also git-ignored. Delete all three after the switch is confirmed.
- **Seeding rule** (as in AdvanCare): only ever seed or reset the `demo` branch. To refresh it from a clean schema, use `neon branches reset demo --parent`, which wipes demo data, then re-run the seed against `demo`.

## Current state (checked 2026-10-16, read-only)

| Item | Value |
|---|---|
| Neon endpoint | `ep-sweet-resonance-b57scad1` in **`aws-us-east-2` (Ohio)**, database `neondb` |
| Postgres | 17.11 |
| Size | 11 MB, 20 public tables, no extensions |
| Hyperdrive | `medcore-hyperdrive`, id `b611eac58efa4966b649dfa7d1631b2a`, caching disabled, origin is the **pooled** (`-pooler`) host |
| Local tools | `pg_dump` / `pg_restore` 17.11 (Homebrew), matching the server |

## Why move, and where

The Worker runs near the user (Manila), but each query travels to Ohio and back: about 200 ms or more per round trip, multiplied across the census hydration batches. **`aws-ap-southeast-1` (Singapore)** is Neon's closest region to the Philippines. AdvanCare already runs there.

A Neon project's region **cannot be changed** after creation. The move is: create a new project in Singapore, copy the data, then point Hyperdrive at it. At 11 MB the copy takes seconds.

Nothing else needs to change. The dashboard (through the Vercel proxy) and the mobile app (`EXPO_PUBLIC_API_BASE_URL`) both talk to the Worker. The Worker reaches the database only through Hyperdrive, and the Hyperdrive **ID stays the same**, so `wrangler.jsonc` is unchanged.

## Steps

Run these from the repository root. Each code block is one command. Never paste connection strings into chat, commits or docs.

### 1. Create the Singapore project

In the Neon console (console.neon.tech), choose **New project**:
- Name: `medcore-sg`
- Postgres version: **17**
- Region: **AWS Asia Pacific (Singapore)**

Copy two connection strings from **Connect**:
- the **direct** one: host without `-pooler`;
- the **pooled** one.

Check your plan's project limit first. Keep the Ohio project until step 6.

You can create it from the command line instead:

```bash
npx neonctl projects create --name medcore-sg --region-id aws-ap-southeast-1 --pg-version 17
```

### 2. Put both URLs in your shell (not in files that get committed)

Use the **direct** (non-pooler) host for both. `pg_dump` and `pg_restore` need a direct session.

```bash
read -rs OLD_DIRECT_URL && export OLD_DIRECT_URL
```

```bash
read -rs NEW_DIRECT_URL && export NEW_DIRECT_URL
```

For the Ohio direct URL, take the current `DATABASE_URL` and remove `-pooler` from the host.

### 3. Pause demo writes, then dump Ohio

Don't use the dashboard or mobile app until step 5 is done. Anything written to Ohio after the dump would be lost.

```bash
pg_dump --format=custom --no-owner --no-acl --file="$TMPDIR/medcore-ohio.dump" "$OLD_DIRECT_URL"
```

This includes the `drizzle` schema, which holds the migration history.

### 4. Restore into Singapore and verify

```bash
pg_restore --no-owner --no-acl --exit-on-error --dbname="$NEW_DIRECT_URL" "$TMPDIR/medcore-ohio.dump"
```

Run this on **both** databases and compare. The numbers must match exactly.

```bash
psql "$OLD_DIRECT_URL" -Atc "select 'enc',count(*) from encounters union all select 'pay',count(*) from payments union all select 'users',count(*) from users union all select 'audit',count(*) from system_audit_logs union all select 'sum',coalesce(sum(amount),0)::text::bigint from payments"
```

```bash
psql "$NEW_DIRECT_URL" -Atc "select 'enc',count(*) from encounters union all select 'pay',count(*) from payments union all select 'users',count(*) from users union all select 'audit',count(*) from system_audit_logs union all select 'sum',coalesce(sum(amount),0)::text::bigint from payments"
```

### 5. Point Hyperdrive at Singapore (direct endpoint)

Hyperdrive pools connections itself, so give it the **direct** URL, not the `-pooler` one. This also fixes D16 in the audit.

```bash
cd apps/server && npx wrangler hyperdrive update b611eac58efa4966b649dfa7d1631b2a --connection-string="$NEW_DIRECT_URL"
```

Leave caching **disabled**, as it is now. Financial data must never be served stale. Then redeploy, so that every isolate picks up the new origin:

```bash
cd apps/server && npx wrangler deploy
```

Check the result:

```bash
curl --fail-with-body https://medcore-backend.mcleinonza0531.workers.dev/api/health
```

Expect `ONLINE` and `CLOUDFLARE_HYPERDRIVE`, with a noticeably lower `latencyMs` than before (around 966 ms was recorded on 2026-10-10). Then sign in on the dashboard and the mobile app and open a few encounters.

### 6. Update local settings, then retire Ohio later

- In the local `.env`, set `DATABASE_URL` to the **Singapore pooled** URL, used by scripts and the app.
- Use the **direct** URL for migrations: `drizzle-kit` and the future `db:migrate`.
- Delete the dump file: `rm "$TMPDIR/medcore-ohio.dump"`.
- Keep the Ohio project for a week or two as a rollback, then delete it in the Neon console. Deleting it is permanent, so do it yourself once you are happy with Singapore.

## Rollback

Point Hyperdrive back at Ohio and redeploy. Any data written in Singapore after the switch would not be in Ohio.

```bash
cd apps/server && npx wrangler hyperdrive update b611eac58efa4966b649dfa7d1631b2a --connection-string="$OLD_DIRECT_URL"
```

## Notes

- The Worker needs no `"placement"` setting. Hyperdrive already keeps warm connections near the database.
- While you're in the new project, consider creating a `demo` branch for seeding and experiments, so the main branch stays presentable. AdvanCare refuses to seed anything but a branch named like "demo".
- Fix migration drift (audit D12) on the new project: only 4 of 6 migrations are recorded in `drizzle.__drizzle_migrations`. Record or reconcile 0004 and 0005 before running any new migration.
