import { Router } from 'express';
import { query } from '../repos/db';
import { requireAuth } from '../middleware';

const router = Router();

/** Mis prestamos activos con sus cuotas contadas. */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    // Obtener cuentas LOAN del usuario
    const cuentasRes = await query<{ id: string }>(
      `SELECT id FROM accounts WHERE user_id = $1 AND type = 'LOAN';`,
      [req.userId]
    );

    const cuentas = cuentasRes.rows;
    if (!cuentas || cuentas.length === 0) { res.json([]); return; }

    const cuentaIds = cuentas.map((c) => c.id);

    const loansRes = await query(
      `SELECT id, principal, rate_monthly, term_months, installment, status, disbursed_at, account_id 
       FROM loans 
       WHERE account_id = ANY($1) 
       ORDER BY disbursed_at DESC;`,
      [cuentaIds]
    );

    res.json(loansRes.rows ?? []);
  } catch (e) {
    next(e);
  }
});

/** Cuotas de un prestamo — mapea `number` → `installment_number` para el cliente movil. */
router.get('/:id/cuotas', requireAuth, async (req, res, next) => {
  try {
    const cuotasRes = await query<Record<string, any>>(
      `SELECT id, number, due_date, amount, principal_part, interest_part, status, paid_at 
       FROM installments 
       WHERE loan_id = $1 
       ORDER BY number;`,
      [req.params.id]
    );

    // Renombramos `number` a `installment_number` para mantener consistencia
    const cuotas = (cuotasRes.rows ?? []).map((c) => ({
      ...c,
      installment_number: c.number,
    }));

    res.json(cuotas);
  } catch (e) {
    next(e);
  }
});

/** Pagar una cuota especifica. */
router.post('/:prestamoId/cuotas/:cuotaId/pagar', requireAuth, async (req, res, next) => {
  try {
    const cuotaRes = await query<{ id: string; status: string; amount: number; loan_id: string }>(
      `SELECT id, amount, status, loan_id 
       FROM installments 
       WHERE id = $1 AND loan_id = $2;`,
      [req.params.cuotaId, req.params.prestamoId]
    );

    const cuota = cuotaRes.rows[0];
    if (!cuota) {
      res.status(404).json({ error: 'Cuota no encontrada' });
      return;
    }
    if (cuota.status === 'PAID') {
      res.status(400).json({ error: 'Esta cuota ya fue pagada' });
      return;
    }

    await query(
      `UPDATE installments SET status = 'PAID', paid_at = NOW() WHERE id = $1;`,
      [cuota.id]
    );

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
