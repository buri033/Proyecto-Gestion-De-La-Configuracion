import { Router } from 'express';
import { query } from '../repos/db';
import { requireAuth } from '../middleware';
import { asegurarPerfil } from './cuentas';

const router = Router();

/** Mis tarjetas virtuales y físicas. */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const cuentasRes = await query<{ id: string }>(
      `SELECT id FROM accounts WHERE user_id = $1;`,
      [req.userId]
    );

    const cuentas = cuentasRes.rows;
    if (!cuentas || cuentas.length === 0) { res.json([]); return; }

    const cuentaIds = cuentas.map((c) => c.id);

    const cardsRes = await query(
      `SELECT id, card_type, status, is_virtual, last4, exp_month, exp_year, account_id 
       FROM cards 
       WHERE account_id = ANY($1);`,
      [cuentaIds]
    );

    res.json(cardsRes.rows ?? []);
  } catch (e) {
    next(e);
  }
});

/** Solicitar tarjeta de DÉBITO adicional */
router.post('/debito', requireAuth, async (req, res, next) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    await asegurarPerfil(req.userId);

    let cuentasRes = await query<{ id: string }>(
      `SELECT id FROM accounts WHERE user_id = $1 AND type IN ('CHECKING', 'SAVINGS');`,
      [req.userId]
    );

    let cuentas = cuentasRes.rows;

    if (!cuentas || cuentas.length === 0) {
      // Auto-crear cuenta de ahorros si no tiene
      const numCuenta = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      const nuevaCuentaRes = await query<{ id: string }>(
        `INSERT INTO accounts (user_id, account_number, type, label) 
         VALUES ($1, $2, 'SAVINGS', 'Cuenta de ahorros principal') 
         RETURNING id;`,
        [req.userId, numCuenta]
      );

      cuentas = nuevaCuentaRes.rows;
    }

    const cuentaId = cuentas[0]?.id;
    if (!cuentaId) {
      res.status(400).json({ error: 'No tienes una cuenta de ahorros activa para asociar la tarjeta' });
      return;
    }

    const now = new Date();

    const last4 = String(Math.floor(1000 + Math.random() * 9000));
    const cardRes = await query(
      `INSERT INTO cards (account_id, card_type, is_virtual, last4, exp_month, exp_year) 
       VALUES ($1, 'DEBIT', true, $2, $3, $4) 
       RETURNING id, card_type, status, is_virtual, last4, exp_month, exp_year, account_id;`,
      [cuentaId, last4, now.getMonth() + 1, now.getFullYear() + 5]
    );

    const tarjeta = cardRes.rows[0];

    await query(
      `INSERT INTO notifications (user_id, title, body) VALUES ($1, 'Nueva Tarjeta de Débito', $2);`,
      [req.userId, `Se ha emitido tu nueva tarjeta de débito terminada en ${tarjeta.last4}.`]
    );

    res.status(201).json(tarjeta);
  } catch (e) {
    next(e);
  }
});

/** Solicitar tarjeta de CRÉDITO virtual (Máximo 1 por usuario). */
router.post('/credito', requireAuth, async (req, res, next) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    await asegurarPerfil(req.userId);

    // 1. Obtener todas las cuentas del usuario
    const cuentasRes = await query<{ id: string }>(
      `SELECT id FROM accounts WHERE user_id = $1;`,
      [req.userId]
    );

    const cuentas = cuentasRes.rows;
    if (cuentas && cuentas.length > 0) {
      const cuentaIds = cuentas.map((c) => c.id);

      // 2. Verificar si ya posee una tarjeta de credito
      const existenteRes = await query<{ id: string }>(
        `SELECT id FROM cards WHERE account_id = ANY($1) AND card_type = 'CREDIT' LIMIT 1;`,
        [cuentaIds]
      );

      if (existenteRes.rows.length > 0) {
        res.status(400).json({ error: 'Ya tienes una tarjeta de crédito activa (máximo 1 por usuario).' });
        return;
      }
    }

    // 3. Crear cuenta tipo CREDIT_CARD
    const numCuenta = 'CC-' + Math.floor(10000000 + Math.random() * 90000000).toString();
    const cuentaRes = await query<{ id: string }>(
      `INSERT INTO accounts (user_id, account_number, type, label, credit_limit, interest_rate, cutoff_day) 
       VALUES ($1, $2, 'CREDIT_CARD', 'Tarjeta de Crédito Visa', 2000000, 0.02, 25) 
       RETURNING id;`,
      [req.userId, numCuenta]
    );

    const cuenta = cuentaRes.rows[0];
    if (!cuenta) throw new Error('Error al crear la cuenta de tarjeta de crédito');

    // 4. Crear la tarjeta de crédito
    const now = new Date();
    const last4 = String(Math.floor(1000 + Math.random() * 9000));
    const cardRes = await query(
      `INSERT INTO cards (account_id, card_type, is_virtual, last4, exp_month, exp_year) 
       VALUES ($1, 'CREDIT', true, $2, $3, $4) 
       RETURNING id, card_type, status, is_virtual, last4, exp_month, exp_year, account_id;`,
      [cuenta.id, last4, now.getMonth() + 1, now.getFullYear() + 5]
    );

    const tarjeta = cardRes.rows[0];

    // 5. Notificación
    await query(
      `INSERT INTO notifications (user_id, title, body) VALUES ($1, '¡Tarjeta de Crédito Aprobada!', 'Tu tarjeta de crédito con cupo de $2.000.000 ya está lista para usar.');`,
      [req.userId]
    );

    res.status(201).json(tarjeta);
  } catch (e) {
    next(e);
  }
});

export default router;
