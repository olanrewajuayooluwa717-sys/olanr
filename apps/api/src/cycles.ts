import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '@fishmaster/db';
import { generateStockCycleReport, detectFeedAlert, dayInCultureCycle } from '@fishmaster/calc-engine';
import { toStockCycleInput } from './mappers';
import { requireAuth, signToken } from './auth-middleware';
import { routeParam } from './params';
import { evaluateWaterQuality } from './water-quality';
import { computeCumulativeFeedCost, computeEconomicsSummary } from './economics';
import { MISC_COST_CATEGORIES } from './economics-config';

export const cyclesRouter = Router();

const CLEANING_INTERVAL_DAYS = 14;

const cycleInclude = {
  pond: { include: { farm: { include: { user: true } } } },
  mortalityLogs: true,
  feedLogs: true,
  feedBrands: { orderBy: { month: 'asc' as const } },
  weightSamples: { orderBy: { date: 'desc' as const }, take: 1 },
} as const;

function pondCleaningSchedule(dayInCycle: number) {
  const dueToday = dayInCycle > 0 && dayInCycle % CLEANING_INTERVAL_DAYS === 0;
  const daysUntil = dueToday ? 0 : CLEANING_INTERVAL_DAYS - (dayInCycle % CLEANING_INTERVAL_DAYS);
  return {
    intervalDays: CLEANING_INTERVAL_DAYS,
    daysUntilNextCleaning: daysUntil,
    nextCleaningDayInCulture: dayInCycle + daysUntil,
    dueToday,
  };
}

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
      surname,
      gender,
      ageRange,
      phone,
      postcode,
      lga,
      email,
      farmName,
      farmPhone,
      location,
      farmPostcode,
      farmLga,
      farmSizeSqM,
      totalPonds,
      latitude,
      longitude,
      city,
      state,
      country,
      pondName,
      pondNumber,
      pondType,
      lengthM,
      widthM,
      depthM,
      fishSpecies,
      cultureSystem,
      quantityStocked,
      averageWeightAtStockingG,
      fingerlingPrice,
      stockingDate,
      proposedSalesDate,
      feedName,
      feedType,
      feedMaker,
      feedBags,
      desiredCrudeProteinPct,
      desiredFeedQuantityKg,
      waterSource,
      initialPh,
      initialDissolvedOxygenMgL,
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
        data: {
          email,
          name: farmerName ?? email,
          surname: surname ?? null,
          gender: gender ?? null,
          ageRange: ageRange ?? null,
          phone: phone ?? null,
          postcode: postcode ?? null,
          lga: lga ?? null,
          state: state ?? null,
          country: country ?? null,
          role: 'member',
          passwordHash,
        },
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
        phone: farmPhone ?? null,
        location,
        postcode: farmPostcode ?? null,
        lga: farmLga ?? null,
        sizeSqM: farmSizeSqM != null ? Number(farmSizeSqM) : null,
        totalPonds: totalPonds != null ? Number(totalPonds) : null,
        latitude: latitude != null ? Number(latitude) : null,
        longitude: longitude != null ? Number(longitude) : null,
        city,
        state,
        country,
        ponds: {
          create: {
            name: pondName,
            number: pondNumber,
            pondType: pondType ?? null,
            lengthM,
            widthM,
            depthM,
            cycles: {
              create: {
                fishSpecies: fishSpecies ?? null,
                cultureSystem: cultureSystem ?? null,
                quantityStocked,
                averageWeightAtStockingG,
                fingerlingPrice,
                stockingDate: new Date(stockingDate),
                proposedSalesDate: proposedSalesDate ? new Date(proposedSalesDate) : null,
                feedName: feedName ?? null,
                feedType: feedType ?? null,
                feedMaker: feedMaker ?? null,
                feedBags: feedBags != null ? Number(feedBags) : null,
                desiredCrudeProteinPct,
                desiredFeedQuantityKg,
                waterSource: waterSource ?? null,
                initialPh: initialPh != null ? Number(initialPh) : null,
                initialDissolvedOxygenMgL: initialDissolvedOxygenMgL != null ? Number(initialDissolvedOxygenMgL) : null,
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

/** GET /api/cycles/:id/dashboard — homepage widgets */
cyclesRouter.get('/:id/dashboard', async (req, res) => {
  try {
    const id = routeParam(req, 'id');
    const cycle = await prisma.stockCycle.findUnique({
      where: { id },
      include: {
        ...cycleInclude,
        weightSamples: { orderBy: { date: 'desc' }, take: 1 },
      },
    });
    if (!cycle) {
      res.status(404).json({ error: 'Cycle not found' });
      return;
    }
    const report = generateStockCycleReport(toStockCycleInput(cycle));
    const today = new Date();
    const dayInCycle = dayInCultureCycle(cycle.stockingDate, today);
    const allDays = report.dailyFeedCharts.flat();
    const todayRow = allDays.find((r) => r.date.toDateString() === today.toDateString());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayRow = allDays.find((r) => r.date.toDateString() === yesterday.toDateString());
    const m0 = report.monthlyProjections[0];
    const brand1 = cycle.feedBrands.find((b) => b.month === 1);
    const monthFeedCost = brand1 && m0 ? m0.monthlyFeedBags * brand1.costPerBag : null;
    const todayFeedLog = cycle.feedLogs.find((l) => l.date.toDateString() === today.toDateString());
    const totalActualFeedKg = cycle.feedLogs.reduce((sum, l) => sum + l.actualKg, 0);
    const cumulativeFeedCost = computeCumulativeFeedCost(
      cycle.feedLogs,
      cycle.feedBrands,
      cycle.stockingDate,
    );
    const cleaning = pondCleaningSchedule(dayInCycle);

    res.json({
      pondName: cycle.pond.name,
      dayInCulture: dayInCycle,
      monthName: today.toLocaleString('en', { month: 'long' }),
      cultureSystem: cycle.cultureSystem,
      fishSpecies: cycle.fishSpecies,
      todayExpectedFeedKg: todayRow?.feedKg ?? null,
      todayActualFeedKg: todayFeedLog?.actualKg ?? null,
      yesterdayExpectedFeedKg: yesterdayRow?.feedKg ?? null,
      todayMorningFeedKg: todayRow ? todayRow.feedKg * 0.9 : null,
      todayEveningFeedKg: todayRow ? todayRow.feedKg * 0.1 : null,
      expectedAvgWeightG: todayRow?.averageWeightG ?? null,
      actualAvgWeightG: cycle.weightSamples[0]?.averageWeightG ?? null,
      fishOnHand: todayRow?.presentQuantity ?? null,
      month1FeedBags: m0?.monthlyFeedBags ?? null,
      month1FeedCost: monthFeedCost,
      cumulativeFeedCost,
      totalActualFeedKg,
      averageFcr: report.averageFcr,
      feedBrands: cycle.feedBrands,
      pondCleaning: cleaning,
    });
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

/** GET /api/cycles/:id/water — recent water parameter logs */
cyclesRouter.get('/:id/water', requireAuth, async (req, res) => {
  try {
    const id = routeParam(req, 'id');
    const logs = await prisma.waterParameterLog.findMany({
      where: { stockCycleId: id },
      orderBy: { date: 'desc' },
      take: 30,
    });
    res.json(logs);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

/** POST /api/cycles/:id/water — log water quality with advisory alerts */
cyclesRouter.post('/:id/water', requireAuth, async (req, res) => {
  try {
    const id = routeParam(req, 'id');
    const { date, ph, dissolvedOxygenMgL, temperatureC, ammoniaMgL, notes } = req.body as {
      date: string;
      ph?: number;
      dissolvedOxygenMgL?: number;
      temperatureC?: number;
      ammoniaMgL?: number;
      notes?: string;
    };

    const log = await prisma.waterParameterLog.upsert({
      where: {
        stockCycleId_date: { stockCycleId: id, date: new Date(date) },
      },
      update: { ph, dissolvedOxygenMgL, temperatureC, ammoniaMgL, notes: notes ?? null },
      create: {
        stockCycleId: id,
        date: new Date(date),
        ph,
        dissolvedOxygenMgL,
        temperatureC,
        ammoniaMgL,
        notes: notes ?? null,
      },
    });

    const alerts = evaluateWaterQuality({ ph, dissolvedOxygenMgL, temperatureC, ammoniaMgL });
    res.json({ log, alerts });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

/** GET /api/cycles/:id/feed-brands */
cyclesRouter.get('/:id/feed-brands', requireAuth, async (req, res) => {
  const id = routeParam(req, 'id');
  const brands = await prisma.feedBrandMonth.findMany({
    where: { stockCycleId: id },
    orderBy: { month: 'asc' },
  });
  res.json(brands);
});

/** PUT /api/cycles/:id/feed-brands — upsert monthly feed brand/cost */
cyclesRouter.put('/:id/feed-brands', requireAuth, async (req, res) => {
  try {
    const id = routeParam(req, 'id');
    const items = req.body as {
      month: number; brand: string; feedSizeMm: number;
      costPerBag: number; crudeProteinPct: number;
    }[];
    const results = await Promise.all(
      items.map((item) =>
        prisma.feedBrandMonth.upsert({
          where: { stockCycleId_month: { stockCycleId: id, month: item.month } },
          update: item,
          create: { stockCycleId: id, ...item },
        }),
      ),
    );
    res.json(results);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

/** GET /api/cycles/:id/economics — combined cost/revenue summary */
cyclesRouter.get('/:id/economics', requireAuth, async (req, res) => {
  try {
    const id = routeParam(req, 'id');
    const cycle = await prisma.stockCycle.findUnique({
      where: { id },
      include: {
        feedLogs: true,
        feedBrands: { orderBy: { month: 'asc' } },
        powerLogs: true,
        miscCostLogs: true,
        salesLogs: true,
        pond: { include: { farm: true } },
      },
    });
    if (!cycle) {
      res.status(404).json({ error: 'Cycle not found' });
      return;
    }
    const summary = computeEconomicsSummary(cycle);
    res.json({ cycleId: cycle.id, pondName: cycle.pond.name, ...summary });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

/** GET /api/cycles/:id/misc-costs */
cyclesRouter.get('/:id/misc-costs', requireAuth, async (req, res) => {
  const id = routeParam(req, 'id');
  const logs = await prisma.miscCostLog.findMany({
    where: { stockCycleId: id },
    orderBy: { date: 'desc' },
    take: 50,
  });
  res.json(logs);
});

/** POST /api/cycles/:id/misc-costs */
cyclesRouter.post('/:id/misc-costs', requireAuth, async (req, res) => {
  try {
    const id = routeParam(req, 'id');
    const { date, category, amount, notes } = req.body as {
      date: string;
      category: string;
      amount: number;
      notes?: string;
    };
    if (!(MISC_COST_CATEGORIES as readonly string[]).includes(category)) {
      res.status(400).json({ error: 'Invalid category' });
      return;
    }
    const log = await prisma.miscCostLog.create({
      data: {
        stockCycleId: id,
        date: new Date(date),
        category: category as (typeof MISC_COST_CATEGORIES)[number],
        amount: Number(amount),
        notes: notes ?? null,
      },
    });
    res.status(201).json(log);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

/** GET /api/cycles/:id/feed-ingredients */
cyclesRouter.get('/:id/feed-ingredients', requireAuth, async (req, res) => {
  const id = routeParam(req, 'id');
  const items = await prisma.feedIngredientCost.findMany({
    where: { stockCycleId: id },
    orderBy: { ingredientName: 'asc' },
  });
  res.json(items);
});

/** PUT /api/cycles/:id/feed-ingredients — upsert ingredient costs */
cyclesRouter.put('/:id/feed-ingredients', requireAuth, async (req, res) => {
  try {
    const id = routeParam(req, 'id');
    const items = req.body as { ingredientName: string; costPerKg: number; month?: number }[];
    const results = await Promise.all(
      items.map((item) =>
        prisma.feedIngredientCost.upsert({
          where: {
            stockCycleId_ingredientName: {
              stockCycleId: id,
              ingredientName: item.ingredientName,
            },
          },
          update: {
            costPerKg: Number(item.costPerKg),
            month: item.month ?? null,
          },
          create: {
            stockCycleId: id,
            ingredientName: item.ingredientName,
            costPerKg: Number(item.costPerKg),
            month: item.month ?? null,
          },
        }),
      ),
    );
    res.json(results);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

/** GET /api/cycles/:id/sales */
cyclesRouter.get('/:id/sales', requireAuth, async (req, res) => {
  const id = routeParam(req, 'id');
  const sales = await prisma.fishSaleLog.findMany({
    where: { stockCycleId: id },
    orderBy: { date: 'desc' },
    take: 50,
  });
  res.json(sales);
});

/** POST /api/cycles/:id/sales */
cyclesRouter.post('/:id/sales', requireAuth, async (req, res) => {
  try {
    const id = routeParam(req, 'id');
    const { date, quantitySold, avgWeightG, totalRevenue, customerName, notes } = req.body;
    const sale = await prisma.fishSaleLog.create({
      data: {
        stockCycleId: id,
        date: new Date(date),
        quantitySold: Number(quantitySold),
        avgWeightG: avgWeightG != null ? Number(avgWeightG) : null,
        totalRevenue: totalRevenue != null ? Number(totalRevenue) : null,
        customerName: customerName ?? null,
        notes: notes ?? null,
      },
    });
    res.status(201).json(sale);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

/** POST /api/cycles/:id/weight — actual weight sample */
cyclesRouter.post('/:id/weight', requireAuth, async (req, res) => {
  try {
    const id = routeParam(req, 'id');
    const { date, averageWeightG, sampleCount } = req.body;
    const sample = await prisma.actualWeightSample.upsert({
      where: {
        stockCycleId_date: { stockCycleId: id, date: new Date(date) },
      },
      update: {
        averageWeightG: Number(averageWeightG),
        sampleCount: sampleCount != null ? Number(sampleCount) : null,
      },
      create: {
        stockCycleId: id,
        date: new Date(date),
        averageWeightG: Number(averageWeightG),
        sampleCount: sampleCount != null ? Number(sampleCount) : null,
      },
    });
    res.json(sample);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

/** GET /api/cycles/:id/power — recent power logs */
cyclesRouter.get('/:id/power', requireAuth, async (req, res) => {
  try {
    const id = routeParam(req, 'id');
    const logs = await prisma.dailyPowerLog.findMany({
      where: { stockCycleId: id },
      orderBy: { date: 'desc' },
      take: 30,
    });
    res.json(logs);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

/** POST /api/cycles/:id/power — log daily power (electricity, diesel, petrol, solar) */
cyclesRouter.post('/:id/power', requireAuth, async (req, res) => {
  try {
    const id = routeParam(req, 'id');
    const { date, electricityKwh, dieselLiters, petrolLiters, solarKwh, notes } = req.body as {
      date: string;
      electricityKwh?: number;
      dieselLiters?: number;
      petrolLiters?: number;
      solarKwh?: number;
      notes?: string;
    };

    const log = await prisma.dailyPowerLog.upsert({
      where: {
        stockCycleId_date: { stockCycleId: id, date: new Date(date) },
      },
      update: { electricityKwh, dieselLiters, petrolLiters, solarKwh, notes: notes ?? null },
      create: {
        stockCycleId: id,
        date: new Date(date),
        electricityKwh,
        dieselLiters,
        petrolLiters,
        solarKwh,
        notes: notes ?? null,
      },
    });
    res.json(log);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

/** GET /api/cycles/:id/operations — recent daily operations logs */
cyclesRouter.get('/:id/operations', requireAuth, async (req, res) => {
  try {
    const id = routeParam(req, 'id');
    const logs = await prisma.dailyOperationsLog.findMany({
      where: { stockCycleId: id },
      orderBy: { date: 'desc' },
      take: 30,
    });
    res.json(logs);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

/** POST /api/cycles/:id/operations — log daily pond operations */
cyclesRouter.post('/:id/operations', requireAuth, async (req, res) => {
  try {
    const id = routeParam(req, 'id');
    const {
      date,
      medication,
      grading,
      netWash,
      pondCleaning,
      aerationCheck,
      waterExchange,
      sampling,
      notes,
    } = req.body as {
      date: string;
      medication?: boolean;
      grading?: boolean;
      netWash?: boolean;
      pondCleaning?: boolean;
      aerationCheck?: boolean;
      waterExchange?: boolean;
      sampling?: boolean;
      notes?: string;
    };

    const log = await prisma.dailyOperationsLog.upsert({
      where: {
        stockCycleId_date: { stockCycleId: id, date: new Date(date) },
      },
      update: {
        medication: !!medication,
        grading: !!grading,
        netWash: !!netWash,
        pondCleaning: !!pondCleaning,
        aerationCheck: !!aerationCheck,
        waterExchange: !!waterExchange,
        sampling: !!sampling,
        notes: notes ?? null,
      },
      create: {
        stockCycleId: id,
        date: new Date(date),
        medication: !!medication,
        grading: !!grading,
        netWash: !!netWash,
        pondCleaning: !!pondCleaning,
        aerationCheck: !!aerationCheck,
        waterExchange: !!waterExchange,
        sampling: !!sampling,
        notes: notes ?? null,
      },
    });
    res.json(log);
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
