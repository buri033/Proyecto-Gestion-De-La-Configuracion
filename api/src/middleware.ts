import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

export const JWT_SECRET = process.env['JWT_SECRET'] ?? 'banco-mvp-secret-key-local-2026';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Necesitas iniciar sesión' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email?: string };
    if (!decoded.userId) {
      res.status(401).json({ error: 'Tu sesión expiró. Vuelve a entrar' });
      return;
    }
    req.userId = decoded.userId;
    next();
  } catch (_err) {
    res.status(401).json({ error: 'Tu sesión expiró. Vuelve a entrar' });
  }
}
