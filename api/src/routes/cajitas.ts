import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { query } from '../repos/db';
import { requireAuth } from '../middleware';
import { asegurarPerfil } from './cuentas';

const router = Router();

/** Mis cajitas (SAVINGS_GOAL). */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const cajitasRes = await query(
      `SELECT account_id, account_number, type, balance, available, label, goal_amount 
       FROM account_balances 
       WHERE user_id = $1 AND type = 'SAVINGS_GOAL';`,
      [req.userId]
    );

    res.json(cajitasRes.rows ?? []);
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

    const cajitaRes = await query<{ id: string }>(
      `INSERT INTO accounts (user_id, account_number, type, label, goal_amount) 
       VALUES ($1, $2, 'SAVINGS_GOAL', $3, $4) 
       RETURNING id;`,
      [req.userId, numCuenta, nombre, meta ?? null]
    );

    const cajitaId = cajitaRes.rows[0]?.id;
    if (!cajitaId) throw new Error('No se pudo crear la cajita');

    res.status(201).json({ cajitaId });
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

    const rpcRes = await query<{ transfer_money: string }>(
      `SELECT transfer_money($1, $2, $3, $4, $5, $6);`,
      [
        origen,
        destino,
        monto,
        'Movimiento a cajita de ahorro',
        randomUUID(),
        'GOAL_MOVE',
      ]
    );

    res.json({ transaccionId: rpcRes.rows[0]?.transfer_money });
  } catch (e) {
    next(e);
  }
});

export default router;
