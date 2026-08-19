import type { NextFunction, Request, Response } from 'express';
import { supabase } from './repos/supabase';

/** Extiende el Request de Express para que TypeScript conozca userId. */
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

  // Usar el cliente admin supabase con service_role_key para verificar tokens de manera 100% confiable
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ error: 'Tu sesión expiró. Vuelve a entrar' });
    return;
  }

  req.userId = data.user.id;
  next();
}
