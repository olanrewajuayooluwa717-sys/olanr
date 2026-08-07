# Fishmaster build checklist

Last updated: 2026-08-07

**Overall:** Core platform ~**94%** · Your full product spec ~**82%**

---

## A. Admin backend — broadcast to all members

| Item | Status | Notes |
|------|--------|-------|
| Admin “Send to all” UI | ✅ Done | Web → `/admin` → **Broadcasts** |
| Adverts | ✅ Done | All members see on home + content feed |
| Articles | ✅ Done | |
| Information | ✅ Done | |
| Pictures | ✅ Done | Image URL field |
| Videos | ✅ Done | Video URL field |
| Delete published posts | ✅ Done | |
| Edit published posts | ✅ Done | Inline edit on Send to all tab |
| Sample advert in seed | ✅ Done | After `db:seed` |

---

## B. Admin — per-member / per-pond reports

| Item | Status | Notes |
|------|--------|-------|
| Send message to one member | ✅ Done | **Messages** section |
| Link to report 1–21 | ✅ Done | Optional dropdown |
| Select specific pond | ✅ Done | Loads member’s ponds |
| Member inbox (web) | ✅ Done | `/messages` |
| Member inbox (mobile) | ✅ Done | Account → Messages |
| Feed brands per pond | ✅ Done | Config → Feed brands tab |
| Farm GPS in members list | ✅ Done | Coords + Google Maps link |
| Member detail (Overview / Ponds / Stocks / Economics) | ✅ Done | Click row in Members |
| Staff create (manager) | ✅ Done | Super admin only |
| Global ingredients + FCR config | ✅ Done | Config tabs |
| Marketplace CRUD | ✅ Done | Products + categories |

---

## C. All 21 reports (free with subscription)

| # | Report | Engine | Web UI | Mobile UI | Home icon |
|---|--------|--------|--------|-----------|-----------|
| 1–21 | All reports | ✅ | ✅ | ✅ | ✅ |
| Free with subscription (no per-report pay) | ✅ | Copy on reports page + home grid |
| Deep-link to report # | ✅ Web | ✅ Mobile | Tap icon → scroll to section |
| Paywall removed | ✅ | No tier gating on reports |

---

## D. Homepage icon grid (content + reports)

| Item | Status | Notes |
|------|--------|-------|
| Content icons (5 types) | ✅ Done | Web + mobile |
| Report icons (21) | ✅ Done | Web + mobile |
| Adverts preview on mobile home | ✅ Done | Latest 2 adverts |
| Content feed pages | ✅ Done | `/content/[type]` web + mobile |

---

## E. Subscriptions

| Plan | Price | Status |
|------|-------|--------|
| Fishmaster Lite | £26.50/mo | ✅ In code |
| Fishmaster Plus | £28.50/mo | ✅ In code |
| Fishmaster Max | £30.00/mo | ✅ In code |
| Stripe checkout (web) | ✅ Done | Needs live Stripe keys |
| Subscribe (mobile) | ✅ Done | Opens Stripe in browser |
| Production Render API | ⚠️ Stale | Old prices until redeploy |

---

## F. Registration (worldwide + dropdowns)

| Section | Status | Notes |
|---------|--------|-------|
| Personal: name, surname, gender, age, email, phone | ✅ Done | Web + mobile (3-step) |
| Address: postcode, LGA, state, country | ✅ Done | Country free text — worldwide |
| Farm: name, phone, address, postcode, size, LGA, state, country | ✅ Done | |
| Farm GPS (lat/lng optional) | ✅ Done | Web + mobile registration |
| Pond: type, name, number, dimensions | ✅ Done | Dropdown pond types |
| Culture system (intensive / semi / extensive) | ✅ Done | Dropdown |
| Feed: name, type, maker, bags, crude protein | ✅ Done | |
| Fish stock: species, qty, avg weight, stocking date, sales date | ✅ Done | |
| Pond water data | ✅ Done | Registration + daily log |
| Fish mortality (registration) | ⚠️ Partial | Daily log post-registration |
| Fish sales | ✅ Done | Web + mobile Daily log |
| Daily power (elec/diesel/petrol/solar) | ✅ Done | Web + mobile Daily log |
| Feed brand & cost per month | ✅ Done | Admin Config + seed |
| Homepage widgets | ✅ Done | Day-in-culture, feed, weight, FCR, costs |
| DB schema for new fields | ✅ Done | Run `db:push` after schema changes |
| Forgot password stub | ✅ Done | `/forgot-password` — contact admin |
| Public marketplace browse | ✅ Done | `/marketplace` |

---

## G. Member daily operations

| Item | Status | Notes |
|------|--------|-------|
| Daily mortality log | ✅ Done | Web home + mobile Daily log |
| Daily feed log + alerts | ✅ Done | Under/overfeeding |
| Water quality log + advisories | ✅ Done | Phase 2 |
| Multi-pond switcher | ✅ Done | Web + mobile home |
| Day-in-culture on homepage | ✅ Done | Dashboard widget |
| Expected vs actual weight | ✅ Done | Dashboard + weight sample log |
| Yesterday/today feed widget | ✅ Done | Expected + actual feed today |
| FCR + feeding cost on dashboard | ✅ Done | FCR, month-1 cost, cumulative feed cost |
| Water cleaning schedule | ✅ Done | Every 14 days — dashboard widget |
| Daily operations chart | ✅ Done | Medication, grading, net wash, etc. |

---

## H. Economics & Excel parity

| Item | Status | Notes |
|------|--------|-------|
| Calc engine (21 reports) | ✅ Done | Tested vs Excel sample |
| Feed brand & cost per month | ✅ Done | Admin + seed + dashboard |
| Cumulative feed cost from logs | ✅ Done | Uses brand cost per bag |
| Combined economics summary | ✅ Done | `/economics` web + mobile screen |
| Power cost estimate | ✅ Done | From daily power logs × configurable rates |
| Misc costs (salary, transport, etc.) | ✅ Done | MiscCostLog + add form on economics page |
| Feed ingredient cost matrix | ✅ Done | 25 legacy global ingredients + cycle costs |
| Global FCR month config | ✅ Done | Admin Config → FCR months |
| Sales & customer tracking | ✅ Done | Sales history on economics page |

---

## I. Platform & deploy

| Item | Status | Notes |
|------|--------|-------|
| Express API + JWT + RBAC | ✅ Done | Helmet, CORS, rate limiting in prod |
| PostgreSQL (Neon) | ✅ Done | Render Postgres also supported |
| Next.js web app | ✅ Done | Vercel — `apps/web/vercel.json` |
| Expo mobile app | ✅ Done | SDK 54 · EAS profiles in `eas.json` |
| GitHub + CI | ✅ Done | `ci.yml` + `production-verify.yml` |
| Render + Vercel configs | ✅ Updated | Economics env vars, Neon option documented |
| Production docs | ✅ Done | `DEPLOY.md`, `PRODUCTION_CHECKLIST.md`, `SECURITY.md` |
| Production redeploy | ⚠️ Pending | API stale vs local — follow DEPLOY.md |
| WebSocket push | ❌ Not yet | |
| GPS farm directory | ✅ Done | Admin members list + optional registration coords |
| Member photo/video upload + approval | ❌ Not yet | |
| Content edit in admin | ✅ Done | PATCH + inline edit UI |

---

## J. How to test locally

```powershell
# Terminal 1
cd C:\Users\olanr\Projects\fishmaster
npm.cmd run dev:api

# Terminal 2
npm.cmd run dev:web
# Use the port shown (e.g. http://localhost:3002)
```

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@fishmaster.app | admin1234 |
| Member | logunsina@yahoo.com | demo1234 |

**Admin panel:** `/admin` (login first at `/login`)

**Economics:** `/economics` (member login) — combined summary, sales history, ingredient costs

**Marketplace:** `/marketplace` — public active listings

**Admin Config:** `/admin?section=config` — Ingredients | FCR | Feed brands

---

## Recommended next steps (priority order)

1. **Deploy** — Follow [DEPLOY.md](../DEPLOY.md) and [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) to redeploy Render API + Vercel web
2. **Mobile EAS** — Run preview build, test against production API
3. **Member media upload** — Photo/video with admin approval
4. **WebSocket push** — Real-time broadcasts and messages
5. **Self-serve password reset** — Replace contact-admin stub when email provider is ready
