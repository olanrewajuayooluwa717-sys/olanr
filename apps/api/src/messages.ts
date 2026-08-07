import { Router } from 'express';
import { prisma } from '@fishmaster/db';
import { requireAuth } from './auth-middleware';
import { routeParam } from './params';

export const messagesRouter = Router();

/** GET /api/messages — personal messages from admin (per member / pond reports) */
messagesRouter.get('/', requireAuth, async (req, res) => {
  const messages = await prisma.memberMessage.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(messages);
});

/** PATCH /api/messages/:id/read */
messagesRouter.patch('/:id/read', requireAuth, async (req, res) => {
  const id = routeParam(req, 'id');
  const msg = await prisma.memberMessage.findFirst({
    where: { id, userId: req.user!.userId },
  });
  if (!msg) {
    res.status(404).json({ error: 'Message not found' });
    return;
  }
  const updated = await prisma.memberMessage.update({
    where: { id: msg.id },
    data: { read: true },
  });
  res.json(updated);
});
