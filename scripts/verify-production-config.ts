/**
 * Lightweight production config validator — no secrets required.
 * Run: npx tsx scripts/verify-production-config.ts
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');

type Check = { name: string; ok: boolean; detail?: string };

const checks: Check[] = [];

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(root, relativePath));
}

function readJson(relativePath: string): Record<string, unknown> | null {
  const full = path.join(root, relativePath);
  if (!fs.existsSync(full)) return null;
  return JSON.parse(fs.readFileSync(full, 'utf8')) as Record<string, unknown>;
}

function readText(relativePath: string): string | null {
  const full = path.join(root, relativePath);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, 'utf8');
}

// Required files
const requiredFiles = [
  'render.yaml',
  'DEPLOY.md',
  'docs/PRODUCTION_CHECKLIST.md',
  'docs/SECURITY.md',
  '.env.example',
  'apps/web/vercel.json',
  'apps/web/.env.production.example',
  'apps/mobile/eas.json',
  'apps/mobile/app.json',
  'apps/mobile/.env.example',
  'apps/api/src/config.ts',
];

for (const f of requiredFiles) {
  checks.push({ name: `file: ${f}`, ok: fileExists(f) });
}

// render.yaml env keys
const renderYaml = readText('render.yaml') ?? '';
const renderEnvKeys = [
  'NODE_ENV',
  'JWT_SECRET',
  'WEB_URL',
  'CORS_ORIGINS',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'ELECTRICITY_RATE_NGN',
  'DIESEL_RATE_NGN',
  'PETROL_RATE_NGN',
  'SEED_ON_DEPLOY',
  'DATABASE_URL',
];
for (const key of renderEnvKeys) {
  checks.push({
    name: `render.yaml env: ${key}`,
    ok: renderYaml.includes(key),
  });
}

// API dependencies
const apiPkg = readJson('apps/api/package.json');
checks.push({
  name: 'api: helmet dependency',
  ok: Boolean((apiPkg?.dependencies as Record<string, string>)?.helmet),
});
checks.push({
  name: 'api: express-rate-limit dependency',
  ok: Boolean((apiPkg?.dependencies as Record<string, string>)?.['express-rate-limit']),
});

// eas.json profiles
const eas = readJson('apps/mobile/eas.json');
const build = eas?.build as Record<string, unknown> | undefined;
for (const profile of ['development', 'preview', 'production']) {
  checks.push({
    name: `eas.json profile: ${profile}`,
    ok: Boolean(build?.[profile]),
  });
}

// Root build scripts
const rootPkg = readJson('package.json');
const scripts = (rootPkg?.scripts ?? {}) as Record<string, string>;
checks.push({ name: 'script: build:api', ok: Boolean(scripts['build:api']) });
checks.push({ name: 'script: start:api', ok: Boolean(scripts['start:api']) });

// .env.example coverage
const envExample = readText('.env.example') ?? '';
for (const key of [
  'JWT_SECRET',
  'DATABASE_URL',
  'WEB_URL',
  'CORS_ORIGINS',
  'STRIPE_SECRET_KEY',
  'ELECTRICITY_RATE_NGN',
  'SEED_ON_DEPLOY',
  'NODE_ENV',
]) {
  checks.push({
    name: `.env.example: ${key}`,
    ok: envExample.includes(key),
  });
}

const failed = checks.filter((c) => !c.ok);

console.log('Fishmaster production config verification\n');
for (const c of checks) {
  console.log(`${c.ok ? '✓' : '✗'} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
}

console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);

if (failed.length > 0) {
  process.exit(1);
}
