import { Router } from 'express';
import { Dinero } from '../domain/Dinero';
import { anualAMensual, calcularCuota, resumenCredito } from '../domain/amortizacion';
import { evaluarSolicitud } from '../domain/scoring';
import { requireAuth } from '../middleware';
import { supabase } from '../repos/supabase';
import type { ParametrosCredito, Solicitud } from '../domain/tipos';

const router = Router();

const TASA_BASE_ANUAL = 0.24;

/** Listar creditos */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { data: cuentas, error: errCuentas } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', req.userId)
      .eq('type', 'LOAN');

    if (errCuentas) throw errCuentas;
    if (!cuentas || cuentas.length === 0) { res.json([]); return; }

    const cuentaIds = cuentas.map((c: { id: string }) => c.id);

    const { data: loans, error } = await supabase
      .from('loans')
      .select('id, principal, rate_monthly, term_months, installment, status, disbursed_at, account_id')
      .in('account_id', cuentaIds)
      .order('disbursed_at', { ascending: false });

    if (error) throw error;

    const resultado = await Promise.all((loans ?? []).map(async (loan: Record<string, unknown>) => {
      const { data: cuotas } = await supabase
        .from('installments')
        .select('amount, status')
        .eq('loan_id', loan['id']);

      const pendientes = (cuotas ?? []).filter((c: { status: string }) => c.status !== 'PAID');
      const saldo = pendientes.reduce((s: number, c: { amount: number }) => s + Number(c.amount), 0);

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
    const { data, error } = await supabase
      .from('installments')
      .select('id, number, due_date, amount, principal_part, interest_part, status, paid_at')
      .eq('loan_id', req.params.id)
      .order('number');

    if (error) throw error;
    const cuotas = (data ?? []).map((c: Record<string, unknown>) => ({ ...c, installment_number: c['number'] }));
    res.json(cuotas);
  } catch (e) {
    next(e);
  }
});

/** Pagar una cuota */
router.post('/:prestamoId/cuotas/:cuotaId/pagar', requireAuth, async (req, res, next) => {
  try {
    const { data: cuota, error: errCuota } = await supabase
      .from('installments')
      .select('id, status, amount')
      .eq('id', req.params.cuotaId)
      .eq('loan_id', req.params.prestamoId)
      .single();

    if (errCuota || !cuota) { res.status(404).json({ error: 'Cuota no encontrada' }); return; }
    if ((cuota as { status: string }).status === 'PAID') { res.status(400).json({ error: 'Cuota ya pagada' }); return; }

    const { error } = await supabase
      .from('installments')
      .update({ status: 'PAID', paid_at: new Date().toISOString() })
      .eq('id', (cuota as { id: string }).id);

    if (error) throw error;
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
    const { data: cuentas } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', req.userId)
      .in('type', ['CHECKING', 'SAVINGS']);

    let cuentaId: string | null = cuentas && cuentas.length > 0 && cuentas[0] ? (cuentas[0] as { id: string }).id : null;

    if (!cuentaId) {
      const { data: cualquierCuenta } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', req.userId)
        .neq('type', 'SYSTEM')
        .limit(1);
      cuentaId = cualquierCuenta && cualquierCuenta.length > 0 && cualquierCuenta[0] ? (cualquierCuenta[0] as { id: string }).id : null;
    }

    if (!cuentaId) {
      res.status(400).json({ error: 'No encontramos tu cuenta principal para el desembolso' });
      return;
    }

    // 2. Crear solicitud de credito
    const { data: app, error: errApp } = await supabase
      .from('credit_applications')
      .insert({
        user_id: req.userId,
        product: 'LOAN',
        requested_amount: m,
        term_months: p,
        monthly_income: 3000000,
        status: 'ACCEPTED',
        approved_amount: m,
        approved_rate: tasaMensual,
      })
      .select('id')
      .single();

    if (errApp) throw errApp;

    // 3. Crear cuenta tipo LOAN
    const numCuenta = 'LN-' + Math.floor(10000000 + Math.random() * 90000000).toString();
    const { data: cuentaLoan, error: errLoanAcc } = await supabase
      .from('accounts')
      .insert({
        user_id: req.userId,
        account_number: numCuenta,
        type: 'LOAN',
        label: 'Préstamo personal',
        interest_rate: tasaMensual,
      })
      .select('id')
      .single();

    if (errLoanAcc) throw errLoanAcc;

    // 4. Crear transaccion y asientos contables (ledger entries)
    const idemKey = `loan-disburse-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const { data: tx, error: errTx } = await supabase
      .from('transactions')
      .insert({
        type: 'LOAN_DISBURSEMENT',
        status: 'POSTED',
        description: `Desembolso de préstamo a ${p} meses`,
        idempotency_key: idemKey,
      })
      .select('id')
      .single();

    if (errTx) throw errTx;

    await supabase.from('ledger_entries').insert([
      { transaction_id: tx.id, account_id: cuentaLoan.id, amount: -m },
      { transaction_id: tx.id, account_id: cuentaId, amount: m },
    ]);

    // 5. Crear objeto loan
    const { data: loanObj, error: errLoan } = await supabase
      .from('loans')
      .insert({
        account_id: cuentaLoan.id,
        application_id: app.id,
        principal: m,
        rate_monthly: tasaMensual,
        term_months: p,
        installment: cuotaMensual,
        status: 'ACTIVE',
      })
      .select('id')
      .single();

    if (errLoan) throw errLoan;

    // 6. Generar cuotas en installments
    let saldo = m;
    const cuotasInsert = [];
    const hoy = new Date();

    for (let i = 1; i <= p; i++) {
      const interes = saldo * tasaMensual;
      const abonoCapital = cuotaMensual - interes;
      saldo = Math.max(0, saldo - abonoCapital);
      const fechaVenc = new Date(hoy.getFullYear(), hoy.getMonth() + i, hoy.getDate());

      cuotasInsert.push({
        loan_id: loanObj.id,
        number: i,
        due_date: fechaVenc.toISOString().split('T')[0],
        amount: Math.round(cuotaMensual),
        principal_part: Math.round(abonoCapital),
        interest_part: Math.round(interes),
        status: 'PENDING',
      });
    }

    await supabase.from('installments').insert(cuotasInsert);

    // 7. Notificación
    await supabase.from('notifications').insert({
      user_id: req.userId,
      title: '¡Préstamo Desembolsado!',
      body: `Se ha abonado $${m.toLocaleString('es-CO')} a tu cuenta.`,
    });

    res.json({
      ok: true,
      mensaje: `¡Préstamo de $${m.toLocaleString('es-CO')} aprobado y abonado a tu cuenta!`,
      prestamoId: loanObj.id,
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
