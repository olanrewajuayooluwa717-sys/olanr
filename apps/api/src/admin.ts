import { Router } from 'express';
import { prisma } from '@fishmaster/db';
import { requireRole } from './role-middleware';
import { routeParam } from './params';

export const adminRouter = Router();
const admin = requireRole('super_admin', 'manager');
const superOnly = requireRole('super_admin');

/** GET /api/admin/members */
adminRouter.get('/members', admin, async (_req, res) => {
  const members = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, email: true, role: true,
      subscriptionTier: true, subscriptionStatus: true, createdAt: true,
      _count: { select: { farms: true } },
    },
  });
  res.json(members);
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
    type: 'advert' | 'education' | 'information';
    title: string;
    body: string;
    mediaUrl?: string;
  };
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
  const { title, body, type, published } = req.body;
  const post = await prisma.contentPost.update({
    where: { id: routeParam(req, 'id') },
    data: { title, body, type, published },
  });
  res.json(post);
});

/** DELETE /api/admin/posts/:id */
adminRouter.delete('/posts/:id', admin, async (req, res) => {
  await prisma.contentPost.delete({ where: { id: routeParam(req, 'id') } });
  res.json({ ok: true });
});
