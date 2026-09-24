import { Router } from 'express';
import { prisma } from '@fishmaster/db';

export const marketplaceRouter = Router();

/** GET /api/marketplace/products — published (sold=false) listings for members */
marketplaceRouter.get('/products', async (_req, res) => {
  const products = await prisma.marketProduct.findMany({
    where: { sold: false },
    orderBy: { createdAt: 'desc' },
    include: {
      farm: {
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          country: true,
          user: { select: { name: true } },
          ponds: {
            take: 1,
            include: {
              cycles: {
                take: 1,
                orderBy: { createdAt: 'desc' },
                select: { currency: true },
              },
            },
          },
        },
      },
      category: { select: { id: true, title: true } },
    },
  });
  res.json(
    products.map((p) => ({
      ...p,
      currency: p.farm.ponds[0]?.cycles[0]?.currency ?? null,
      farm: {
        id: p.farm.id,
        name: p.farm.name,
        city: p.farm.city,
        state: p.farm.state,
        country: p.farm.country,
        user: p.farm.user,
      },
    })),
  );
});

/** GET /api/marketplace/categories — categories with active product counts */
marketplaceRouter.get('/categories', async (_req, res) => {
  const categories = await prisma.marketCategory.findMany({
    orderBy: { title: 'asc' },
    include: {
      _count: { select: { products: { where: { sold: false } } } },
    },
  });
  res.json(categories);
});
