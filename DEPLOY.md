# Deploying MedCore v2

## Topology

Browser → static web app (Vercel or Cloudflare Pages) → same-origin `/api/*` rewrite → API Worker →
Hyperdrive → Neon PostgreSQL (direct endpoint, caching **disabled**). Same-origin is what makes the
`SameSite=Strict` session cookie work; do not call the API cross-origin from the browser.

## 1. Database

1. Create a Neon branch for the release and take a restore point.
2. Run migrations against the **direct (unpooled)** URL:
   `DATABASE_URL=postgres://… npm run db:migrate`
3. Never run `db:seed` against production. It refuses remote hosts unless `SEED_ALLOW_REMOTE` names the host,
   and refuses any database that already has staff accounts.
4. Recommended: run the app as a role without `TRUNCATE`, `DROP` or DDL privileges.

## 2. API (Cloudflare Workers)

```bash
cd apps/api
npx wrangler secret put GATE_PASS_SECRET       # openssl rand -hex 32
npx wrangler secret put DATA_ENCRYPTION_KEY    # openssl rand -base64 32  (back this up: losing it loses encrypted fields)
npx wrangler secret put SMTP_USER
npx wrangler secret put SMTP_PASSWORD          # Google App Password or a transactional provider
```

Edit `wrangler.jsonc`: Hyperdrive id, `PUBLIC_APP_URL`, `ALLOWED_ORIGINS`. Then `npx wrangler deploy`.
The API refuses to start in production with console mail, disabled MFA, non-https origins, or weak secrets.

`PATIENT_ONLINE_PAYMENTS` stays `disabled` until a real payment gateway exists; `simulated` is for demos only.

## 3. Web

Set the `/api/:path*` rewrite in `apps/web/vercel.json` to the Worker host (or use `public/_headers` on
Cloudflare Pages with a route to the Worker). Security headers ship in both files.

## 4. First administrator

There is no self-registration. Create the first CFO account with SQL on the production branch (insert a
`staff_users` row with `invite_token_hash = sha256(token)` and a 72 h `invite_expires_at`), then open
`/staff/accept-invite#token=<token>`. Every later account is invited from **Staff accounts**.

## 5. Rotations

- `GATE_PASS_SECRET`: rotating it voids all outstanding exit passes (they fail verification). Reissue active ones.
- `DATA_ENCRYPTION_KEY`: requires re-encrypting every `*_enc` column; ciphertexts are versioned (`v1.`) for this.
- Staff password reset: **Staff accounts → Reset password** emails a new single-use link and ends old sessions.

## 6. Scheduled job

The Worker cron (`triggers.crons`) purges expired sign-in codes, challenges, rate-limit buckets and sessions
older than 30 days. On Node the same purge runs hourly inside the process.
