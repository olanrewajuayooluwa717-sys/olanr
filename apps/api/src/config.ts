const DEV_JWT_SECRET = 'fishmaster-dev-secret-change-in-prod';

export const isProduction = process.env.NODE_ENV === 'production';

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

function parseCorsOrigins(): string[] {
  const origins: string[] = [];
  const webUrl = process.env.WEB_URL?.trim();
  if (webUrl) origins.push(normalizeOrigin(webUrl));
  const extra = process.env.CORS_ORIGINS;
  if (extra) {
    origins.push(...extra.split(',').map((s) => normalizeOrigin(s)).filter(Boolean));
  }
  return [...new Set(origins)];
}

function hostnameOf(origin: string): string | null {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** True when the browser Origin is allowed to call this API. */
export function isAllowedCorsOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  const normalized = normalizeOrigin(origin);
  if (config.corsOrigins.includes(normalized)) return true;
  const host = hostnameOf(normalized);
  if (!host) return false;
  // Vercel production + preview URLs (olanr.vercel.app, *-meadowbrook1.vercel.app, …)
  if (host === 'olanr.vercel.app' || host.endsWith('.vercel.app')) return true;
  return false;
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction,
  port: Number(process.env.PORT ?? 3001),
  jwtSecret: process.env.JWT_SECRET ?? DEV_JWT_SECRET,
  databaseUrl: process.env.DATABASE_URL ?? '',
  webUrl: normalizeOrigin(process.env.WEB_URL ?? 'http://localhost:3000'),
  corsOrigins: parseCorsOrigins(),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  seedOnDeploy: process.env.SEED_ON_DEPLOY === 'true',
};

export function validateConfig(): void {
  if (isProduction) {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is required when NODE_ENV=production');
    }
    if (config.jwtSecret === DEV_JWT_SECRET) {
      throw new Error('JWT_SECRET must not use the dev default in production');
    }
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required when NODE_ENV=production');
    }
    if (!process.env.WEB_URL) {
      console.warn('[config] WEB_URL is not set — defaulting CORS to *.vercel.app plus CORS_ORIGINS');
    }
  } else if (config.jwtSecret === DEV_JWT_SECRET) {
    console.warn('[config] Using dev JWT_SECRET — set a strong secret before production deploy');
  }
}
