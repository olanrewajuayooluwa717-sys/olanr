import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '@fishmaster/db';
import { generateStockCycleReport, detectFeedAlert, dayInCultureCycle } from '@fishmaster/calc-engine';
import {
  REGISTRATION_RANGES,
  clampRegistrationNumber,
  formatPhoneWithCountry,
  isMemberCategory,
  validatePassword,
} from '@fishmaster/shared-types';
import { toStockCycleInput } from './mappers';
import { requireAuth, signToken } from './auth-middleware';
import { routeParam } from './params';
import { evaluateWaterQuality } from './water-quality';
import { computeCumulativeFeedCost, computeEconomicsSummary } from './economics';
import { MISC_COST_CATEGORIES } from './economics-config';
import { sendRegistrationConfirmation } from './mail';

export const cyclesRouter = Router();

const CLEANING_INTERVAL_DAYS = 14;

function normalizeCategories(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    const v = String(item).trim();
    if (v && isMemberCategory(v) && !out.includes(v)) out.push(v);
  }
  return out;
}

function normalizeFishSpecies(raw: unknown): string | null {
  if (Array.isArray(raw)) {
    const list = raw.map((s) => String(s).trim()).filter(Boolean);
    return list.length ? [...new Set(list)].sort((a, b) => a.localeCompare(b)).join(', ') : null;
  }
  if (raw == null || raw === '') return null;
  return String(raw);
}

function parseCultureSystem(raw: unknown): 'extensive' | 'semi_intensive' | 'intensive' | 'ras' | null {
  const v = String(raw ?? '');
  if (v === 'extensive' || v === 'semi_intensive' || v === 'intensive' || v === 'ras') return v;
  return null;
}

const cycleInclude = {
  pond: { include: { farm: { include: { user: true } } } },
  mortalityLogs: true,
  feedLogs: true,
  feedBrands: { orderBy: { month: 'asc' as const } },
  weightSamples: { orderBy: { date: 'desc' as const }, take: 1 },
} as const;

function buildDisplayPayload(cycle: {
  id: string;
  stockingDate: Date;
  averageWeightAtStockingG: number;
  fingerlingPrice: number;
  quantityStocked: number;
  desiredCrudeProteinPct: number;
  desiredFeedQuantityKg: number;
  fishSpecies: string | null;
  pond: {
    name: string;
    number: number;
    lengthM: number;
    widthM: number;
    depthM: number;
    farm: {
      name: string;
      location: string;
      city: string;
      state: string;
      country: string;
      user: {
        name: string;
        email?: string;
        gender?: string | null;
        phone?: string | null;
        categories?: string[];
        estimatedFishOutputYear?: string | null;
      };
    };
  };
}) {
  const farm = cycle.pond.farm;
  const user = farm.user;
  const volumeLiters = cycle.pond.lengthM * cycle.pond.widthM * cycle.pond.depthM * 1000;
  const firstFeedingDate = new Date(cycle.stockingDate);
  firstFeedingDate.setDate(firstFeedingDate.getDate() + 1);
  return {
    farmerName: user.name,
    gender: user.gender ?? null,
    phone: user.phone ?? null,
    email: user.email ?? null,
    categories: user.categories ?? [],
    estimatedFishOutputYear: user.estimatedFishOutputYear ?? null,
    farmName: farm.name,
    location: farm.location,
    city: farm.city,
    state: farm.state,
    country: farm.country,
    pond: {
      name: cycle.pond.name,
      number: cycle.pond.number,
      lengthM: cycle.pond.lengthM,
      widthM: cycle.pond.widthM,
      depthM: cycle.pond.depthM,
      volumeLiters,
    },
    stock: {
      averageWeightAtStockingG: cycle.averageWeightAtStockingG,
      fingerlingPrice: cycle.fingerlingPrice,
      quantityStocked: cycle.quantityStocked,
      stockingDate: cycle.stockingDate,
      firstFeedingDate,
      stockingMonth: cycle.stockingDate.toLocaleString('en', { month: 'long' }),
      desiredCrudeProteinPct: cycle.desiredCrudeProteinPct,
      desiredFeedQuantityKg: cycle.desiredFeedQuantityKg,
      fishSpecies: cycle.fishSpecies,
    },
  };
}

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
    res.json({
      cycleId: cycle.id,
      pondName: cycle.pond.name,
      report,
      display: buildDisplayPayload(cycle),
    });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

/** POST /api/cycles — register farm + pond(s) + stock cycle(s) */
cyclesRouter.post('/', async (req, res) => {
  try {
    const body = req.body ?? {};
    const {
      userId,
      farmerName,
      surname,
      gender,
      ageRange,
      phone,
      phoneCountryCode,
      postcode,
      lga,
      email,
      categories,
      estimatedFishOutputYear,
      farmName,
      farmPhone,
      location,
      farmPostcode,
      farmLga,
      farmSizeSqM,
      farmSizeAcres,
      totalPonds,
      city,
      state,
      country,
      currency,
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
    } = body;

    if (password) {
      const pwdErr = validatePassword(String(password));
      if (pwdErr) {
        res.status(400).json({ error: pwdErr });
        return;
      }
    }

    const protein = clampRegistrationNumber(
      Number(desiredCrudeProteinPct ?? 38),
      REGISTRATION_RANGES.crudeProteinPct,
    );
    const ph =
      initialPh != null && initialPh !== ''
        ? clampRegistrationNumber(Number(initialPh), REGISTRATION_RANGES.initialPh)
        : null;
    const doMg =
      initialDissolvedOxygenMgL != null && initialDissolvedOxygenMgL !== ''
        ? clampRegistrationNumber(Number(initialDissolvedOxygenMgL), REGISTRATION_RANGES.dissolvedOxygenMgL)
        : null;

    type PondPayload = {
      pondName: string;
      pondNumber: number;
      pondType?: string | null;
      lengthM: number;
      widthM: number;
      depthM: number;
      cultureSystem?: string | null;
      fishSpecies?: unknown;
      quantityStocked: number;
      averageWeightAtStockingG: number;
      fingerlingPrice: number;
      stockingDate: string;
      proposedSalesDate?: string | null;
    };

    let pondList: PondPayload[] = Array.isArray(body.ponds) ? body.ponds : [];
    if (pondList.length === 0) {
      pondList = [
        {
          pondName: body.pondName,
          pondNumber: Number(body.pondNumber ?? 1),
          pondType: body.pondType ?? null,
          lengthM: Number(body.lengthM),
          widthM: Number(body.widthM),
          depthM: Number(body.depthM),
          cultureSystem: body.cultureSystem ?? null,
          fishSpecies: body.fishSpecies,
          quantityStocked: Number(body.quantityStocked),
          averageWeightAtStockingG: Number(body.averageWeightAtStockingG),
          fingerlingPrice: Number(body.fingerlingPrice),
          stockingDate: body.stockingDate,
          proposedSalesDate: body.proposedSalesDate ?? null,
        },
      ];
    }

    for (const p of pondList) {
      if (!p.pondName || !p.stockingDate) {
        res.status(400).json({ error: 'Each pond needs a name and stocking date' });
        return;
      }
      if (p.proposedSalesDate) {
        const stock = new Date(p.stockingDate);
        const sale = new Date(p.proposedSalesDate);
        if (!(sale > stock)) {
          res.status(400).json({ error: 'Date of sales must be after date of stocking' });
          return;
        }
      }
    }

    const fullPhone =
      phoneCountryCode && phone
        ? formatPhoneWithCountry(String(phoneCountryCode), String(phone))
        : phone
          ? String(phone)
          : null;

    let user = userId
      ? await prisma.user.findUnique({ where: { id: userId } })
      : email
        ? await prisma.user.findUnique({ where: { email } })
        : null;

    const isNewUser = !user && !!email;

    if (!user && email) {
      const passwordHash = password ? await bcrypt.hash(String(password), 10) : null;
      user = await prisma.user.create({
        data: {
          email,
          name: farmerName ?? email,
          surname: surname ?? null,
          gender: gender ?? null,
          ageRange: ageRange ?? null,
          phone: fullPhone,
          postcode: postcode ?? null,
          lga: lga ?? null,
          state: state ?? null,
          country: country ?? null,
          categories: normalizeCategories(categories),
          estimatedFishOutputYear: estimatedFishOutputYear
            ? String(estimatedFishOutputYear)
            : null,
          role: 'member',
          passwordHash,
        },
      });
    } else if (user) {
      const cat = normalizeCategories(categories);
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          ...(password && !user.passwordHash
            ? { passwordHash: await bcrypt.hash(String(password), 10) }
            : {}),
          ...(cat.length ? { categories: cat } : {}),
          ...(estimatedFishOutputYear
            ? { estimatedFishOutputYear: String(estimatedFishOutputYear) }
            : {}),
          ...(fullPhone ? { phone: fullPhone } : {}),
          ...(state ? { state: String(state) } : {}),
          ...(country ? { country: String(country) } : {}),
        },
      });
    }
    if (!user) {
      res.status(400).json({ error: 'userId or email required' });
      return;
    }

    const currencyCode = currency ? String(currency).toUpperCase() : 'NGN';

    const farm = await prisma.farm.create({
      data: {
        userId: user.id,
        name: farmName,
        phone: farmPhone ?? null,
        location: location ?? '',
        postcode: farmPostcode ?? null,
        lga: farmLga ?? null,
        sizeSqM: farmSizeSqM != null && farmSizeSqM !== '' ? Number(farmSizeSqM) : null,
        farmSizeAcres: farmSizeAcres ? String(farmSizeAcres) : null,
        totalPonds: totalPonds != null && totalPonds !== ''
          ? Number(totalPonds)
          : pondList.length,
        city: city ?? '',
        state: state ?? '',
        country: country ?? '',
        ponds: {
          create: pondList.map((p, idx) => ({
            name: p.pondName,
            number: Number(p.pondNumber ?? idx + 1),
            pondType: p.pondType ?? null,
            lengthM: Number(p.lengthM),
            widthM: Number(p.widthM),
            depthM: Number(p.depthM),
            cycles: {
              create: {
                fishSpecies: normalizeFishSpecies(p.fishSpecies),
                cultureSystem: parseCultureSystem(p.cultureSystem),
                currency: currencyCode,
                quantityStocked: Number(p.quantityStocked),
                averageWeightAtStockingG: Number(p.averageWeightAtStockingG),
                fingerlingPrice: Number(p.fingerlingPrice),
                stockingDate: new Date(p.stockingDate),
                proposedSalesDate: p.proposedSalesDate ? new Date(p.proposedSalesDate) : null,
                feedName: feedName ?? null,
                feedType: feedType ?? null,
                feedMaker: feedMaker ?? null,
                feedBags: feedBags != null && feedBags !== '' ? Number(feedBags) : null,
                desiredCrudeProteinPct: protein,
                desiredFeedQuantityKg: Number(desiredFeedQuantityKg ?? 1500),
                waterSource: waterSource ?? null,
                initialPh: ph,
                initialDissolvedOxygenMgL: doMg,
              },
            },
          })),
        },
      },
      include: { ponds: { include: { cycles: true }, orderBy: { number: 'asc' } } },
    });

    const firstPond = farm.ponds[0]!;
    const cycle = firstPond.cycles[0]!;
    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    if (isNewUser && email) {
      const confirmBody = [
        `Welcome to Fishmaster, ${farmerName ?? user.name}.`,
        `Your farm “${farmName}” is registered with ${pondList.length} pond(s).`,
        'You can sign in anytime with this email.',
      ].join('\n\n');

      await prisma.memberMessage.create({
        data: {
          userId: user.id,
          title: 'Registration confirmed',
          body: confirmBody,
          pondLabel: firstPond.name,
        },
      });

      // Ops inbox / email — never block registration on mail failure
      void sendRegistrationConfirmation({
        email: String(email),
        farmerName: String(farmerName ?? user.name),
        farmName: String(farmName ?? farm.name),
      }).catch((err) => console.warn('[registration] confirmation mail failed', err));
    }

    res.status(201).json({
      farmId: farm.id,
      pondId: firstPond.id,
      cycleId: cycle.id,
      pondIds: farm.ponds.map((p) => p.id),
      cycleIds: farm.ponds.flatMap((p) => p.cycles.map((c) => c.id)),
      token,
      userId: user.id,
    });
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
    res.json({
      cycleId: cycle.id,
      pondName: cycle.pond.name,
      report,
      display: buildDisplayPayload(cycle),
    });
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
