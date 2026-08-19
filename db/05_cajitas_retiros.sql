-- =====================================================================
-- CAJITAS Y RETIROS
-- Corre despues de 02_functions.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- RETIRO — saca plata de la cuenta del usuario hacia la caja sistema
-- ---------------------------------------------------------------------
create or replace function withdraw_money(
  p_from_account uuid,
  p_amount       numeric,
  p_idem_key     text
) returns uuid
language plpgsql security definer as $$
declare v_caja uuid;
begin
  select id into v_caja from accounts where account_number = 'SYS-0000000001';
  return transfer_money(p_from_account, v_caja, p_amount, 'Retiro', p_idem_key, 'WITHDRAWAL');
end; $$;

-- ---------------------------------------------------------------------
-- CREAR CAJITA — crea una cuenta SAVINGS_GOAL con meta opcional
-- ---------------------------------------------------------------------
create or replace function crear_cajita(
  p_user_id    uuid,
  p_label      text,
  p_meta       numeric default null
) returns uuid
language plpgsql security definer as $$
declare v_cajita_id uuid;
begin
  insert into accounts (user_id, account_number, type, label, goal_amount)
  values (p_user_id, generar_numero_cuenta(), 'SAVINGS_GOAL', p_label, p_meta)
  returning id into v_cajita_id;

  insert into notifications (user_id, title, body)
  values (p_user_id, 'Cajita creada', 'Tu cajita "' || p_label || '" ya esta lista.');

  return v_cajita_id;
end; $$;

-- Politica RLS para cajitas (SAVINGS_GOAL son parte de accounts — ya cubierto)
-- No se necesita politica extra.
