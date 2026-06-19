import Stripe from 'stripe';
import type { SubscriptionTier } from '@fishmaster/db';

export const PLANS: Record<SubscriptionTier, { label: string; priceGbp: number; amountPence: number; features: string[] }> = {
  basic: {
    label: 'Basic',
    priceGbp: 1.5,
    amountPence: 150,
    features: ['Daily pond dashboard', 'Daily feed chart', 'Mortality logging'],
  },
  standard: {
    label: 'Standard',
    priceGbp: 2.5,
    amountPence: 250,
    features: ['Everything in Basic', 'Weekly reports', 'Under/overfeeding alerts'],
  },
  premium: {
    label: 'Premium',
    priceGbp: 6.0,
    amountPence: 600,
    features: ['Everything in Standard', 'All 21 monthly reports', 'Priority support'],
  },
};

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export const WEB_URL = process.env.WEB_URL ?? 'http://localhost:3000';
