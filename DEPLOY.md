# Deploy Fishmaster

Production stack:

| Service | Host | Notes |
|---------|------|-------|
| **API** | [Render](https://render.com) | Express + JWT + Stripe webhooks |
| **Database** | Render Postgres **or** [Neon](https://neon.tech) | Neon recommended if you already use it locally |
| **Web** | [Vercel](https://vercel.com) | Next.js — root dir `apps/web` |
| **Mobile** | [EAS Build](https://docs.expo.dev/build/introduction/) | iOS + Android store builds |

Estimated time: **45–60 minutes** (first deploy).

See also: [docs/PRODUCTION_CHECKLIST.md](./docs/PRODUCTION_CHECKLIST.md) · [docs/SECURITY.md](./docs/SECURITY.md) · [apps/mobile/MOBILE.md](./apps/mobile/MOBILE.md)

---

## Before you deploy

1. Push this repo to GitHub (includes `render.yaml`, `vercel.json`, `eas.json`).
2. Run locally (optional but recommended):
   ```powershell
   npm install --legacy-peer-deps
   npm run build:api
   npx tsx scripts/verify-production-config.ts
   ```
3. Have ready: Stripe keys, Neon connection string (if using Neon), desired domain names.

---

## Part 1 — Database

### Option A: Render PostgreSQL (default in `render.yaml`)

Render Blueprint creates `fishmaster-db` and wires `DATABASE_URL` automatically. No extra steps.

### Option B: Neon PostgreSQL (keep your existing DB)

1. In [Neon console](https://console.neon.tech), copy the **pooled** connection string.
2. Edit `render.yaml` before Blueprint deploy **or** configure manually after:
   - Delete the `databases:` block at the bottom.
   - Remove the `fromDatabase` section under `DATABASE_URL`.
   - In Render → **fishmaster-api** → **Environment**, set `DATABASE_URL` to your Neon URL.
3. Apply schema once (from your machine):
   ```powershell
   $env:DATABASE_URL="postgresql://..."   # Neon URL
   npm run db:push -w @fishmaster/db
   ```
4. Optional demo data (first time only):
   ```powershell
   $env:SEED_ON_DEPLOY="true"
   npm run db:seed -w @fishmaster/db
   ```

> **Note:** `db:push` also runs on every Render deploy (see `buildCommand` in `render.yaml`). For mature production, migrate to `prisma migrate deploy`.

---

## Part 2 — Deploy API on Render

### Step 1: Blueprint deploy

1. https://dashboard.render.com/blueprints → **New Blueprint Instance**.
2. Connect your GitHub repo.
3. Review services from `render.yaml`: **fishmaster-api** (+ **fishmaster-db** if Option A).
4. Click **Apply**. Wait ~5–10 minutes.

### Step 2: Verify health

Open `https://fishmaster-api.onrender.com/health` (or your service URL).

Expected: `{"status":"ok","service":"fishmaster-api","database":true}`

### Step 3: Set API environment variables

Render → **fishmaster-api** → **Environment**:

| Key | Required | Value |
|-----|----------|-------|
| `NODE_ENV` | Yes | `production` (set in yaml) |
| `JWT_SECRET` | Yes | Auto-generated — keep it |
| `DATABASE_URL` | Yes | Auto (Render) or Neon URL |
| `WEB_URL` | Yes | Set after Vercel deploy (Part 3) |
| `CORS_ORIGINS` | Optional | Comma-separated Vercel preview URLs |
| `STRIPE_SECRET_KEY` | For billing | `sk_live_...` or `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | For billing | From Stripe webhook (Part 4) |
| `ELECTRICITY_RATE_NGN` | Optional | Default `85` |
| `DIESEL_RATE_NGN` | Optional | Default `1200` |
| `PETROL_RATE_NGN` | Optional | Default `1100` |
| `SEED_ON_DEPLOY` | First deploy only | `true` once, then `false` |

**First deploy seed:** Set `SEED_ON_DEPLOY=true`, trigger redeploy, confirm demo users exist, then set back to `false`.

---

## Part 3 — Deploy web on Vercel

### Step 1: Import project

1. https://vercel.com → **Add New…** → **Project**.
2. Import GitHub repo.
3. **Root Directory:** `apps/web`.
4. Framework: **Next.js** (auto-detected). `vercel.json` handles monorepo install/build.

### Step 2: Environment variables

Vercel → Project → **Settings** → **Environment Variables** (Production):

| Key | Value |
|-----|--------|
| `NEXT_PUBLIC_API_URL` | `https://fishmaster-api.onrender.com` |

See `apps/web/.env.production.example`.

### Step 3: Deploy

Click **Deploy**. Copy your URL, e.g. `https://fishmaster.vercel.app`.

### Step 4: Link API ↔ web

1. Render → **fishmaster-api** → set `WEB_URL` = your Vercel production URL.
2. If using Vercel preview branches, add preview URLs to `CORS_ORIGINS` on Render (comma-separated).
3. Save — Render redeploys automatically.

---

## Part 4 — Stripe

1. [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks** → **Add endpoint**.
2. URL: `https://fishmaster-api.onrender.com/api/billing/webhook`
3. Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copy **Signing secret** → Render `STRIPE_WEBHOOK_SECRET`.
5. Add `STRIPE_SECRET_KEY` (test keys first, live when ready).

See [STRIPE.md](./STRIPE.md) for local webhook testing.

---

## Part 5 — Mobile (EAS)

### Prerequisites

- Expo account: https://expo.dev/signup
- EAS CLI: `npm install -g eas-cli && eas login`

### Configure

1. In `apps/mobile/app.json`, replace:
   - `extra.eas.projectId` — run `eas init` in `apps/mobile` to get one.
   - `owner` — your Expo username/org.
2. Update `EXPO_PUBLIC_API_URL` in `apps/mobile/eas.json` production/preview profiles to your API URL.
3. For custom domain: use `https://api.fishmaster.ng`.

### Build

```powershell
cd apps/mobile
eas build --profile preview --platform android   # internal test APK
eas build --profile production --platform all      # store release
eas submit --platform ios                          # after production build
eas submit --platform android
```

Full steps: [apps/mobile/MOBILE.md](./apps/mobile/MOBILE.md)

---

## Part 6 — Custom domain (fishmaster.ng)

| Service | Domain example | Where to configure |
|---------|----------------|-------------------|
| Web | `https://fishmaster.ng` | Vercel → Settings → Domains |
| API | `https://api.fishmaster.ng` | Render → Settings → Custom Domains |
| Mobile | — | Update `EXPO_PUBLIC_API_URL` in EAS profiles |

After DNS propagates, update:

- Render: `WEB_URL`, optionally `CORS_ORIGINS`
- Vercel: `NEXT_PUBLIC_API_URL`
- EAS: `EXPO_PUBLIC_API_URL` in `eas.json`
- Stripe webhook URL

---

## Part 7 — Smoke tests

| Check | URL / action |
|-------|----------------|
| API health | `GET /health` → `database: true` |
| API root | `GET /` → includes `webUrl` |
| Web login | `/login` with demo credentials |
| CORS | Web app loads dashboard without CORS errors |
| Stripe | Subscribe flow redirects back to `/subscribe/success` |
| Mobile | EAS preview build connects to production API |
| Economics | `/economics` shows power cost estimates |
| Admin | `/admin` — edit content, message members |

Demo logins (if seeded): `logunsina@yahoo.com` / `demo1234` · `admin@fishmaster.app` / `admin1234`

---

## Local dev (PostgreSQL)

```powershell
docker compose up -d
copy .env.example .env
npm install --ignore-scripts --legacy-peer-deps
npm run db:setup
npm run dev:api    # :3001
npm run dev:web    # :3000
npm run dev:mobile # Expo — see MOBILE.md
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| API won't start — JWT error | Set strong `JWT_SECRET`; must not be dev default in production |
| `database: false` on `/health` | Check `DATABASE_URL`; Neon: use pooled URL; run `db:push` |
| Web CORS error | Set `WEB_URL` on Render; add preview URLs to `CORS_ORIGINS` |
| Web "Network request failed" | `NEXT_PUBLIC_API_URL` must match API URL exactly |
| Render build fails | Check logs; run `npm run build:api` locally |
| Stripe checkout fails | `WEB_URL` + `STRIPE_SECRET_KEY` on Render |
| Slow first API request | Render free tier cold start (~30–60s) — normal |
| Seed ran twice | Keep `SEED_ON_DEPLOY=false` after first deploy |
| Mobile can't reach API | Use production URL, not localhost, in EAS env |

---

## CI / config verification

GitHub Actions runs `production-verify.yml` on push — validates deploy files exist and env examples are complete.

Manual check:

```powershell
npx tsx scripts/verify-production-config.ts
```
