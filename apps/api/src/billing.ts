import { Router, Request, Response } from 'express';
import { prisma } from '@fishmaster/db';
import type { SubscriptionTier } from '@fishmaster/db';
import { requireAuth } from './auth-middleware';
import {
  countryToIso,
  getStripe,
  isStripeConfigured,
  PLANS,
  WEB_URL,
} from './billing-config';

export const billingRouter = Router();

/** GET /api/billing/plans */
billingRouter.get('/plans', (_req, res) => {
  res.json({
    presentment:
      'Prices are set in GBP. At checkout, Stripe Adaptive Pricing shows an equivalent amount in your local currency when available (for example ₦ in Nigeria).',
    settlementCurrency: 'gbp',
    stripeConfigured: isStripeConfigured(),
    plans: Object.entries(PLANS).map(([id, plan]) => ({
      id,
      label: plan.label,
      priceGbp: plan.priceGbp,
      features: plan.features,
    })),
  });
});

/** GET /api/billing/status */
billingRouter.get('/status', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({
    tier: user.subscriptionTier,
    status: user.subscriptionStatus,
    plan: PLANS[user.subscriptionTier],
    stripeConfigured: isStripeConfigured(),
  });
});

/** POST /api/billing/checkout */
billingRouter.post('/checkout', requireAuth, async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      res.status(503).json({
        error: 'Payments are not configured yet. Add STRIPE_SECRET_KEY on the API host (Render).',
      });
      return;
    }

    const tier = req.body.tier as SubscriptionTier;
    const plan = PLANS[tier];
    if (!plan) {
      res.status(400).json({ error: 'Invalid tier' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { farms: { take: 1, select: { country: true } } },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const country =
      countryToIso(user.farms[0]?.country) ||
      countryToIso(user.country) ||
      undefined;

    let customerId = user.stripeCustomerId;
    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
      } catch {
        // Stale id from an old Stripe account / test↔live switch — recreate.
        console.warn('[billing] clearing stale stripeCustomerId', customerId);
        customerId = null;
        await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: null } });
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id },
        ...(country ? { address: { country } } : {}),
      });
      customerId = customer.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    } else if (country) {
      try {
        await stripe.customers.update(customerId, { address: { country } });
      } catch {
        /* non-fatal — checkout still works */
      }
    }

    const baseSession = {
      mode: 'subscription' as const,
      customer: customerId,
      locale: 'auto' as const,
      billing_address_collection: 'auto' as const,
      customer_update: { address: 'auto' as const, name: 'auto' as const },
      line_items: [{
        price_data: {
          currency: 'gbp',
          unit_amount: plan.amountPence,
          recurring: { interval: 'month' as const },
          product_data: {
            name: `Fishmaster ${plan.label}`,
            description: 'Monthly aquaculture subscription · local currency at checkout when available',
          },
        },
        quantity: 1,
      }],
      success_url: `${WEB_URL}/subscribe/success?session_id={CHECKOUT_SESSION_ID}&tier=${tier}`,
      cancel_url: `${WEB_URL}/subscribe?cancelled=1`,
      metadata: { userId: user.id, tier },
      subscription_data: {
        metadata: { userId: user.id, tier },
      },
    };

    // Adaptive Pricing localizes presentment (e.g. NGN) while Price stays GBP.
    // If Stripe rejects it (not enabled on the account), fall back to GBP-only Checkout.
    let session;
    try {
      session = await stripe.checkout.sessions.create({
        ...baseSession,
        adaptive_pricing: { enabled: true },
      } as Parameters<typeof stripe.checkout.sessions.create>[0]);
    } catch (adaptiveErr) {
      console.warn('[billing] Adaptive Pricing checkout failed — retrying without it', adaptiveErr);
      session = await stripe.checkout.sessions.create(baseSession);
    }

    if (!session.url) {
      res.status(502).json({ error: 'Stripe did not return a checkout URL' });
      return;
    }
    res.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[billing] checkout failed', err);
    res.status(502).json({
      error: message.startsWith('Invalid API Key') || message.includes('Invalid API Key')
        ? 'Stripe secret key on Render looks invalid. Check STRIPE_SECRET_KEY (test mode).'
        : `Checkout failed: ${message}`,
    });
  }
});

/** POST /api/billing/confirm — activate from Checkout session id (webhook backup). */
billingRouter.post('/confirm', requireAuth, async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      res.status(503).json({ error: 'Payments are not configured yet.' });
      return;
    }
    const sessionId = String(req.body.sessionId ?? '').trim();
    if (!sessionId.startsWith('cs_')) {
      res.status(400).json({ error: 'Missing checkout session id' });
      return;
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      res.status(400).json({ error: 'Checkout is not complete yet' });
      return;
    }

    const userId = session.metadata?.userId;
    const tier = session.metadata?.tier as SubscriptionTier | undefined;
    if (!userId || userId !== req.user!.userId) {
      res.status(403).json({ error: 'This checkout belongs to a different account' });
      return;
    }
    if (!tier || !PLANS[tier]) {
      res.status(400).json({ error: 'Checkout is missing plan metadata' });
      return;
    }

    const subId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription && typeof session.subscription === 'object'
          ? (session.subscription as { id?: string }).id
          : undefined;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: tier,
        subscriptionStatus: 'active',
        ...(subId ? { stripeSubscriptionId: subId } : {}),
        ...(typeof session.customer === 'string' ? { stripeCustomerId: session.customer } : {}),
      },
    });

    res.json({
      ok: true,
      tier: user.subscriptionTier,
      status: user.subscriptionStatus,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[billing] confirm failed', err);
    res.status(502).json({ error: `Could not confirm payment: ${message}` });
  }
});

/** Stripe webhook — mounted with raw body in main.ts */
export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !secret) {
    res.status(503).json({ error: 'Stripe webhook not configured' });
    return;
  }

  const sig = req.headers['stripe-signature'];
  if (!sig || typeof sig !== 'string') {
    res.status(400).json({ error: 'Missing signature' });
    return;
  }

  const rawBody = Buffer.isBuffer(req.body)
    ? req.body
    : typeof req.body === 'string'
      ? Buffer.from(req.body)
      : null;
  if (!rawBody) {
    console.error('[billing] webhook body is not raw — signature check will fail');
    res.status(400).json({
      error: 'Webhook body was parsed as JSON. Endpoint must use the raw body (hit Render URL, not Vercel).',
    });
    return;
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[billing] webhook signature failed', message);
    res.status(400).json({
      error: `Webhook signature mismatch. Re-copy Signing secret from Stripe → Webhooks into Render STRIPE_WEBHOOK_SECRET. (${message})`,
    });
    return;
  }

  try {
    await applyStripeEvent(event.type, event.data.object);
  } catch (err) {
    console.error('[billing] webhook handler failed', err);
    res.status(500).json({ error: 'Webhook processing failed' });
    return;
  }

  res.json({ received: true });
}

async function applyStripeEvent(type: string, object: unknown): Promise<void> {
  if (type === 'checkout.session.completed') {
    const session = object as {
      metadata?: { userId?: string; tier?: string };
      subscription?: string | { id?: string } | null;
      customer?: string | { id?: string } | null;
    };
    const userId = session.metadata?.userId;
    const tier = session.metadata?.tier as SubscriptionTier | undefined;
    const subId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;
    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id;
    if (userId && tier) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: tier,
          subscriptionStatus: 'active',
          ...(subId ? { stripeSubscriptionId: subId } : {}),
          ...(customerId ? { stripeCustomerId: customerId } : {}),
        },
      });
    }
    return;
  }

  if (type === 'customer.subscription.updated') {
    const sub = object as {
      id: string;
      status: string;
      metadata?: { userId?: string; tier?: string };
    };
    const status =
      sub.status === 'active' || sub.status === 'trialing'
        ? 'active'
        : sub.status === 'past_due'
          ? 'suspended'
          : sub.status === 'canceled'
            ? 'cancelled'
            : undefined;
    if (status) {
      const updated = await prisma.user.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: {
          subscriptionStatus: status,
          ...(sub.metadata?.tier
            ? { subscriptionTier: sub.metadata.tier as SubscriptionTier }
            : {}),
        },
      });
      // First subscription.updated can arrive before checkout.session.completed wrote sub id.
      if (updated.count === 0 && sub.metadata?.userId) {
        await prisma.user.update({
          where: { id: sub.metadata.userId },
          data: {
            stripeSubscriptionId: sub.id,
            subscriptionStatus: status,
            ...(sub.metadata.tier
              ? { subscriptionTier: sub.metadata.tier as SubscriptionTier }
              : {}),
          },
        });
      }
    }
    return;
  }

  if (type === 'customer.subscription.deleted') {
    const sub = object as { id: string };
    await prisma.user.updateMany({
      where: { stripeSubscriptionId: sub.id },
      data: { subscriptionStatus: 'cancelled' },
    });
    return;
  }

  if (type === 'invoice.payment_failed') {
    const invoice = object as { subscription?: string | { id?: string } | null };
    const subId =
      typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id;
    if (subId) {
      await prisma.user.updateMany({
        where: { stripeSubscriptionId: subId },
        data: { subscriptionStatus: 'suspended' },
      });
    }
  }
}
