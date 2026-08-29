import { Router } from 'express';
import { Dinero } from '../domain/Dinero';
import { anualAMensual, resumenCredito } from '../domain/amortizacion';
import { requireAuth } from '../middleware';
import { query } from '../repos/db';
import type { ParametrosCredito } from '../domain/tipos';

const router = Router();

const TASA_BASE_ANUAL = 0.24;

/** Listar creditos */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const cuentasRes = await query<{ id: string }>(
      `SELECT id FROM accounts WHERE user_id = $1 AND type = 'LOAN';`,
      [req.userId]
    );

    const cuentas = cuentasRes.rows;
    if (!cuentas || cuentas.length === 0) { res.json([]); return; }

    const cuentaIds = cuentas.map((c) => c.id);

    const loansRes = await query<Record<string, any>>(
      `SELECT id, principal, rate_monthly, term_months, installment, status, disbursed_at, account_id 
       FROM loans 
       WHERE account_id = ANY($1) 
       ORDER BY disbursed_at DESC;`,
      [cuentaIds]
    );

    const loans = loansRes.rows;

    const resultado = await Promise.all((loans ?? []).map(async (loan) => {
      const cuotasRes = await query<{ amount: number; status: string }>(
        `SELECT amount, status FROM installments WHERE loan_id = $1;`,
        [loan['id']]
      );

      const cuotas = cuotasRes.rows;
      const pendientes = (cuotas ?? []).filter((c) => c.status !== 'PAID');
      const saldo = pendientes.reduce((s, c) => s + Number(c.amount), 0);

      return {
        id:                loan['id'],
        status:            loan['status'],
        total_amount:      String(loan['principal']),
        remaining_balance: String(saldo),
        monthly_payment:   String(loan['installment']),
        interest_rate:     String(Number(loan['rate_monthly']) * 12 * 100),
        term_months:       loan['term_months'],
        disbursed_at:      loan['disbursed_at'],
      };
    }));

    res.json(resultado);
  } catch (e) {
    next(e);
  }
});

/** Cuotas de un credito */
router.get('/:id/cuotas', requireAuth, async (req, res, next) => {
  try {
    const resCuotas = await query<Record<string, any>>(
      `SELECT id, number, due_date, amount, principal_part, interest_part, status, paid_at 
       FROM installments 
       WHERE loan_id = $1 
       ORDER BY number;`,
      [req.params.id]
    );

    const cuotas = (resCuotas.rows ?? []).map((c) => ({ ...c, installment_number: c['number'] }));
    res.json(cuotas);
  } catch (e) {
    next(e);
  }
});

/** Pagar una cuota */
router.post('/:prestamoId/cuotas/:cuotaId/pagar', requireAuth, async (req, res, next) => {
  try {
    const cuotaRes = await query<{ id: string; status: string; amount: number }>(
      `SELECT id, status, amount FROM installments WHERE id = $1 AND loan_id = $2;`,
      [req.params.cuotaId, req.params.prestamoId]
    );

    const cuota = cuotaRes.rows[0];
    if (!cuota) { res.status(404).json({ error: 'Cuota no encontrada' }); return; }
    if (cuota.status === 'PAID') { res.status(400).json({ error: 'Cuota ya pagada' }); return; }

    await query(
      `UPDATE installments SET status = 'PAID', paid_at = NOW() WHERE id = $1;`,
      [cuota.id]
    );

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/** SOLICITAR Y DESEMBOLSAR UN PRESTAMO */
router.post('/solicitar', requireAuth, async (req, res, next) => {
  try {
    const { monto, plazoMeses } = req.body as { monto?: number; plazoMeses?: number };
    const m = Number(monto ?? 0);
    const p = Number(plazoMeses ?? 12);

    if (m <= 0 || p <= 0) {
      res.status(400).json({ error: 'Monto y plazo deben ser mayores a cero' });
      return;
    }

    const tasaMensual = 0.02; // 2% mensual
    const cuotaMensual = Math.round((m * tasaMensual * Math.pow(1 + tasaMensual, p)) / (Math.pow(1 + tasaMensual, p) - 1));

    // 1. Obtener cualquier cuenta activa del usuario para abonar el dinero
    const cuentasRes = await query<{ id: string }>(
      `SELECT id FROM accounts WHERE user_id = $1 AND type IN ('CHECKING', 'SAVINGS');`,
      [req.userId]
    );

    let cuentaId: string | null = cuentasRes.rows[0]?.id ?? null;

    if (!cuentaId) {
      const cualquierRes = await query<{ id: string }>(
        `SELECT id FROM accounts WHERE user_id = $1 AND type <> 'SYSTEM' LIMIT 1;`,
        [req.userId]
      );
      cuentaId = cualquierRes.rows[0]?.id ?? null;
    }

    if (!cuentaId) {
      res.status(400).json({ error: 'No encontramos tu cuenta principal para el desembolso' });
      return;
    }

    // 2. Crear solicitud de credito
    const appRes = await query<{ id: string }>(
      `INSERT INTO credit_applications 
       (user_id, product, requested_amount, term_months, monthly_income, status, approved_amount, approved_rate) 
       VALUES ($1, 'LOAN', $2, $3, 3000000, 'ACCEPTED', $2, $4) 
       RETURNING id;`,
      [req.userId, m, p, tasaMensual]
    );

    const appId = appRes.rows[0]?.id;
    if (!appId) throw new Error('Error al registrar la solicitud de crédito');

    // 3. Crear cuenta tipo LOAN
    const numCuenta = 'LN-' + Math.floor(10000000 + Math.random() * 90000000).toString();
    const cuentaLoanRes = await query<{ id: string }>(
      `INSERT INTO accounts (user_id, account_number, type, label, interest_rate) 
       VALUES ($1, $2, 'LOAN', 'Préstamo personal', $3) 
       RETURNING id;`,
      [req.userId, numCuenta, tasaMensual]
    );

    const cuentaLoanId = cuentaLoanRes.rows[0]?.id;
    if (!cuentaLoanId) throw new Error('Error al crear la cuenta del préstamo');

    // 4. Crear transaccion y asientos contables (ledger entries)
    const idemKey = `loan-disburse-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const txRes = await query<{ id: string }>(
      `INSERT INTO transactions (type, status, description, idempotency_key) 
       VALUES ('LOAN_DISBURSEMENT', 'POSTED', $1, $2) 
       RETURNING id;`,
      [`Desembolso de préstamo a ${p} meses`, idemKey]
    );

    const txId = txRes.rows[0]?.id;
    if (!txId) throw new Error('Error al registrar la transacción de desembolso');

    await query(
      `INSERT INTO ledger_entries (transaction_id, account_id, amount) VALUES 
       ($1, $2, $3), 
       ($1, $4, $5);`,
      [txId, cuentaLoanId, -m, cuentaId, m]
    );

    // 5. Crear objeto loan
    const loanRes = await query<{ id: string }>(
      `INSERT INTO loans (account_id, application_id, principal, rate_monthly, term_months, installment, status) 
       VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE') 
       RETURNING id;`,
      [cuentaLoanId, appId, m, tasaMensual, p, cuotaMensual]
    );

    const loanId = loanRes.rows[0]?.id;
    if (!loanId) throw new Error('Error al crear el registro del préstamo');

    // 6. Generar cuotas en installments
    let saldo = m;
    const hoy = new Date();

    for (let i = 1; i <= p; i++) {
      const interes = saldo * tasaMensual;
      const abonoCapital = cuotaMensual - interes;
      saldo = Math.max(0, saldo - abonoCapital);
      const fechaVenc = new Date(hoy.getFullYear(), hoy.getMonth() + i, hoy.getDate());

      await query(
        `INSERT INTO installments (loan_id, number, due_date, amount, principal_part, interest_part, status) 
         VALUES ($1, $2, $3, $4, $5, $6, 'PENDING');`,
        [
          loanId,
          i,
          fechaVenc.toISOString().split('T')[0],
          Math.round(cuotaMensual),
          Math.round(abonoCapital),
          Math.round(interes),
        ]
      );
    }

    // 7. Notificación
    await query(
      `INSERT INTO notifications (user_id, title, body) VALUES ($1, '¡Préstamo Desembolsado!', $2);`,
      [req.userId, `Se ha abonado $${m.toLocaleString('es-CO')} a tu cuenta.`]
    );

    res.json({
      ok: true,
      mensaje: `¡Préstamo de $${m.toLocaleString('es-CO')} aprobado y abonado a tu cuenta!`,
      prestamoId: loanId,
    });
  } catch (e) {
    next(e);
  }
});

const PARAMETROS: ParametrosCredito = {
  ingresoMinimo: Dinero.dePesos(1_423_500),
  montoMinimo: Dinero.dePesos(500_000),
  montoMaximo: Dinero.dePesos(20_000_000),
  maxCuotaIngreso: 0.30,
};

/** SIMULACION */
router.post('/simular', (req, res) => {
  const { monto, plazoMeses } = req.body as { monto?: number; plazoMeses?: number };

  if (typeof monto !== 'number' || typeof plazoMeses !== 'number') {
    res.status(400).json({ error: 'Necesito monto y plazoMeses' });
    return;
  }

  const tasaMensual = anualAMensual(TASA_BASE_ANUAL);
  const resumen = resumenCredito(Dinero.dePesos(monto), tasaMensual, plazoMeses);

  res.json({
    cuotaMensual: resumen.cuotaMensual.pesos,
    totalPagado: resumen.totalPagado.pesos,
    totalInteres: resumen.totalInteres.pesos,
    tasaAnual: TASA_BASE_ANUAL,
    tabla: resumen.tabla.map((f) => ({
      numero: f.numero,
      cuota: f.cuota.pesos,
      interes: f.interes.pesos,
      abonoCapital: f.abonoCapital.pesos,
      saldoRestante: f.saldoRestante.pesos,
    })),
  });
});

export default router;
