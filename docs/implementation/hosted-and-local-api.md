# Hosted versus local API — October 10, 2026

The Vercel dashboard and local simulator currently use different API deployments/databases. Changes to one cannot synchronize to the other.

| Client | API |
| --- | --- |
| Local dashboard at `http://127.0.0.1:5173` | Vite `/api` proxy to `http://127.0.0.1:8787` |
| Vercel dashboard at `https://med-core1.vercel.app` | `/api` rewrite to the configured Cloudflare Worker |
| Current local Expo configuration | `http://192.168.1.9:8787` |

The deployed dashboard now deliberately uses same-origin `/api/v1` requests through `vercel.json`; an explicit Worker URL in build environment variables does not turn those requests into cross-origin browser calls. Development still supports `VITE_API_BASE_URL`. Native mobile uses its own `EXPO_PUBLIC_API_BASE_URL`.

Credential-free probes confirmed the hosted Worker returns `404 ROUTE_NOT_FOUND` for `finalize-bill`, `send-bill`, and notifications. The current local backend contains these handlers. CORS for the canonical Vercel origin accepts Authorization/Content-Type, but the older hosted allowed-header list lacks the new selected-patient header. The updated source includes that header.

A frontend Git push does not publish a Cloudflare Worker. The current backend passed:

```sh
npx wrangler deploy --config apps/server/wrangler.jsonc --dry-run --outdir /private/tmp/medcore-backend-release
```

Publishing is a separate hosted operation:

```sh
npx wrangler deploy --config apps/server/wrangler.jsonc
```

Deployment remains pending explicit approval. No hosted patient record was changed during these diagnostics. A staff-credential probe was rejected by automatic approval review; safer credential-free probes established the missing routes.

For the existing local demonstration, use the local dashboard with the local simulator API. For a hosted demonstration, first publish the backend and verify its schema/account setup, then configure and restart Expo against the same hosted API. Local seeded accounts and generated credentials do not automatically exist in another database. Do not reseed the hosted database merely to align credentials.

Bill delivery also requires workflow readiness: complete discharge checks and HMO authorization, finalize the statement at `PENDING_SETTLEMENT`, then send it. Ledger/dossier controls now enforce these conditions and disable repeat dispatch after the server records delivery. The screenshot shows a Draft bill, so it is not ready to send even after the missing hosted route is deployed.
