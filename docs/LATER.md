# Things to do later

Deferred product work — not blocking the current Render + Vercel launch.

## Auth & email

- [ ] **Email verify-before-login** — send a one-time link after registration; block sign-in until the address is confirmed. Welcome mail already exists; wire `RESEND_API_KEY` / `MAIL_FROM` on Render first so mail actually delivers.
- [ ] **Password reset / invite** for imported members (no `passwordHash` yet).

## Data

- [ ] Copy ponds / stocks / wallet detail from the legacy admin beyond the users list import.

## Global use (world-wide members)

The product will be used outside Nigeria. Keep this in mind for later work:

- [x] **Payments presentment** — Checkout uses Stripe Adaptive Pricing (GBP reference, local currency when Stripe supports it). Remaining: turn on Adaptive Pricing in Stripe dashboard + keys on Render (see Ops).
- [ ] **Locale** — dates, numbers, and phone/country already partly supported; add clearer locale defaults (timezone from farm country, currency display on marketplace).
- [ ] **Hosting** — Vercel is `lhr1` (London) and Render is US-east-ish; revisit edge/region if Asia/LatAm latency becomes an issue.
- [ ] **Content & support** — broadcasts and help copy may need language variants later; English-first is fine for launch.
- [ ] **Compliance** — privacy/terms and tax/VAT rules as paid subscriptions expand beyond one market.

## Mobile stores (primary surface)

Fishmaster is primarily an **app**. Web (Vercel) is fine for admin + desktop; members should get Play Store / App Store builds via Expo EAS (`apps/mobile`).

- [ ] **Expo / EAS setup** — replace `extra.eas.projectId` and `owner` in `apps/mobile/app.json`; `eas init` + `eas login`.
- [ ] **Production API in builds** — already set in `eas.json` to `https://fishmaster-api.onrender.com` (switch to `api.fishmaster.ng` when DNS is ready).
- [ ] **Google Play** — Google Play Console account, store listing (logo, screenshots, privacy policy URL), internal testing track → production. Usually first; Android is the bigger farmer audience in Nigeria/Africa.
- [ ] **Apple App Store** — Apple Developer Program ($99/yr), App Store Connect listing, privacy nutrition labels, TestFlight then submit. Needs a Mac (or EAS) for iOS builds.
- [ ] **Store assets** — use official Fishmaster logo; privacy policy + terms pages on the web site before submit.
- [ ] **IAP note** — subscriptions today go through Stripe Checkout in-app/browser. Apple may require Apple IAP for digital subscriptions on iOS; decide before App Store submit (Play is more flexible with web billing in many cases — confirm current policies).

## Ops

- [ ] **Stripe subscriptions go-live** — Adaptive Pricing is in the API. Add `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` on Render, enable Adaptive Pricing in Stripe, run one test Checkout. Details: [STRIPE.md](../STRIPE.md).
- [ ] Custom domains (`fishmaster.ng` / `api.fishmaster.ng`) when DNS is ready.
- [ ] **Never rotate `JWT_SECRET` on Render after users are live.** Regenerating it invalidates every session: devices still look logged in, but `/api/content` returns 401 and articles appear empty until people sign in again.
