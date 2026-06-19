# Stripe setup (test mode)

1. Create account at [stripe.com](https://stripe.com) — no USD bank account needed; link your **UK bank** for GBP payouts.

2. Get test keys from [Stripe Dashboard → API keys](https://dashboard.stripe.com/test/apikeys)

3. Add to `.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

4. Local webhooks (install [Stripe CLI](https://stripe.com/docs/stripe-cli)):
   ```powershell
   stripe listen --forward-to localhost:3001/api/billing/webhook
   ```
   Copy the `whsec_...` secret into `.env`.

5. Test card: `4242 4242 4242 4242` · any future expiry · any CVC.

## Plans

| Tier | Price | ID |
|------|-------|-----|
| Basic | £1.50/mo | `basic` |
| Standard | £2.50/mo | `standard` |
| Premium | £6.00/mo | `premium` |

International farmers pay in local currency; Stripe converts and pays you in GBP.
