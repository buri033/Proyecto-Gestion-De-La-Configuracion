import { Router } from 'express';
import { query } from '../repos/db';
import { requireAuth } from '../middleware';

const router = Router();

/** Lista de notificaciones del usuario, mas recientes primero. */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const notifsRes = await query(
      `SELECT id, title, body, read_at, created_at 
       FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50;`,
      [req.userId]
    );

    res.json(notifsRes.rows ?? []);
  } catch (e) {
    next(e);
  }
});

/** Marcar una notificacion como leida. */
router.patch('/:id/leida', requireAuth, async (req, res, next) => {
  try {
    await query(
      `UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2;`,
      [req.params.id, req.userId]
    );

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/** Marcar todas las notificaciones como leidas. */
router.patch('/todas/leidas', requireAuth, async (req, res, next) => {
  try {
    await query(
      `UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL;`,
      [req.userId]
    );

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
