const DEV_JWT_SECRET = 'fishmaster-dev-secret-change-in-prod';

export const isProduction = process.env.NODE_ENV === 'production';

function parseCorsOrigins(): string[] {
  const origins: string[] = [];
  const webUrl = process.env.WEB_URL?.trim();
  if (webUrl) origins.push(webUrl);
  const extra = process.env.CORS_ORIGINS;
  if (extra) {
    origins.push(...extra.split(',').map((s) => s.trim()).filter(Boolean));
  }
  return [...new Set(origins)];
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction,
  port: Number(process.env.PORT ?? 3001),
  jwtSecret: process.env.JWT_SECRET ?? DEV_JWT_SECRET,
  databaseUrl: process.env.DATABASE_URL ?? '',
  webUrl: process.env.WEB_URL ?? 'http://localhost:3000',
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
      console.warn('[config] WEB_URL is not set — CORS will only allow CORS_ORIGINS if configured');
    }
    if (config.corsOrigins.length === 0) {
      console.warn('[config] No CORS origins configured — set WEB_URL and/or CORS_ORIGINS');
    }
  } else if (config.jwtSecret === DEV_JWT_SECRET) {
    console.warn('[config] Using dev JWT_SECRET — set a strong secret before production deploy');
  }
}
