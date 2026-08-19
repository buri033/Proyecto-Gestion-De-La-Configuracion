import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { supabase } from '../repos/supabase';
import { requireAuth } from '../middleware';

const router = Router();

interface CuerpoTransferencia {
  origen?: string;
  destino?: string;
  monto?: number;
  descripcion?: string;
  claveIdempotencia?: string;
}

/** Transferencia entre dos usuarios. */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { origen, destino, monto, descripcion, claveIdempotencia } =
      req.body as CuerpoTransferencia;

    if (!origen || !destino || typeof monto !== 'number') {
      res.status(400).json({ error: 'Faltan datos: origen, destino y monto' });
      return;
    }

    const { data, error } = await supabase.rpc('transfer_money', {
      p_from_account: origen,
      p_to_account: destino,
      p_amount: monto,
      p_description: descripcion ?? 'Transferencia entre cuentas',
      p_idem_key: claveIdempotencia ?? randomUUID(),
      p_type: 'TRANSFER',
    });

    if (error) throw error;
    res.json({ transaccionId: data });
  } catch (e) {
    next(e);
  }
});

/** Recargar dinero desde la caja del sistema SYS-0000000001. */
router.post('/recarga', requireAuth, async (req, res, next) => {
  try {
    const { destino, monto, claveIdempotencia } = req.body as CuerpoTransferencia;

    if (!destino || typeof monto !== 'number' || monto <= 0) {
      res.status(400).json({ error: 'Ingresa un monto válido para recargar' });
      return;
    }

    // Buscar la cuenta caja del sistema
    const { data: caja, error: errCaja } = await supabase
      .from('accounts')
      .select('id')
      .eq('account_number', 'SYS-0000000001')
      .single();

    if (errCaja || !caja) {
      res.status(500).json({ error: 'Error interno: Caja del sistema no configurada' });
      return;
    }

    const { data, error } = await supabase.rpc('transfer_money', {
      p_from_account: caja.id,
      p_to_account: destino,
      p_amount: monto,
      p_description: 'Recarga de dinero',
      p_idem_key: claveIdempotencia ?? randomUUID(),
      p_type: 'DEPOSIT',
    });

    if (error) throw error;
    res.json({ transaccionId: data });
  } catch (e) {
    next(e);
  }
});

/** Retirar dinero hacia la caja del sistema SYS-0000000001. */
router.post('/retiro', requireAuth, async (req, res, next) => {
  try {
    const { origen, monto, claveIdempotencia } = req.body as CuerpoTransferencia;

    if (!origen || typeof monto !== 'number' || monto <= 0) {
      res.status(400).json({ error: 'Ingresa un monto válido para retirar' });
      return;
    }

    const { data: caja, error: errCaja } = await supabase
      .from('accounts')
      .select('id')
      .eq('account_number', 'SYS-0000000001')
      .single();

    if (errCaja || !caja) {
      res.status(500).json({ error: 'Error interno: Caja del sistema no configurada' });
      return;
    }

    const { data, error } = await supabase.rpc('transfer_money', {
      p_from_account: origen,
      p_to_account: caja.id,
      p_amount: monto,
      p_description: 'Retiro de efectivo',
      p_idem_key: claveIdempotencia ?? randomUUID(),
      p_type: 'WITHDRAWAL',
    });

    if (error) throw error;
    res.json({ transaccionId: data });
  } catch (e) {
    next(e);
  }
});

export default router;
