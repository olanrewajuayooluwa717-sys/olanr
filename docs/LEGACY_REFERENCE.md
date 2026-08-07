# Legacy admin reference (`admin.fishmaster.ng`)

**Status:** Inspiration only — do **not** connect to, log into, or depend on the live legacy stack.

The user confirmed we cannot access the legacy admin reliably. All feature and data requirements come from:

- The user's written spec (registration fields, content types, reports, subscriptions)
- `App Fishmaster.xlsx` (59 sheets) and calc-engine parity
- Notes captured below from earlier discovery (no ongoing legacy API use)

## Do not use for development

| Legacy URL | Action |
|------------|--------|
| https://admin.fishmaster.ng | Do not automate login or scrape |
| https://api.fishmaster.ng | Do not point monorepo clients here |
| https://socket.fishmaster.ng | Not in scope until we build our own realtime |

Build and deploy **only** the monorepo: Express API + Prisma + web + mobile.

## Reference sources (in-repo only)

| Source | Use |
|--------|-----|
| Excel workbook | Formulas, registration fields, 21 reports |
| User spec (2026) | Global registration, content types, subscriptions |
| This doc | Gap list and build phases |

### Already at parity (monorepo)

- All 21 pond reports (calc-engine + dashboards)
- Daily mortality & feed logging + under/overfeeding alerts
- Water parameter logging with advisories
- Admin broadcast (adverts, articles, info, pictures, videos)
- Per-member messages linked to report numbers
- Member suspend / role management
- Stripe monthly subscriptions
- Combined economics summary (feed + power + misc + sales P/L)
- Sales history with customer names
- Feed ingredient cost matrix (scaffold — 10 common ingredients)
- GPS farm directory (optional lat/lng on registration, admin members list)
- Daily operations chart, actual weight sampling, pond cleaning schedule

### Missing or partial (to build)

**Registration & profile**

- Fish mortality at registration (daily log covers post-registration)

**Operations & economics (Excel Combined Summary)**

- Full 30+ ingredient cost matrix (scaffold in place)

**Admin & platform**

- WebSocket push for broadcasts/messages
- Manager permission granularity
- Member photo/video upload with approval

## Implementation phases

| Phase | Focus | Status |
|-------|--------|--------|
| 1 | Registration field parity + multi-pond selection | ✅ Done |
| 2 | Feed brand/cost model → feeding cost on dashboard | ✅ Done |
| 3 | Homepage widgets (expected vs actual) | ✅ Done |
| 4 | Economics logs (power, sales, ops chart, combined summary) | ✅ Done |
| 5 | WebSockets + media uploads + farm directory | Partial — GPS done; WebSockets & media TBD |
