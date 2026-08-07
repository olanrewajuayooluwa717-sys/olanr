import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '@fishmaster/db';
import { requireRole } from './role-middleware';
import { routeParam } from './params';
import type { AdminContentType } from './billing-config';
import { CONTENT_TYPES } from './billing-config';

export const adminRouter = Router();
const admin = requireRole('super_admin', 'manager');
const superOnly = requireRole('super_admin');

function isContentType(v: string): v is AdminContentType {
  return (CONTENT_TYPES as readonly string[]).includes(v);
}

/** GET /api/admin/members */
adminRouter.get('/members', admin, async (_req, res) => {
  const members = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, email: true, role: true,
      phone: true, gender: true,
      subscriptionTier: true, subscriptionStatus: true, createdAt: true,
      _count: { select: { farms: true } },
      farms: {
        select: {
          id: true, name: true, city: true, state: true, country: true,
          latitude: true, longitude: true,
        },
      },
    },
  });
  res.json(members);
});

/** GET /api/admin/members/:id — full member detail */
adminRouter.get('/members/:id', admin, async (req, res) => {
  const userId = routeParam(req, 'id');
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, surname: true, email: true, phone: true, gender: true,
      ageRange: true, role: true, lga: true, state: true, country: true, postcode: true,
      subscriptionTier: true, subscriptionStatus: true, createdAt: true,
      farms: {
        include: {
          ponds: {
            include: {
              cycles: {
                orderBy: { createdAt: 'desc' },
                include: {
                  salesLogs: true,
                  mortalityLogs: { select: { count: true } },
                  _count: { select: { feedLogs: true, mortalityLogs: true } },
                },
              },
            },
            orderBy: { number: 'asc' },
          },
          marketProducts: {
            include: { category: { select: { id: true, title: true } } },
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
  });
  if (!user) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }

  const cycles = user.farms.flatMap((f) => f.ponds.flatMap((p) => p.cycles));
  let salesTotalRevenue = 0;
  let salesTotalQty = 0;
  for (const c of cycles) {
    for (const s of c.salesLogs) {
      salesTotalRevenue += s.totalRevenue ?? 0;
      salesTotalQty += s.quantitySold;
    }
  }
  const totalMortality = cycles.reduce(
    (sum, c) => sum + c.mortalityLogs.reduce((m, log) => m + log.count, 0),
    0,
  );
  const totalStocked = cycles.reduce((sum, c) => sum + c.quantityStocked, 0);

  res.json({
    ...user,
    summary: {
      farmCount: user.farms.length,
      pondCount: user.farms.reduce((n, f) => n + f.ponds.length, 0),
      cycleCount: cycles.length,
      totalStocked,
      totalMortality,
      presentQtyEstimate: Math.max(0, totalStocked - totalMortality),
      salesTotalRevenue,
      salesTotalQty,
      marketProductCount: user.farms.reduce((n, f) => n + f.marketProducts.length, 0),
    },
  });
});

/** GET /api/admin/farms — farm directory with optional GPS */
adminRouter.get('/farms', admin, async (_req, res) => {
  const farms = await prisma.farm.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true } },
      ponds: { select: { id: true, name: true, number: true } },
    },
  });
  res.json(farms);
});

/** PATCH /api/admin/members/:id/suspend */
adminRouter.patch('/members/:id/suspend', superOnly, async (req, res) => {
  const user = await prisma.user.update({
    where: { id: routeParam(req, 'id') },
    data: { subscriptionStatus: 'suspended' },
  });
  res.json(user);
});

/** PATCH /api/admin/members/:id/activate */
adminRouter.patch('/members/:id/activate', superOnly, async (req, res) => {
  const user = await prisma.user.update({
    where: { id: routeParam(req, 'id') },
    data: { subscriptionStatus: 'active' },
  });
  res.json(user);
});

/** PATCH /api/admin/members/:id/role */
adminRouter.patch('/members/:id/role', superOnly, async (req, res) => {
  const { role } = req.body as { role: 'member' | 'manager' | 'super_admin' };
  const user = await prisma.user.update({
    where: { id: routeParam(req, 'id') },
    data: { role },
  });
  res.json(user);
});

/** GET /api/admin/posts */
adminRouter.get('/posts', admin, async (_req, res) => {
  const posts = await prisma.contentPost.findMany({
    include: { author: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(posts);
});

/** POST /api/admin/posts — broadcast to all members */
adminRouter.post('/posts', admin, async (req, res) => {
  const { type, title, body, mediaUrl } = req.body as {
    type: string;
    title: string;
    body: string;
    mediaUrl?: string;
  };
  if (!isContentType(type)) {
    res.status(400).json({ error: 'Invalid content type' });
    return;
  }
  const post = await prisma.contentPost.create({
    data: {
      type,
      title,
      body,
      mediaUrl: mediaUrl ?? null,
      authorId: req.user!.userId,
      published: true,
    },
  });
  res.status(201).json(post);
});

/** PATCH /api/admin/posts/:id */
adminRouter.patch('/posts/:id', admin, async (req, res) => {
  const { title, body, type, mediaUrl, published } = req.body as {
    title?: string;
    body?: string;
    type?: string;
    mediaUrl?: string | null;
    published?: boolean;
  };
  if (type != null && !isContentType(type)) {
    res.status(400).json({ error: 'Invalid content type' });
    return;
  }
  const data: Record<string, unknown> = {};
  if (title != null) data.title = title;
  if (body != null) data.body = body;
  if (type != null) data.type = type;
  if (mediaUrl !== undefined) data.mediaUrl = mediaUrl;
  if (published != null) data.published = published;
  const post = await prisma.contentPost.update({
    where: { id: routeParam(req, 'id') },
    data,
  });
  res.json(post);
});

/** DELETE /api/admin/posts/:id */
adminRouter.delete('/posts/:id', admin, async (req, res) => {
  await prisma.contentPost.delete({ where: { id: routeParam(req, 'id') } });
  res.json({ ok: true });
});

/** GET /api/admin/members/:id/ponds — ponds & cycles for per-pond messaging */
adminRouter.get('/members/:id/ponds', admin, async (req, res) => {
  const userId = routeParam(req, 'id');
  const ponds = await prisma.pond.findMany({
    where: { farm: { userId } },
    include: { cycles: { orderBy: { createdAt: 'desc' }, take: 1 } },
    orderBy: { number: 'asc' },
  });
  res.json(
    ponds.map((p) => ({
      pondId: p.id,
      pondName: p.name,
      pondNumber: p.number,
      cycleId: p.cycles[0]?.id ?? null,
      label: `${p.name} (#${p.number})`,
    })),
  );
});

/** POST /api/admin/members/:id/messages — send report/info to one member (optional pond) */
adminRouter.post('/members/:id/messages', admin, async (req, res) => {
  const { title, body, reportNum, pondId, pondLabel } = req.body as {
    title: string;
    body: string;
    reportNum?: number;
    pondId?: string;
    pondLabel?: string;
  };
  const userId = routeParam(req, 'id');
  const member = await prisma.user.findUnique({ where: { id: userId } });
  if (!member) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }
  const message = await prisma.memberMessage.create({
    data: {
      userId,
      pondId: pondId ?? null,
      pondLabel: pondLabel ?? null,
      title,
      body,
      reportNum: reportNum ?? null,
    },
  });
  res.status(201).json(message);
});

/** GET /api/admin/ingredients */
adminRouter.get('/ingredients', admin, async (_req, res) => {
  const items = await prisma.globalIngredient.findMany({ orderBy: [{ foodClass: 'asc' }, { name: 'asc' }] });
  res.json(items);
});

/** PUT /api/admin/ingredients — bulk upsert by name */
adminRouter.put('/ingredients', admin, async (req, res) => {
  const items = req.body as {
    name: string;
    crudeProteinPct: number;
    inclusionRatio: number;
    composition?: string | null;
    foodClass: 'protein' | 'carbohydrate' | 'others';
  }[];
  if (!Array.isArray(items)) {
    res.status(400).json({ error: 'Expected array of ingredients' });
    return;
  }
  const results = [];
  for (const item of items) {
    if (!item.name?.trim()) continue;
    const row = await prisma.globalIngredient.upsert({
      where: { name: item.name.trim() },
      update: {
        crudeProteinPct: Number(item.crudeProteinPct) || 0,
        inclusionRatio: Number(item.inclusionRatio) || 0,
        composition: item.composition ?? null,
        foodClass: item.foodClass,
      },
      create: {
        name: item.name.trim(),
        crudeProteinPct: Number(item.crudeProteinPct) || 0,
        inclusionRatio: Number(item.inclusionRatio) || 0,
        composition: item.composition ?? null,
        foodClass: item.foodClass,
      },
    });
    results.push(row);
  }
  res.json(results);
});

/** GET /api/admin/fcr */
adminRouter.get('/fcr', admin, async (_req, res) => {
  let rows = await prisma.fcrMonthConfig.findMany({ orderBy: { month: 'asc' } });
  if (rows.length < 6) {
    const defaults = [
      { month: 1, fcr: 0.6, bodyWeightPct: 0.045 },
      { month: 2, fcr: 0.75, bodyWeightPct: 0.033 },
      { month: 3, fcr: 0.8, bodyWeightPct: 0.02 },
      { month: 4, fcr: 0.8, bodyWeightPct: 0.02 },
      { month: 5, fcr: 1.0, bodyWeightPct: 0.01 },
      { month: 6, fcr: 1.1, bodyWeightPct: 0.012 },
    ];
    for (const d of defaults) {
      await prisma.fcrMonthConfig.upsert({
        where: { month: d.month },
        update: {},
        create: d,
      });
    }
    rows = await prisma.fcrMonthConfig.findMany({ orderBy: { month: 'asc' } });
  }
  res.json(rows);
});

/** PUT /api/admin/fcr — update months 1–6 */
adminRouter.put('/fcr', admin, async (req, res) => {
  const items = req.body as { month: number; bodyWeightPct: number; fcr: number }[];
  if (!Array.isArray(items)) {
    res.status(400).json({ error: 'Expected array of FCR months' });
    return;
  }
  const results = [];
  for (const item of items) {
    const month = Number(item.month);
    if (month < 1 || month > 6) continue;
    const row = await prisma.fcrMonthConfig.upsert({
      where: { month },
      update: {
        bodyWeightPct: Number(item.bodyWeightPct),
        fcr: Number(item.fcr),
      },
      create: {
        month,
        bodyWeightPct: Number(item.bodyWeightPct),
        fcr: Number(item.fcr),
      },
    });
    results.push(row);
  }
  res.json(results.sort((a, b) => a.month - b.month));
});

/** GET /api/admin/marketplace/categories */
adminRouter.get('/marketplace/categories', admin, async (_req, res) => {
  const categories = await prisma.marketCategory.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { products: true } } },
  });
  res.json(categories);
});

/** POST /api/admin/marketplace/categories */
adminRouter.post('/marketplace/categories', admin, async (req, res) => {
  const { title, description, imageUrl } = req.body as {
    title: string;
    description?: string;
    imageUrl?: string;
  };
  if (!title?.trim()) {
    res.status(400).json({ error: 'Title required' });
    return;
  }
  const category = await prisma.marketCategory.create({
    data: {
      title: title.trim(),
      description: description ?? null,
      imageUrl: imageUrl ?? null,
    },
  });
  res.status(201).json(category);
});

/** PATCH /api/admin/marketplace/categories/:id */
adminRouter.patch('/marketplace/categories/:id', admin, async (req, res) => {
  const { title, description, imageUrl } = req.body as {
    title?: string;
    description?: string | null;
    imageUrl?: string | null;
  };
  const data: Record<string, unknown> = {};
  if (title != null) data.title = title.trim();
  if (description !== undefined) data.description = description;
  if (imageUrl !== undefined) data.imageUrl = imageUrl;
  const category = await prisma.marketCategory.update({
    where: { id: routeParam(req, 'id') },
    data,
  });
  res.json(category);
});

/** DELETE /api/admin/marketplace/categories/:id */
adminRouter.delete('/marketplace/categories/:id', admin, async (req, res) => {
  const id = routeParam(req, 'id');
  await prisma.marketProduct.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
  await prisma.marketCategory.delete({ where: { id } });
  res.json({ ok: true });
});

/** GET /api/admin/marketplace/products */
adminRouter.get('/marketplace/products', admin, async (_req, res) => {
  const products = await prisma.marketProduct.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      farm: {
        select: {
          id: true, name: true, city: true, state: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
      category: { select: { id: true, title: true } },
    },
  });
  res.json(products);
});

/** POST /api/admin/marketplace/products */
adminRouter.post('/marketplace/products', admin, async (req, res) => {
  const { farmId, categoryId, name, price, quantity, imageUrl, description, sold } = req.body as {
    farmId: string;
    categoryId?: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
    description?: string;
    sold?: boolean;
  };
  if (!farmId || !name?.trim()) {
    res.status(400).json({ error: 'farmId and name required' });
    return;
  }
  const product = await prisma.marketProduct.create({
    data: {
      farmId,
      categoryId: categoryId || null,
      name: name.trim(),
      price: Number(price) || 0,
      quantity: Number(quantity) || 0,
      imageUrl: imageUrl ?? null,
      description: description ?? null,
      sold: Boolean(sold),
    },
    include: {
      farm: {
        select: {
          id: true, name: true, city: true, state: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
      category: { select: { id: true, title: true } },
    },
  });
  res.status(201).json(product);
});

/** PATCH /api/admin/marketplace/products/:id */
adminRouter.patch('/marketplace/products/:id', admin, async (req, res) => {
  const { farmId, categoryId, name, price, quantity, imageUrl, description, sold } = req.body as {
    farmId?: string;
    categoryId?: string | null;
    name?: string;
    price?: number;
    quantity?: number;
    imageUrl?: string | null;
    description?: string | null;
    sold?: boolean;
  };
  const data: Record<string, unknown> = {};
  if (farmId != null) data.farmId = farmId;
  if (categoryId !== undefined) data.categoryId = categoryId || null;
  if (name != null) data.name = name.trim();
  if (price != null) data.price = Number(price);
  if (quantity != null) data.quantity = Number(quantity);
  if (imageUrl !== undefined) data.imageUrl = imageUrl;
  if (description !== undefined) data.description = description;
  if (sold != null) data.sold = Boolean(sold);
  const product = await prisma.marketProduct.update({
    where: { id: routeParam(req, 'id') },
    data,
    include: {
      farm: {
        select: {
          id: true, name: true, city: true, state: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
      category: { select: { id: true, title: true } },
    },
  });
  res.json(product);
});

/** DELETE /api/admin/marketplace/products/:id */
adminRouter.delete('/marketplace/products/:id', admin, async (req, res) => {
  await prisma.marketProduct.delete({ where: { id: routeParam(req, 'id') } });
  res.json({ ok: true });
});

/** POST /api/admin/staff — create manager (super_admin only) */
adminRouter.post('/staff', superOnly, async (req, res) => {
  const { name, email, password, phone } = req.body as {
    name: string;
    email: string;
    password: string;
    phone?: string;
  };
  if (!name?.trim() || !email?.trim() || !password) {
    res.status(400).json({ error: 'name, email, and password required' });
    return;
  }
  const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      phone: phone?.trim() || null,
      role: 'manager',
      subscriptionTier: 'premium',
      subscriptionStatus: 'active',
    },
    select: {
      id: true, name: true, email: true, phone: true, role: true,
      subscriptionStatus: true, createdAt: true,
    },
  });
  res.status(201).json(user);
});
