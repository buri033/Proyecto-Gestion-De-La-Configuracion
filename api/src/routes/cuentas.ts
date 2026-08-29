import { Router } from 'express';
import { query } from '../repos/db';
import { requireAuth } from '../middleware';

const router = Router();

/** Helper para asegurar que el perfil exista en profiles */
export async function asegurarPerfil(userId: string) {
  const docId = 'DOC-' + userId.replace(/-/g, '').substring(0, 10);
  await query(
    `INSERT INTO profiles (id, full_name, document_id) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING;`,
    [userId, 'Usuario', docId]
  );
}

/** Mis cuentas con su saldo calculado por la vista account_balances. */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    // 1. Asegurar que exista perfil en la tabla profiles
    await asegurarPerfil(req.userId);

    // 2. Obtener cuentas del usuario
    let accountsRes = await query(
      `SELECT * FROM account_balances WHERE user_id = $1;`,
      [req.userId]
    );

    let data = accountsRes.rows;

    // 3. Auto-crear cuenta de ahorros si el usuario no tiene ninguna cuenta activa
    if (!data || data.length === 0) {
      const numCuenta = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      const nuevaCuentaRes = await query<{ id: string }>(
        `INSERT INTO accounts (user_id, account_number, type, label) VALUES ($1, $2, 'SAVINGS', 'Cuenta de ahorros principal') RETURNING id;`,
        [req.userId, numCuenta]
      );

      const cuentaNueva = nuevaCuentaRes.rows[0];
      if (cuentaNueva) {
        // Emitir tarjeta de debito por defecto
        const now = new Date();
        await query(
          `INSERT INTO cards (account_id, card_type, is_virtual, last4, exp_month, exp_year) VALUES ($1, 'DEBIT', true, $2, $3, $4);`,
          [
            cuentaNueva.id,
            String(Math.floor(1000 + Math.random() * 9000)),
            now.getMonth() + 1,
            now.getFullYear() + 5,
          ]
        );

        // Crear notificacion de bienvenida
        await query(
          `INSERT INTO notifications (user_id, title, body) VALUES ($1, 'Bienvenido a Banco MVP', 'Tu cuenta de ahorros principal ha sido creada.');`,
          [req.userId]
        );
      }

      // Re-consultar saldos
      const resBal = await query(
        `SELECT * FROM account_balances WHERE user_id = $1;`,
        [req.userId]
      );
      data = resBal.rows;
    }

    res.json(data ?? []);
  } catch (e) {
    next(e);
  }
});

/** Los movimientos de una cuenta, del mas reciente al mas antiguo. */
router.get('/:id/movimientos', requireAuth, async (req, res, next) => {
  try {
    const resMovs = await query(
      `SELECT le.id, le.amount, le.created_at, json_build_object('type', t.type, 'description', t.description, 'status', t.status) as transactions
       FROM ledger_entries le
       JOIN transactions t ON t.id = le.transaction_id
       WHERE le.account_id = $1
       ORDER BY le.created_at DESC
       LIMIT 50;`,
      [req.params.id]
    );

    res.json(resMovs.rows ?? []);
  } catch (e) {
    next(e);
  }
});

/** Buscar a quien enviarle plata, por numero de cuenta. */
router.get('/buscar/:numero', requireAuth, async (req, res, next) => {
  try {
    const resAccount = await query(
      `SELECT a.id, a.account_number, json_build_object('full_name', p.full_name) as profiles
       FROM accounts a
       LEFT JOIN profiles p ON p.id = a.user_id
       WHERE a.account_number = $1 AND a.type IN ('CHECKING', 'SAVINGS')
       LIMIT 1;`,
      [req.params.numero]
    );

    if (resAccount.rows.length === 0) {
      res.status(404).json({ error: 'No encontramos esa cuenta' });
      return;
    }
    res.json(resAccount.rows[0]);
  } catch (e) {
    next(e);
  }
});

export default router;
