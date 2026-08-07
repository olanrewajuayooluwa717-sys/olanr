import { Router } from 'express';
import { prisma } from '@fishmaster/db';
import type { ContentType } from '@fishmaster/db';

export const contentRouter = Router();

function typeFilter(type?: string) {
  if (!type) return undefined;
  if (type === 'article') return { in: ['article', 'education'] as ContentType[] };
  return type as ContentType;
}

/** GET /api/content — broadcast feed (all members). ?type=advert|article|information|picture|video */
contentRouter.get('/', async (req, res) => {
  const type = typeof req.query.type === 'string' ? req.query.type : undefined;
  const filter = typeFilter(type);
  const posts = await prisma.contentPost.findMany({
    where: {
      published: true,
      ...(filter ? { type: filter } : {}),
    },
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(posts);
});
