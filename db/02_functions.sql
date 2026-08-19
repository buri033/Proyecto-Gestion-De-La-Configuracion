-- =====================================================================
-- FUNCIONES DE NEGOCIO
-- Aqui vive la atomicidad. Si algo lanza excepcion, Postgres revierte TODO.
-- =====================================================================

-- Numero de cuenta de 10 digitos con digito verificador
create or replace function generar_numero_cuenta() returns text
language plpgsql as $$
declare
  base text;
  suma int := 0;
  dv   int;
begin
  loop
    suma := 0; -- Reiniciar suma en cada iteracion
    base := lpad((floor(random() * 1000000000))::bigint::text, 9, '0');
    select sum((substring(base, i, 1))::int * (case when i % 2 = 1 then 3 else 1 end))
      into suma from generate_series(1, 9) as i;
    dv := (10 - (suma % 10)) % 10;
    exit when not exists (select 1 from accounts where account_number = base || dv::text);
  end loop;
  return base || dv::text;
end; $$;

-- ---------------------------------------------------------------------
-- Se dispara al crear un usuario en auth.users: crea perfil, cuenta y tarjeta
-- Totalmente blindada ante datos nulos, cadenas vacias y excepciones.
-- ---------------------------------------------------------------------
create or replace function crear_cuenta_al_registrarse() returns trigger
language plpgsql security definer as $$
declare
  v_account_id uuid;
  v_doc_id text;
  v_birth_date date;
begin
  -- 1. Preparar document_id unico garantizado
  v_doc_id := new.raw_user_meta_data->>'document_id';
  if v_doc_id is null or trim(v_doc_id) = '' then
    v_doc_id := 'DOC-' || replace(new.id::text, '-', '');
  end if;

  -- 2. Parsear birth_date de forma totalmente segura
  begin
    if new.raw_user_meta_data->>'birth_date' is not null and trim(new.raw_user_meta_data->>'birth_date') <> '' then
      v_birth_date := (new.raw_user_meta_data->>'birth_date')::date;
    else
      v_birth_date := null;
    end if;
  exception when others then
    v_birth_date := null;
  end;

  -- 3. Crear perfil de usuario
  insert into profiles (id, full_name, document_id, phone, birth_date)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), new.email, 'Usuario'),
    v_doc_id,
    nullif(trim(new.raw_user_meta_data->>'phone'), ''),
    v_birth_date
  )
  on conflict (id) do update set
    full_name = excluded.full_name;

  -- 4. Crear cuenta bancaria por defecto con el tipo elegido (SAVINGS o CHECKING)
  insert into accounts (user_id, account_number, type, label)
  values (
    new.id,
    generar_numero_cuenta(),
    coalesce((new.raw_user_meta_data->>'account_type')::account_type, 'SAVINGS'::account_type),
    case when new.raw_user_meta_data->>'account_type' = 'CHECKING' then 'Cuenta corriente' else 'Cuenta de ahorros principal' end
  )
  returning id into v_account_id;

  -- 5. Emitir tarjeta de débito predeterminada
  insert into cards (account_id, card_type, is_virtual, last4, exp_month, exp_year)
  values (
    v_account_id, 'DEBIT', true,
    lpad((floor(random() * 10000))::int::text, 4, '0'),
    extract(month from now())::smallint,
    (extract(year from now()) + 5)::smallint
  );

  -- 6. Crear notificacion de bienvenida
  insert into notifications (user_id, title, body)
  values (new.id, 'Bienvenido', 'Tu cuenta esta lista. Haz tu primera recarga para empezar.');

  return new;
exception when others then
  -- IMPORTANTE: Capturar cualquier excepcion para que PostgreSQL NUNCA aborte el registro en auth.users
  raise warning 'Aviso en crear_cuenta_al_registrarse para usuario %: %', new.id, SQLERRM;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function crear_cuenta_al_registrarse();

-- ---------------------------------------------------------------------
-- TRANSFERENCIA — la funcion mas importante del sistema
-- Atomica, idempotente, con bloqueo pesimista sobre la cuenta origen.
-- ---------------------------------------------------------------------
create or replace function transfer_money(
  p_from_account uuid,
  p_to_account   uuid,
  p_amount       numeric,
  p_description  text,
  p_idem_key     text,
  p_type         tx_type default 'TRANSFER'
) returns uuid
language plpgsql security definer as $$
declare
  v_tx_id     uuid;
  v_balance   numeric;
  v_from_type account_type;
  v_status    account_status;
begin
  if p_amount <= 0 then
    raise exception 'El monto debe ser mayor a cero' using errcode = 'P0001';
  end if;

  if p_from_account = p_to_account then
    raise exception 'No puedes enviarte plata a ti mismo' using errcode = 'P0002';
  end if;

  select type, status into v_from_type, v_status
    from accounts where id = p_from_account for update;

  if not found then
    raise exception 'No encontramos esa cuenta' using errcode = 'P0003';
  end if;

  if v_status <> 'ACTIVE' then
    raise exception 'Tu cuenta no esta activa' using errcode = 'P0004';
  end if;

  if not exists (select 1 from accounts where id = p_to_account) then
    raise exception 'No encontramos la cuenta de destino' using errcode = 'P0005';
  end if;

  if v_from_type <> 'SYSTEM' then
    select balance into v_balance from account_balances where account_id = p_from_account;
    if v_balance < p_amount then
      raise exception 'No tienes saldo suficiente' using errcode = 'P0006';
    end if;
  end if;

  insert into transactions (type, status, description, idempotency_key)
  values (p_type, 'POSTED', p_description, p_idem_key)
  on conflict (idempotency_key) do update set description = excluded.description
  returning id into v_tx_id;

  if exists (select 1 from ledger_entries where transaction_id = v_tx_id) then
    return v_tx_id;
  end if;

  insert into ledger_entries (transaction_id, account_id, amount) values
    (v_tx_id, p_from_account, -p_amount),
    (v_tx_id, p_to_account,    p_amount);

  return v_tx_id;
end; $$;

-- ---------------------------------------------------------------------
-- RECARGA — deposito desde la caja del sistema
-- ---------------------------------------------------------------------
create or replace function deposit_money(
  p_to_account uuid,
  p_amount     numeric,
  p_idem_key   text
) returns uuid
language plpgsql security definer as $$
declare v_caja uuid;
begin
  select id into v_caja from accounts where account_number = 'SYS-0000000001';
  return transfer_money(v_caja, p_to_account, p_amount, 'Recarga', p_idem_key, 'DEPOSIT');
end; $$;

-- ---------------------------------------------------------------------
-- COMPRA CON TARJETA DE CREDITO — valida cupo, no saldo
-- ---------------------------------------------------------------------
create or replace function card_purchase(
  p_card_account uuid,
  p_amount       numeric,
  p_merchant     text,
  p_idem_key     text
) returns uuid
language plpgsql security definer as $$
declare
  v_comercio  uuid;
  v_available numeric;
  v_card_st   card_status;
begin
  select status into v_card_st from cards
   where account_id = p_card_account limit 1;

  if v_card_st is distinct from 'ACTIVE' then
    raise exception 'Tu tarjeta esta congelada o bloqueada' using errcode = 'P0007';
  end if;

  select available into v_available
    from account_balances where account_id = p_card_account;

  if v_available < p_amount then
    raise exception 'Cupo insuficiente' using errcode = 'P0008';
  end if;

  select id into v_comercio from accounts where account_number = 'SYS-0000000002';
  return transfer_money(p_card_account, v_comercio, p_amount, p_merchant, p_idem_key, 'CARD_PURCHASE');
end; $$;

-- ---------------------------------------------------------------------
-- DESEMBOLSO DE PRESTAMO — crea la deuda y entrega la plata en un solo acto
-- ---------------------------------------------------------------------
create or replace function disburse_loan(
  p_user_id        uuid,
  p_application_id uuid,
  p_principal      numeric,
  p_rate_monthly   numeric,
  p_term_months    smallint,
  p_installment    numeric,
  p_idem_key       text
) returns uuid
language plpgsql security definer as $$
declare
  v_loan_account uuid;
  v_checking     uuid;
  v_loan_id      uuid;
  v_tx_id        uuid;
begin
  select id into v_checking from accounts
   where user_id = p_user_id and type = 'CHECKING' limit 1;

  insert into accounts (user_id, account_number, type, label, interest_rate)
  values (p_user_id, generar_numero_cuenta(), 'LOAN', 'Prestamo', p_rate_monthly)
  returning id into v_loan_account;

  insert into transactions (type, status, description, idempotency_key)
  values ('LOAN_DISBURSEMENT', 'POSTED', 'Desembolso de prestamo', p_idem_key)
  returning id into v_tx_id;

  insert into ledger_entries (transaction_id, account_id, amount) values
    (v_tx_id, v_loan_account, -p_principal),
    (v_tx_id, v_checking,      p_principal);

  insert into loans (account_id, application_id, principal, rate_monthly, term_months, installment)
  values (v_loan_account, p_application_id, p_principal, p_rate_monthly, p_term_months, p_installment)
  returning id into v_loan_id;

  update credit_applications set status = 'ACCEPTED' where id = p_application_id;

  insert into notifications (user_id, title, body)
  values (p_user_id, 'Prestamo desembolsado',
          'Ya tienes el dinero en tu cuenta principal.');

  return v_loan_id;
end; $$;

-- ---------------------------------------------------------------------
-- VERIFICACION CONTABLE — el cierre de la sustentacion
-- Debe devolver siempre exactamente 0
-- ---------------------------------------------------------------------
create or replace function verificar_cuadre() returns numeric
language sql stable as $$
  select coalesce(sum(amount), 0) from ledger_entries;
$$;
