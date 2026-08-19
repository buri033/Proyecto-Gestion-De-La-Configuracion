import { Router } from 'express';
import { supabase } from '../repos/supabase';
import { requireAuth } from '../middleware';

const router = Router();

/** Mis prestamos activos con sus cuotas contadas. */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    // Obtener cuentas LOAN del usuario
    const { data: cuentas, error: errCuentas } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', req.userId)
      .eq('type', 'LOAN');

    if (errCuentas) throw errCuentas;
    if (!cuentas || cuentas.length === 0) { res.json([]); return; }

    const cuentaIds = cuentas.map((c) => c.id);

    const { data, error } = await supabase
      .from('loans')
      .select('id, principal, rate_monthly, term_months, installment, status, disbursed_at, account_id')
      .in('account_id', cuentaIds)
      .order('disbursed_at', { ascending: false });

    if (error) throw error;
    res.json(data ?? []);
  } catch (e) {
    next(e);
  }
});

/** Cuotas de un prestamo — mapea `number` → `installment_number` para el cliente movil. */
router.get('/:id/cuotas', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('installments')
      .select('id, number, due_date, amount, principal_part, interest_part, status, paid_at')
      .eq('loan_id', req.params.id)
      .order('number');

    if (error) throw error;

    // Renombramos `number` a `installment_number` para mantener consistencia
    const cuotas = (data ?? []).map((c) => ({
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
    const { data: cuota, error: errCuota } = await supabase
      .from('installments')
      .select('id, amount, status, loan_id')
      .eq('id', req.params.cuotaId)
      .eq('loan_id', req.params.prestamoId)
      .single();

    if (errCuota || !cuota) {
      res.status(404).json({ error: 'Cuota no encontrada' });
      return;
    }
    if (cuota.status === 'PAID') {
      res.status(400).json({ error: 'Esta cuota ya fue pagada' });
      return;
    }

    const { error } = await supabase
      .from('installments')
      .update({ status: 'PAID', paid_at: new Date().toISOString() })
      .eq('id', cuota.id);

    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
