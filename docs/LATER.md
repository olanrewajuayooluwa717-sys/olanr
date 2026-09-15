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

## Ops

- [ ] **Stripe subscriptions go-live** — Adaptive Pricing is in the API. Add `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` on Render, enable Adaptive Pricing in Stripe, run one test Checkout. Details: [STRIPE.md](../STRIPE.md).
- [ ] Custom domains (`fishmaster.ng` / `api.fishmaster.ng`) when DNS is ready.
