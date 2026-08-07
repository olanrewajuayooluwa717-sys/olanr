import { execSync } from 'node:child_process';

if (process.env.SEED_ON_DEPLOY === 'true') {
  console.log('[db] SEED_ON_DEPLOY=true — running seed');
  execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });
} else {
  console.log('[db] Skipping seed (set SEED_ON_DEPLOY=true to seed on deploy)');
}
