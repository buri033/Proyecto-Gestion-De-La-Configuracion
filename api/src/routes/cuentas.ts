import { Router } from 'express';
import { supabase } from '../repos/supabase';
import { requireAuth } from '../middleware';

const router = Router();

/** Helper para asegurar que el perfil exista en profiles */
export async function asegurarPerfil(userId: string) {
  const docId = 'DOC-' + userId.replace(/-/g, '');
  await supabase
    .from('profiles')
    .upsert(
      { id: userId, full_name: 'Usuario', document_id: docId },
      { onConflict: 'id', ignoreDuplicates: true }
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
    let { data, error } = await supabase
      .from('account_balances')
      .select('*')
      .eq('user_id', req.userId);

    if (error) throw error;

    // 3. Auto-crear cuenta de ahorros si el usuario no tiene ninguna cuenta activa
    if (!data || data.length === 0) {
      const numCuenta = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      const { data: cuentaNueva, error: errCuenta } = await supabase
        .from('accounts')
        .insert({
          user_id: req.userId,
          account_number: numCuenta,
          type: 'SAVINGS',
          label: 'Cuenta de ahorros principal',
        })
        .select()
        .single();

      if (!errCuenta && cuentaNueva) {
        // Emitir tarjeta de debito por defecto
        const now = new Date();
        await supabase.from('cards').insert({
          account_id: cuentaNueva.id,
          card_type: 'DEBIT',
          is_virtual: true,
          last4: String(Math.floor(1000 + Math.random() * 9000)),
          exp_month: now.getMonth() + 1,
          exp_year: now.getFullYear() + 5,
        });

        // Crear notificacion de bienvenida
        await supabase.from('notifications').insert({
          user_id: req.userId,
          title: 'Bienvenido a Banco MVP',
          body: 'Tu cuenta de ahorros principal ha sido creada.',
        });
      }

      // Re-consultar saldos
      const resBal = await supabase
        .from('account_balances')
        .select('*')
        .eq('user_id', req.userId);
      data = resBal.data;
    }

    res.json(data ?? []);
  } catch (e) {
    next(e);
  }
});

/** Los movimientos de una cuenta, del mas reciente al mas antiguo. */
router.get('/:id/movimientos', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('ledger_entries')
      .select('id, amount, created_at, transactions(type, description, status)')
      .eq('account_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json(data ?? []);
  } catch (e) {
    next(e);
  }
});

/** Buscar a quien enviarle plata, por numero de cuenta. */
router.get('/buscar/:numero', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('id, account_number, profiles(full_name)')
      .eq('account_number', req.params.numero)
      .in('type', ['CHECKING', 'SAVINGS'])
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'No encontramos esa cuenta' });
      return;
    }
    res.json(data);
  } catch (e) {
    next(e);
  }
});

export default router;
