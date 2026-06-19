import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '@fishmaster/db';
import { generateStockCycleReport, detectFeedAlert } from '@fishmaster/calc-engine';
import { toStockCycleInput } from './mappers';
import { requireAuth, signToken } from './auth-middleware';
import { routeParam } from './params';

export const cyclesRouter = Router();

const cycleInclude = {
  pond: { include: { farm: { include: { user: true } } } },
  mortalityLogs: true,
  feedLogs: true,
} as const;

/** GET /api/cycles/demo/report — seeded sample data */
cyclesRouter.get('/demo/report', async (_req, res) => {
  try {
    const cycle = await prisma.stockCycle.findFirst({
      include: cycleInclude,
      orderBy: { createdAt: 'asc' },
    });
    if (!cycle) {
      res.status(404).json({ error: 'No cycles — run npm run db:setup' });
      return;
    }
    const report = generateStockCycleReport(toStockCycleInput(cycle));
    res.json({ cycleId: cycle.id, pondName: cycle.pond.name, report });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

/** POST /api/cycles — register farm + pond + stock cycle */
cyclesRouter.post('/', async (req, res) => {
  try {
    const {
      userId,
      farmerName,
      email,
      farmName,
      location,
      city,
      state,
      country,
      pondName,
      pondNumber,
      lengthM,
      widthM,
      depthM,
      quantityStocked,
      averageWeightAtStockingG,
      fingerlingPrice,
      stockingDate,
      desiredCrudeProteinPct,
      desiredFeedQuantityKg,
      password,
    } = req.body;

    let user = userId
      ? await prisma.user.findUnique({ where: { id: userId } })
      : email
        ? await prisma.user.findUnique({ where: { email } })
        : null;

    if (!user && email) {
      const passwordHash = password ? await bcrypt.hash(String(password), 10) : null;
      user = await prisma.user.create({
        data: { email, name: farmerName ?? email, role: 'member', passwordHash },
      });
    } else if (user && password && !user.passwordHash) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await bcrypt.hash(String(password), 10) },
      });
    }
    if (!user) {
      res.status(400).json({ error: 'userId or email required' });
      return;
    }

    const farm = await prisma.farm.create({
      data: {
        userId: user.id,
        name: farmName,
        location,
        city,
        state,
        country,
        ponds: {
          create: {
            name: pondName,
            number: pondNumber,
            lengthM,
            widthM,
            depthM,
            cycles: {
              create: {
                quantityStocked,
                averageWeightAtStockingG,
                fingerlingPrice,
                stockingDate: new Date(stockingDate),
                desiredCrudeProteinPct,
                desiredFeedQuantityKg,
              },
            },
          },
        },
      },
      include: { ponds: { include: { cycles: true } } },
    });

    const cycle = farm.ponds[0]!.cycles[0]!;
    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    res.status(201).json({ farmId: farm.id, pondId: farm.ponds[0]!.id, cycleId: cycle.id, token, userId: user.id });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

/** GET /api/cycles/:id/report */
cyclesRouter.get('/:id/report', async (req, res) => {
  try {
    const id = routeParam(req, 'id');
    const cycle = await prisma.stockCycle.findUnique({
      where: { id },
      include: cycleInclude,
    });
    if (!cycle) {
      res.status(404).json({ error: 'Cycle not found' });
      return;
    }
    const report = generateStockCycleReport(toStockCycleInput(cycle));
    res.json({ cycleId: cycle.id, pondName: cycle.pond.name, report });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

/** POST /api/cycles/:id/mortality */
cyclesRouter.post('/:id/mortality', requireAuth, async (req, res) => {
  try {
    const id = routeParam(req, 'id');
    const { date, count } = req.body as { date: string; count: number };
    const log = await prisma.dailyMortalityLog.upsert({
      where: {
        stockCycleId_date: {
          stockCycleId: id,
          date: new Date(date),
        },
      },
      update: { count },
      create: { stockCycleId: id, date: new Date(date), count },
    });
    res.json(log);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

/** POST /api/cycles/:id/feed */
cyclesRouter.post('/:id/feed', requireAuth, async (req, res) => {
  try {
    const id = routeParam(req, 'id');
    const { date, actualKg } = req.body as { date: string; actualKg: number };
    const log = await prisma.dailyFeedLog.upsert({
      where: {
        stockCycleId_date: {
          stockCycleId: id,
          date: new Date(date),
        },
      },
      update: { actualKg },
      create: { stockCycleId: id, date: new Date(date), actualKg },
    });

    const cycle = await prisma.stockCycle.findUnique({
      where: { id },
      include: cycleInclude,
    });
    if (!cycle) {
      res.status(404).json({ error: 'Cycle not found' });
      return;
    }

    const input = toStockCycleInput(cycle);
    const report = generateStockCycleReport(input);
    const today = new Date(date);
    const dayIndex = report.dailyFeedCharts[0]?.findIndex(
      (r) => r.date.toDateString() === today.toDateString(),
    );
    const expectedKg =
      dayIndex !== undefined && dayIndex >= 0
        ? report.dailyFeedCharts[0][dayIndex].feedKg
        : 0;

    res.json({ log, alert: detectFeedAlert(expectedKg, actualKg) });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

/** GET /api/cycles — list cycles for logged-in user */
cyclesRouter.get('/', requireAuth, async (req, res) => {
  const cycles = await prisma.stockCycle.findMany({
    where: { pond: { farm: { userId: req.user!.userId } } },
    include: { pond: { include: { farm: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(cycles);
});
