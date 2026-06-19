import type { Request } from 'express';

/** Express route params may be string | string[] — Prisma expects string. */
export function routeParam(req: Request, key: string): string {
  const value = req.params[key];
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}
