import { Router } from 'express';
import { supabase } from '../repos/supabase';
import { requireAuth } from '../middleware';

const router = Router();

/** Lista de notificaciones del usuario, mas recientes primero. */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, body, read_at, created_at')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json(data ?? []);
  } catch (e) {
    next(e);
  }
});

/** Marcar una notificacion como leida. */
router.patch('/:id/leida', requireAuth, async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', req.userId);

    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/** Marcar todas las notificaciones como leidas. */
router.patch('/todas/leidas', requireAuth, async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', req.userId)
      .is('read_at', null);

    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
