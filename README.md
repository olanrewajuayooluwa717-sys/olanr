# Fishmaster

Aquaculture management platform with an Excel-derived calculation engine, member dashboards, admin backend, and mobile app.

## Monorepo structure

```
fishmaster/
├── apps/
│   ├── api/          # Express REST API
│   ├── web/          # Next.js member + admin dashboard
│   └── mobile/       # Expo React Native (iOS/Android)
├── packages/
│   ├── calc-engine/  # Pure business logic — ported from App Fishmaster.xlsx
│   ├── shared-types/ # Shared TypeScript types
│   └── db/           # Prisma + SQLite (local dev)
```

## Prerequisites

- **Node.js 20+** — [nodejs.org](https://nodejs.org/)
- **Expo Go** (SDK 54) for mobile testing — [expo.dev/go](https://expo.dev/go)
- Python is **not required**

## Quick start

```powershell
$env:Path = "C:\Program Files\nodejs;" + $env:Path
cd C:\Users\olanr\Projects\fishmaster
npm.cmd install --ignore-scripts --legacy-peer-deps
npm.cmd run db:setup
npm.cmd run build -w @fishmaster/db
npm.cmd run test -w @fishmaster/calc-engine
npm.cmd run dev:api    # http://localhost:3001
npm.cmd run dev:web    # http://localhost:3000
npm.cmd run dev:mobile # Expo — see apps/mobile/MOBILE.md
```

## What's built

- [x] Calculation engine from Excel (21 reports)
- [x] Regression tests vs workbook sample data
- [x] Express API + JWT auth + RBAC
- [x] SQLite + Prisma + seed data
- [x] Next.js web (dashboard, reports, admin, Stripe checkout)
- [x] Expo mobile (dashboard, all 21 reports, daily log, subscriptions)
- [x] Stripe subscriptions (£1.50 / £2.50 / £6.00)
- [x] GitHub + CI
- [ ] **Production deploy** — see [DEPLOY.md](./DEPLOY.md) (Render + Vercel)
- [ ] Phase 2: GPS directory, water parameters, uploads, multi-species

## Demo logins

| Role | Email | Password |
|------|-------|----------|
| Member | `logunsina@yahoo.com` | `demo1234` |
| Admin | `admin@fishmaster.app` | `admin1234` |

## Key design decisions

See [ARCHITECTURE.md](./ARCHITECTURE.md) · Mobile: [apps/mobile/MOBILE.md](./apps/mobile/MOBILE.md) · Deploy: [DEPLOY.md](./DEPLOY.md) · Stripe: [STRIPE.md](./STRIPE.md)

## Excel reference

Calculations are ported from `App Fishmaster.xlsx` (59 sheets). The engine is tested against the sample farm fixture (AYOOLUWA OGUNSINA, pond 12, 2500 fish).
