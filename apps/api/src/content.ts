import { Router } from 'express';
import { prisma } from '@fishmaster/db';
import type { ContentType } from '@fishmaster/db';
import { requireAuth } from './auth-middleware';
import { routeParam } from './params';

export const contentRouter = Router();

function typeFilter(type?: string) {
  if (!type) return undefined;
  if (type === 'article') return { in: ['article', 'education'] as ContentType[] };
  return type as ContentType;
}

function excerpt(body: string, n = 90) {
  const text = body.replace(/\s+/g, ' ').trim();
  return text.length > n ? `${text.slice(0, n)}…` : text;
}

/** Public teaser — titles and picture thumbs only. Full bodies need a login. */
contentRouter.get('/preview', async (req, res) => {
  const type = typeof req.query.type === 'string' ? req.query.type : undefined;
  const filter = typeFilter(type);
  const posts = await prisma.contentPost.findMany({
    where: { published: true, ...(filter ? { type: filter } : {}) },
    select: {
      id: true,
      type: true,
      title: true,
      mediaUrl: true,
      createdAt: true,
      author: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 24,
  });
  res.json(posts.map((p) => ({
    ...p,
    body: '',
    mediaUrl: p.type === 'picture' ? p.mediaUrl : null,
    locked: true,
  })));
});

/**
 * Public share payload for social links.
 * One full post, plus locked teasers of other content.
 */
contentRouter.get('/share/:id', async (req, res) => {
  const id = routeParam(req, 'id');
  const post = await prisma.contentPost.findFirst({
    where: { id, published: true },
    include: { author: { select: { name: true } } },
  });
  if (!post) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const more = await prisma.contentPost.findMany({
    where: { published: true, id: { not: post.id } },
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      mediaUrl: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 12,
  });
  res.json({
    post,
    more: more.map((p) => ({
      id: p.id,
      type: p.type,
      title: p.title,
      excerpt: excerpt(p.body),
      mediaUrl: p.type === 'picture' ? p.mediaUrl : null,
      createdAt: p.createdAt,
    })),
  });
});

const AD_PLACES = ['home', 'article', 'information', 'picture', 'video'] as const;

/** Public sponsored posts for one place (home feed or a content tab). */
contentRouter.get('/ads', async (req, res) => {
  const place = typeof req.query.place === 'string' ? req.query.place : '';
  if (!(AD_PLACES as readonly string[]).includes(place)) {
    res.status(400).json({ error: 'Choose a place: home, article, information, picture, or video' });
    return;
  }
  const posts = await prisma.contentPost.findMany({
    where: {
      published: true,
      type: 'advert',
      OR: [
        { placements: { has: place } },
        { placements: { equals: [] } },
      ],
    },
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      mediaUrl: true,
      createdAt: true,
      author: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  res.json(posts);
});

/** GET /api/content — full feed for signed-in members */
contentRouter.get('/', requireAuth, async (req, res) => {
  const type = typeof req.query.type === 'string' ? req.query.type : undefined;
  const filter = typeFilter(type);
  const posts = await prisma.contentPost.findMany({
    where: {
      published: true,
      ...(filter ? { type: filter } : {}),
    },
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json(posts);
});
