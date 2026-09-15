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

  // Adaptive Pricing localizes the presentment currency (e.g. NGN) while the
  // Price stays GBP for settlement. Requires Adaptive Pricing enabled in Stripe.
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    locale: 'auto',
    billing_address_collection: 'auto',
    customer_update: { address: 'auto', name: 'auto' },
    line_items: [{
      price_data: {
        currency: 'gbp',
        unit_amount: plan.amountPence,
        recurring: { interval: 'month' },
        product_data: {
          name: `Fishmaster ${plan.label}`,
          description: 'Monthly aquaculture subscription · local currency at checkout when available',
        },
      },
      quantity: 1,
    }],
    adaptive_pricing: { enabled: true },
    success_url: `${WEB_URL}/subscribe/success?tier=${tier}`,
    cancel_url: `${WEB_URL}/subscribe?cancelled=1`,
    metadata: { userId: user.id, tier },
    subscription_data: {
      metadata: { userId: user.id, tier },
    },
  } as Parameters<typeof stripe.checkout.sessions.create>[0]);

  res.json({ url: session.url });
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

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    res.status(400).json({ error: `Webhook error: ${err}` });
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as {
      metadata?: { userId?: string; tier?: string };
      subscription?: string | { id?: string } | null;
    };
    const userId = session.metadata?.userId;
    const tier = session.metadata?.tier as SubscriptionTier | undefined;
    const subId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;
    if (userId && tier) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: tier,
          subscriptionStatus: 'active',
          ...(subId ? { stripeSubscriptionId: subId } : {}),
        },
      });
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as {
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
      await prisma.user.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: {
          subscriptionStatus: status,
          ...(sub.metadata?.tier
            ? { subscriptionTier: sub.metadata.tier as SubscriptionTier }
            : {}),
        },
      });
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as { id: string };
    await prisma.user.updateMany({
      where: { stripeSubscriptionId: sub.id },
      data: { subscriptionStatus: 'cancelled' },
    });
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as { subscription?: string | { id?: string } | null };
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

  res.json({ received: true });
}
