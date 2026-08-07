import Stripe from 'stripe';
import type { SubscriptionTier } from '@fishmaster/db';

export const PLANS: Record<SubscriptionTier, { label: string; priceGbp: number; amountPence: number; features: string[] }> = {
  basic: {
    label: 'Fishmaster Lite',
    priceGbp: 26.5,
    amountPence: 2650,
    features: [
      'All 21 pond reports included',
      'Daily feed chart & mortality logging',
      'Adverts, articles, pictures & videos',
    ],
  },
  standard: {
    label: 'Fishmaster Plus',
    priceGbp: 28.5,
    amountPence: 2850,
    features: [
      'Everything in Lite',
      'Under/overfeeding alerts',
      'Water quality advisories',
    ],
  },
  premium: {
    label: 'Fishmaster Max',
    priceGbp: 30,
    amountPence: 3000,
    features: [
      'Everything in Plus',
      'Priority support',
      'Admin-coordinated pond reports',
    ],
  },
};

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export const WEB_URL = process.env.WEB_URL ?? 'http://localhost:3000';

export const CONTENT_TYPES = ['advert', 'article', 'education', 'information', 'picture', 'video'] as const;
export type AdminContentType = (typeof CONTENT_TYPES)[number];
