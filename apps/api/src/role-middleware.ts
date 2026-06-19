import { Request, Response, NextFunction } from 'express';
import { requireAuth } from './auth-middleware';

type Role = 'member' | 'manager' | 'super_admin';

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    requireAuth(req, res, () => {
      if (!req.user || !roles.includes(req.user.role as Role)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }
      next();
    });
  };
}
