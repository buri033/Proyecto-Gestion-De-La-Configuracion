import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { supabase } from '../repos/supabase';
import { requireAuth } from '../middleware';
import { asegurarPerfil } from './cuentas';

const router = Router();

/** Mis cajitas (SAVINGS_GOAL). */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('account_balances')
      .select('account_id, account_number, type, balance, available, label, goal_amount')
      .eq('user_id', req.userId)
      .eq('type', 'SAVINGS_GOAL');

    if (error) throw error;
    res.json(data ?? []);
  } catch (e) {
    next(e);
  }
});

/** Crear una cajita nueva. */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { nombre, meta } = req.body as { nombre?: string; meta?: number };

    if (!nombre) {
      res.status(400).json({ error: 'La cajita necesita un nombre' });
      return;
    }

    if (!req.userId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    // Asegurar que el perfil exista para evitar la violacion de foreign key en accounts
    await asegurarPerfil(req.userId);

    // Generar un numero de cuenta unico para la cajita
    const numCuenta = 'CJ-' + Math.floor(10000000 + Math.random() * 90000000).toString();

    const { data, error } = await supabase
      .from('accounts')
      .insert({
        user_id: req.userId,
        account_number: numCuenta,
        type: 'SAVINGS_GOAL',
        label: nombre,
        goal_amount: meta ?? null,
      })
      .select('id')
      .single();

    if (error) throw error;
    res.status(201).json({ cajitaId: data.id });
  } catch (e) {
    next(e);
  }
});

/** Mover plata de la cuenta principal a una cajita. */
router.post('/mover', requireAuth, async (req, res, next) => {
  try {
    const { origen, destino, monto } = req.body as {
      origen?: string;
      destino?: string;
      monto?: number;
    };

    if (!origen || !destino || typeof monto !== 'number') {
      res.status(400).json({ error: 'Faltan: origen, destino y monto' });
      return;
    }

    const { data, error } = await supabase.rpc('transfer_money', {
      p_from_account: origen,
      p_to_account:   destino,
      p_amount:       monto,
      p_description:  'Movimiento a cajita de ahorro',
      p_idem_key:     randomUUID(),
      p_type:         'GOAL_MOVE',
    });

    if (error) throw error;
    res.json({ transaccionId: data });
  } catch (e) {
    next(e);
  }
});

export default router;
