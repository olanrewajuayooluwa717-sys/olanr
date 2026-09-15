import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { generateStockCycleReport, detectFeedAlert, dayInCultureCycle } from '@fishmaster/calc-engine';
import type { StockCycleInput } from '@fishmaster/shared-types';
import { config, validateConfig, isAllowedCorsOrigin } from './config';
import { cyclesRouter } from './cycles';
import { authRouter } from './auth';
import { adminRouter } from './admin';
import { contentRouter } from './content';
import { messagesRouter } from './messages';
import { billingRouter, handleStripeWebhook } from './billing';
import { marketplaceRouter } from './marketplace';
import { uploadsDir } from './uploads';

validateConfig();

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

app.use('/uploads', express.static(uploadsDir, {
  maxAge: '7d',
  setHeaders(res) {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  },
}));

app.use(
  cors({
    origin: config.isProduction
      ? (origin, callback) => {
          callback(null, isAllowedCorsOrigin(origin));
        }
      : true,
    credentials: true,
  }),
);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts — try again later' },
});

// Stripe webhook needs raw body — must be before express.json()
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(express.json({ limit: '2mb' }));

app.get('/', (_req, res) => {
  res.json({
    service: 'fishmaster-api',
    message: config.isProduction
      ? 'API is running.'
      : `API is running. Use the web app at ${config.webUrl}.`,
    webUrl: config.webUrl,
    health: '/health',
  });
});

app.get('/health', async (_req, res) => {
  try {
    const { prisma } = await import('@fishmaster/db');
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', service: 'fishmaster-api', database: true });
  } catch {
    res.status(503).json({ status: 'degraded', service: 'fishmaster-api', database: false });
  }
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/content', contentRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/billing', billingRouter);
app.use('/api/marketplace', marketplaceRouter);
app.use('/api/cycles', cyclesRouter);

/** POST /api/reports/stock-cycle — run engine from raw JSON (no DB) */
app.post('/api/reports/stock-cycle', (req, res) => {
  try {
    const input = req.body as StockCycleInput;
    input.stockingDate = new Date(input.stockingDate);
    if (input.dailyMortality) {
      input.dailyMortality = input.dailyMortality.map((m) => ({
        ...m,
        date: new Date(m.date),
      }));
    }
    const report = generateStockCycleReport(input);
    res.json(report);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

app.post('/api/alerts/feeding', (req, res) => {
  const { expectedKg, actualKg } = req.body as { expectedKg: number; actualKg: number };
  res.json(detectFeedAlert(expectedKg, actualKg));
});

app.get('/api/pond/day-in-cycle', (req, res) => {
  const stockingDate = new Date(String(req.query.stockingDate));
  const today = req.query.today ? new Date(String(req.query.today)) : new Date();
  res.json({ dayInCycle: dayInCultureCycle(stockingDate, today) });
});

app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  const tooLarge = err && typeof err === 'object' && (
    ('type' in err && (err as { type?: string }).type === 'entity.too.large')
    || ('status' in err && (err as { status?: number }).status === 413)
  );
  if (tooLarge) {
    res.status(413).json({
      error: 'That file is too large to paste. Use the file picker on the Videos tab (MP4, WebM, or MOV, max 80 MB).',
    });
    return;
  }
  next(err);
});

app.listen(config.port, '0.0.0.0', () => {
  console.log(`Fishmaster API running on port ${config.port} (${config.nodeEnv})`);
});
