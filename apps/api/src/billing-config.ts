import Stripe from 'stripe';
import type { SubscriptionTier } from '@fishmaster/db';

export const PLANS: Record<
  SubscriptionTier,
  { label: string; priceGbp: number; amountPence: number; features: string[] }
> = {
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

/** ISO 3166-1 alpha-2 guesses from free-text country fields on farms/users. */
export function countryToIso(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const s = raw.trim().toLowerCase();
  if (s.length === 2) return s.toUpperCase();
  const map: Record<string, string> = {
    nigeria: 'NG',
    'united kingdom': 'GB',
    uk: 'GB',
    britain: 'GB',
    england: 'GB',
    ghana: 'GH',
    kenya: 'KE',
    'south africa': 'ZA',
    uganda: 'UG',
    tanzania: 'TZ',
    cameroon: 'CM',
    'ivory coast': 'CI',
    "cote d'ivoire": 'CI',
    senegal: 'SN',
    egypt: 'EG',
    usa: 'US',
    'united states': 'US',
    'united states of america': 'US',
    canada: 'CA',
    india: 'IN',
    china: 'CN',
    australia: 'AU',
  };
  return map[s];
}

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key);
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export const WEB_URL = (process.env.WEB_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

export const CONTENT_TYPES = ['advert', 'article', 'education', 'information', 'picture', 'video'] as const;
export type AdminContentType = (typeof CONTENT_TYPES)[number];
