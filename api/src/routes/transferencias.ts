import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { query } from '../repos/db';
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

    const resRpc = await query<{ transfer_money: string }>(
      `SELECT transfer_money($1, $2, $3, $4, $5, $6);`,
      [
        origen,
        destino,
        monto,
        descripcion ?? 'Transferencia entre cuentas',
        claveIdempotencia ?? randomUUID(),
        'TRANSFER',
      ]
    );

    res.json({ transaccionId: resRpc.rows[0]?.transfer_money });
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
    const resCaja = await query<{ id: string }>(
      `SELECT id FROM accounts WHERE account_number = 'SYS-0000000001' LIMIT 1;`
    );

    const caja = resCaja.rows[0];
    if (!caja) {
      res.status(500).json({ error: 'Error interno: Caja del sistema no configurada' });
      return;
    }

    const resRpc = await query<{ transfer_money: string }>(
      `SELECT transfer_money($1, $2, $3, $4, $5, $6);`,
      [
        caja.id,
        destino,
        monto,
        'Recarga de dinero',
        claveIdempotencia ?? randomUUID(),
        'DEPOSIT',
      ]
    );

    res.json({ transaccionId: resRpc.rows[0]?.transfer_money });
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

    const resCaja = await query<{ id: string }>(
      `SELECT id FROM accounts WHERE account_number = 'SYS-0000000001' LIMIT 1;`
    );

    const caja = resCaja.rows[0];
    if (!caja) {
      res.status(500).json({ error: 'Error interno: Caja del sistema no configurada' });
      return;
    }

    const resRpc = await query<{ transfer_money: string }>(
      `SELECT transfer_money($1, $2, $3, $4, $5, $6);`,
      [
        origen,
        caja.id,
        monto,
        'Retiro de efectivo',
        claveIdempotencia ?? randomUUID(),
        'WITHDRAWAL',
      ]
    );

    res.json({ transaccionId: resRpc.rows[0]?.transfer_money });
  } catch (e) {
    next(e);
  }
});

export default router;
