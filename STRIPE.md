# Stripe setup (test → live)

Fishmaster prices are defined in **GBP**. Checkout uses Stripe **Adaptive Pricing** so members (e.g. in Nigeria) see an equivalent local amount when Stripe supports that market. You still settle in GBP.

## 1. Stripe account

1. Create / open [stripe.com](https://stripe.com) (UK bank for GBP payouts is fine).
2. Stay in **Test mode** until a full payment + webhook works.
3. Copy **Secret key** from [API keys](https://dashboard.stripe.com/test/apikeys) → `sk_test_...`

## 2. Adaptive Pricing

1. Open [Adaptive Pricing settings](https://dashboard.stripe.com/settings/adaptive-pricing) (test mode first).
2. Turn **Adaptive Pricing** **on**.
3. Keep GBP as a settlement / presentment base currency.

## 3. Render environment

Render → **fishmaster-api** → **Environment**:

| Key | Value |
|-----|--------|
| `STRIPE_SECRET_KEY` | `sk_test_...` (later `sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | from step 4 (`whsec_...`) |
| `WEB_URL` | `https://olanr.vercel.app` (must match the live site) |

Save so the API redeploys.

## 4. Webhook (production API)

1. Stripe → **Developers** → **Webhooks** → **Add endpoint**.
2. URL: `https://fishmaster-api.onrender.com/api/billing/webhook`
3. Events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy **Signing secret** → Render `STRIPE_WEBHOOK_SECRET`.

## 5. Smoke test

1. Sign in on https://olanr.vercel.app
2. Open **Plans** → Subscribe (use [test card](https://docs.stripe.com/testing) `4242 4242 4242 4242`).
3. Confirm Checkout shows a **local currency** when your Stripe Adaptive Pricing + location allow it.
4. After success, member `subscriptionStatus` should be `active` (webhook).

## Local (optional)

```powershell
stripe listen --forward-to localhost:3001/api/billing/webhook
```

Put the CLI `whsec_...` in local `.env` as `STRIPE_WEBHOOK_SECRET`.

## Plans (reference GBP)

| Tier | Label | GBP / month |
|------|-------|-------------|
| `basic` | Fishmaster Lite | £26.50 |
| `standard` | Fishmaster Plus | £28.50 |
| `premium` | Fishmaster Max | £30.00 |
