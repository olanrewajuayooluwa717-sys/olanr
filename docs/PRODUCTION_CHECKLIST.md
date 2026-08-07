# Production checklist

Use this before and after your first production deploy. Full steps: [DEPLOY.md](../DEPLOY.md).

---

## Pre-launch

### Code & config

- [ ] Latest `main` pushed to GitHub
- [ ] `npx tsx scripts/verify-production-config.ts` passes
- [ ] `npm run build:api` succeeds locally
- [ ] `npm run build -w @fishmaster/web` succeeds locally
- [ ] No secrets committed (`.env` in `.gitignore`)

### Security

- [ ] `JWT_SECRET` is strong and unique (Render auto-generates)
- [ ] `JWT_SECRET` is **not** `fishmaster-dev-secret-change-in-prod`
- [ ] `NODE_ENV=production` on Render
- [ ] `WEB_URL` set to production Vercel URL
- [ ] CORS restricted (no open `*` in production)
- [ ] Login rate limiting active (`/api/auth/login`)
- [ ] Helmet security headers enabled
- [ ] Stripe webhook uses live signing secret in production
- [ ] `SEED_ON_DEPLOY=false` after initial seed

---

## Environment variables

### Render (API)

| Variable | Required | Example / notes |
|----------|----------|-----------------|
| `NODE_ENV` | Yes | `production` |
| `PORT` | Auto | Set by Render |
| `JWT_SECRET` | Yes | Auto-generated |
| `DATABASE_URL` | Yes | Render Postgres or Neon pooled URL |
| `WEB_URL` | Yes | `https://fishmaster.ng` or Vercel URL |
| `CORS_ORIGINS` | Optional | Vercel preview URLs, comma-separated |
| `STRIPE_SECRET_KEY` | Billing | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Billing | `whsec_...` |
| `ELECTRICITY_RATE_NGN` | Optional | `85` |
| `DIESEL_RATE_NGN` | Optional | `1200` |
| `PETROL_RATE_NGN` | Optional | `1100` |
| `SEED_ON_DEPLOY` | First deploy | `true` once, then `false` |

### Vercel (Web)

| Variable | Required | Example |
|----------|----------|---------|
| `NEXT_PUBLIC_API_URL` | Yes | `https://fishmaster-api.onrender.com` or `https://api.fishmaster.ng` |

### EAS / Mobile

| Variable | Required | Example |
|----------|----------|---------|
| `EXPO_PUBLIC_API_URL` | Yes | Same as `NEXT_PUBLIC_API_URL` |

Set in `apps/mobile/eas.json` profiles or EAS secrets dashboard.

### Stripe

| Item | Value |
|------|-------|
| Webhook URL | `https://YOUR-API/api/billing/webhook` |
| Events | `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` |
| Keys in Render | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |

---

## Deploy sequence

1. [ ] Choose database: Render Postgres or Neon
2. [ ] Deploy Render Blueprint (or update existing service)
3. [ ] Confirm `/health` returns `database: true`
4. [ ] Set `SEED_ON_DEPLOY=true`, redeploy once (optional demo data)
5. [ ] Set `SEED_ON_DEPLOY=false`
6. [ ] Deploy Vercel web app
7. [ ] Set Render `WEB_URL` to Vercel URL
8. [ ] Configure Stripe webhook + keys
9. [ ] Test login, dashboard, reports, economics, admin
10. [ ] Run EAS preview build → test on device
11. [ ] Configure custom domains (`fishmaster.ng`, `api.fishmaster.ng`)
12. [ ] Update all env vars for custom domains
13. [ ] Switch Stripe to live mode when ready

---

## Post-launch smoke tests

| # | Test | Expected |
|---|------|----------|
| 1 | `GET /health` | `{ status: "ok", database: true }` |
| 2 | `GET /` | JSON with correct `webUrl` |
| 3 | Web `/login` | Demo user can sign in |
| 4 | Web `/` dashboard | Pond stats load |
| 5 | Web `/reports` | Reports render |
| 6 | Web `/economics` | Power + feed costs show |
| 7 | Web `/admin` | Admin can edit content |
| 8 | Web `/messages` | Inbox loads |
| 9 | Stripe subscribe | Redirect to success page |
| 10 | Mobile preview build | Login + home screen |
| 11 | Wrong-origin API call | Blocked by CORS (browser) |
| 12 | 21+ login attempts / 15 min | Rate limited |

---

## Custom domains (fishmaster.ng)

| Service | Suggested domain | Provider |
|---------|------------------|----------|
| Web | `fishmaster.ng`, `www.fishmaster.ng` | Vercel |
| API | `api.fishmaster.ng` | Render |

After DNS:

- [ ] Vercel domain verified
- [ ] Render custom domain verified (HTTPS)
- [ ] `WEB_URL` updated
- [ ] `NEXT_PUBLIC_API_URL` updated
- [ ] `EXPO_PUBLIC_API_URL` updated in EAS
- [ ] Stripe webhook URL updated

---

## Ongoing ops

- [ ] Monitor Render logs for 5xx errors
- [ ] Rotate `JWT_SECRET` if compromised (invalidates all sessions)
- [ ] Keep Neon/Render Postgres backups enabled
- [ ] Review Stripe dashboard for failed payments
- [ ] Redeploy API after schema changes (`db:push` in build)
- [ ] Redeploy web after API URL changes

See [SECURITY.md](./SECURITY.md) for security practices.
