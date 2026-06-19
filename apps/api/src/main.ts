import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { generateStockCycleReport, detectFeedAlert, dayInCultureCycle } from '@fishmaster/calc-engine';
import type { StockCycleInput } from '@fishmaster/shared-types';
import { cyclesRouter } from './cycles';
import { authRouter } from './auth';
import { adminRouter } from './admin';
import { contentRouter } from './content';
import { billingRouter, handleStripeWebhook } from './billing';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());

// Stripe webhook needs raw body — must be before express.json()
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(express.json());

app.get('/health', async (_req, res) => {
  try {
    const { prisma } = await import('@fishmaster/db');
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', service: 'fishmaster-api', database: true });
  } catch {
    res.status(503).json({ status: 'degraded', service: 'fishmaster-api', database: false });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/content', contentRouter);
app.use('/api/billing', billingRouter);
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

app.listen(PORT, () => {
  console.log(`Fishmaster API running on http://localhost:${PORT}`);
});
