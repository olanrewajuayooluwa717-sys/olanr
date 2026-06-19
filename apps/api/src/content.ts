import { Router } from 'express';
import { prisma } from '@fishmaster/db';

export const contentRouter = Router();

/** GET /api/content — member news/education feed */
contentRouter.get('/', async (_req, res) => {
  const posts = await prisma.contentPost.findMany({
    where: { published: true },
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(posts);
});
