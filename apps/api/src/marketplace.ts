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
          user: { select: { name: true } },
        },
      },
      category: { select: { id: true, title: true } },
    },
  });
  res.json(products);
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
