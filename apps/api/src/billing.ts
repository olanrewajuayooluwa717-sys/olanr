import { Router, Request, Response } from 'express';
import { prisma } from '@fishmaster/db';
import type { SubscriptionTier } from '@fishmaster/db';
import { requireAuth } from './auth-middleware';
import { getStripe, PLANS, WEB_URL } from './billing-config';

export const billingRouter = Router();

/** GET /api/billing/plans */
billingRouter.get('/plans', (_req, res) => {
  res.json(
    Object.entries(PLANS).map(([id, plan]) => ({
      id,
      label: plan.label,
      priceGbp: plan.priceGbp,
      features: plan.features,
    })),
  );
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
  });
});

/** POST /api/billing/checkout */
billingRouter.post('/checkout', requireAuth, async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    res.status(503).json({ error: 'Stripe not configured — add STRIPE_SECRET_KEY to .env' });
    return;
  }

  const tier = req.body.tier as SubscriptionTier;
  const plan = PLANS[tier];
  if (!plan) {
    res.status(400).json({ error: 'Invalid tier' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{
      price_data: {
        currency: 'gbp',
        unit_amount: plan.amountPence,
        recurring: { interval: 'month' },
        product_data: { name: `Fishmaster ${plan.label}` },
      },
      quantity: 1,
    }],
    success_url: `${WEB_URL}/subscribe/success?tier=${tier}`,
    cancel_url: `${WEB_URL}/subscribe?cancelled=1`,
    metadata: { userId: user.id, tier },
  });

  res.json({ url: session.url });
});

/** Stripe webhook — mounted with raw body in main.ts */
export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
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
    const session = event.data.object as { metadata?: { userId?: string; tier?: string }; subscription?: string };
    const userId = session.metadata?.userId;
    const tier = session.metadata?.tier as SubscriptionTier | undefined;
    if (userId && tier) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: tier,
          subscriptionStatus: 'active',
          stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : undefined,
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
    const invoice = event.data.object as { subscription?: string };
    if (invoice.subscription) {
      await prisma.user.updateMany({
        where: { stripeSubscriptionId: String(invoice.subscription) },
        data: { subscriptionStatus: 'suspended' },
      });
    }
  }

  res.json({ received: true });
}
