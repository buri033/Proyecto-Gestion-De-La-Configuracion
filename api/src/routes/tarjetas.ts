import { Router } from 'express';
import { supabase } from '../repos/supabase';
import { requireAuth } from '../middleware';
import { asegurarPerfil } from './cuentas';

const router = Router();

/** Mis tarjetas virtuales y físicas. */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { data: cuentas, error: errCuentas } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', req.userId);

    if (errCuentas) throw errCuentas;
    if (!cuentas || cuentas.length === 0) { res.json([]); return; }

    const cuentaIds = cuentas.map((c) => c.id);

    const { data, error } = await supabase
      .from('cards')
      .select('id, card_type, status, is_virtual, last4, exp_month, exp_year, account_id')
      .in('account_id', cuentaIds);

    if (error) throw error;
    res.json(data ?? []);
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

    let { data: cuentas } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', req.userId)
      .in('type', ['CHECKING', 'SAVINGS']);

    if (!cuentas || cuentas.length === 0) {
      // Auto-crear cuenta de ahorros si no tiene
      const numCuenta = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      const { data: cuentaNueva } = await supabase
        .from('accounts')
        .insert({
          user_id: req.userId,
          account_number: numCuenta,
          type: 'SAVINGS',
          label: 'Cuenta de ahorros principal',
        })
        .select('id')
        .single();

      if (cuentaNueva) {
        cuentas = [cuentaNueva];
      }
    }

    if (!cuentas || cuentas.length === 0) {
      res.status(400).json({ error: 'No tienes una cuenta de ahorros activa para asociar la tarjeta' });
      return;
    }

    const cuentaId = (cuentas[0] as { id: string }).id;
    const now = new Date();

    const { data: tarjeta, error } = await supabase
      .from('cards')
      .insert({
        account_id: cuentaId,
        card_type: 'DEBIT',
        is_virtual: true,
        last4: String(Math.floor(1000 + Math.random() * 9000)),
        exp_month: now.getMonth() + 1,
        exp_year: now.getFullYear() + 5,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from('notifications').insert({
      user_id: req.userId,
      title: 'Nueva Tarjeta de Débito',
      body: `Se ha emitido tu nueva tarjeta de débito terminada en ${tarjeta.last4}.`,
    });

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
    const { data: cuentas } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', req.userId);

    if (cuentas && cuentas.length > 0) {
      const cuentaIds = cuentas.map((c) => c.id);

      // 2. Verificar si ya posee una tarjeta de credito
      const { data: existente } = await supabase
        .from('cards')
        .select('id')
        .in('account_id', cuentaIds)
        .eq('card_type', 'CREDIT')
        .maybeSingle();

      if (existente) {
        res.status(400).json({ error: 'Ya tienes una tarjeta de crédito activa (máximo 1 por usuario).' });
        return;
      }
    }

    // 3. Crear cuenta tipo CREDIT_CARD
    const numCuenta = 'CC-' + Math.floor(10000000 + Math.random() * 90000000).toString();
    const { data: cuenta, error: errCuenta } = await supabase
      .from('accounts')
      .insert({
        user_id: req.userId,
        account_number: numCuenta,
        type: 'CREDIT_CARD',
        label: 'Tarjeta de Crédito Visa',
        credit_limit: 2000000,
        interest_rate: 0.02,
        cutoff_day: 25,
      })
      .select()
      .single();

    if (errCuenta) throw errCuenta;

    // 4. Crear la tarjeta de crédito
    const now = new Date();
    const { data: tarjeta, error: errTarjeta } = await supabase
      .from('cards')
      .insert({
        account_id: cuenta.id,
        card_type: 'CREDIT',
        is_virtual: true,
        last4: String(Math.floor(1000 + Math.random() * 9000)),
        exp_month: now.getMonth() + 1,
        exp_year: now.getFullYear() + 5,
      })
      .select()
      .single();

    if (errTarjeta) throw errTarjeta;

    // 5. Notificación
    await supabase.from('notifications').insert({
      user_id: req.userId,
      title: '¡Tarjeta de Crédito Aprobada!',
      body: 'Tu tarjeta de crédito con cupo de $2.000.000 ya está lista para usar.',
    });

    res.status(201).json(tarjeta);
  } catch (e) {
    next(e);
  }
});

export default router;
