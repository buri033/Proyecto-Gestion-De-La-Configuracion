-- =====================================================================
-- MVP BANCARIO — ESQUEMA COMPLETO
-- Pegar en Supabase > SQL Editor > New query > Run
-- Es idempotente: se puede volver a correr sin romper nada.
-- =====================================================================

drop view   if exists account_balances cascade;
drop table  if exists notifications, statements, installments, loans,
                      credit_applications, cards, ledger_entries,
                      transactions, accounts, profiles, business_clock cascade;
drop type   if exists account_type, account_status, tx_type, tx_status,
                      card_type, card_status cascade;

create type account_type   as enum ('CHECKING','SAVINGS','SAVINGS_GOAL','CREDIT_CARD','LOAN','SYSTEM');
create type account_status as enum ('ACTIVE','FROZEN','CLOSED');
create type tx_type        as enum ('TRANSFER','DEPOSIT','WITHDRAWAL','GOAL_MOVE',
                                    'CARD_PURCHASE','CARD_PAYMENT','LOAN_DISBURSEMENT',
                                    'LOAN_PAYMENT','INTEREST','REVERSAL');
create type tx_status      as enum ('PENDING','POSTED','FAILED','REVERSED');
create type card_type      as enum ('DEBIT','CREDIT');
create type card_status    as enum ('ACTIVE','FROZEN','BLOCKED','CANCELLED');

-- ---------------------------------------------------------------- perfiles
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null,
  document_id  text not null unique,
  phone        text,
  birth_date   date,
  pin_hash     text,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------- cuentas
create table accounts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references profiles(id) on delete cascade,
  account_number text not null unique,
  type           account_type   not null default 'CHECKING',
  status         account_status not null default 'ACTIVE',
  label          text,
  goal_amount    numeric(18,2),
  credit_limit   numeric(18,2),
  interest_rate  numeric(8,6),
  cutoff_day     smallint check (cutoff_day between 1 and 28),
  currency       char(3) not null default 'COP',
  created_at     timestamptz not null default now(),
  constraint cuenta_sistema_sin_usuario
    check ((type = 'SYSTEM' and user_id is null) or (type <> 'SYSTEM' and user_id is not null))
);

create index idx_accounts_user on accounts(user_id);

-- ---------------------------------------------------------------- transacciones
create table transactions (
  id              uuid primary key default gen_random_uuid(),
  type            tx_type   not null,
  status          tx_status not null default 'POSTED',
  description     text,
  idempotency_key text not null unique,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------- ledger
-- EL CORAZON DEL SISTEMA. Nunca se hace UPDATE ni DELETE aqui.
create table ledger_entries (
  id             bigserial primary key,
  transaction_id uuid not null references transactions(id) on delete cascade,
  account_id     uuid not null references accounts(id),
  amount         numeric(18,2) not null,
  created_at     timestamptz not null default now(),
  constraint amount_not_zero check (amount <> 0)
);

create index idx_ledger_account_date on ledger_entries(account_id, created_at desc);
create index idx_ledger_tx on ledger_entries(transaction_id);

-- Blindaje: el ledger es de solo insercion, garantizado por la base de datos
create or replace function bloquear_mutacion_ledger() returns trigger
language plpgsql as $$
begin
  raise exception 'El ledger es inmutable. Para corregir, inserta un asiento de reverso.';
end; $$;

create trigger trg_ledger_inmutable
  before update or delete on ledger_entries
  for each row execute function bloquear_mutacion_ledger();

-- ---------------------------------------------------------------- saldos
create view account_balances as
select a.id      as account_id,
       a.user_id,
       a.type,
       a.account_number,
       a.label,
       a.goal_amount,
       a.credit_limit,
       coalesce(sum(le.amount), 0) as balance,
       case when a.type = 'CREDIT_CARD'
            then coalesce(a.credit_limit, 0) + coalesce(sum(le.amount), 0)
            else coalesce(sum(le.amount), 0)
       end as available
from accounts a
left join ledger_entries le on le.account_id = a.id
left join transactions   t  on t.id = le.transaction_id and t.status = 'POSTED'
group by a.id, a.user_id, a.type, a.account_number, a.label, a.goal_amount, a.credit_limit;

-- ---------------------------------------------------------------- tarjetas
create table cards (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  card_type  card_type   not null default 'DEBIT',
  status     card_status not null default 'ACTIVE',
  is_virtual boolean not null default true,
  last4      char(4) not null,
  pan_hash   text,
  cvv_hash   text,
  exp_month  smallint not null check (exp_month between 1 and 12),
  exp_year   smallint not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- credito
create table credit_applications (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id) on delete cascade,
  product          text not null check (product in ('LOAN','CREDIT_CARD')),
  requested_amount numeric(18,2) not null,
  term_months      smallint,
  monthly_income   numeric(18,2) not null,
  occupation       text,
  purpose          text,
  score            smallint,
  band             char(1),
  status           text not null default 'PENDING'
                   check (status in ('PENDING','APPROVED','REDUCED','REJECTED','ACCEPTED','EXPIRED')),
  approved_amount  numeric(18,2),
  approved_rate    numeric(8,6),
  score_breakdown  jsonb,
  rejection_reason text,
  evaluated_at     timestamptz,
  expires_at       timestamptz,
  created_at       timestamptz not null default now()
);

create table loans (
  id             uuid primary key default gen_random_uuid(),
  account_id     uuid not null references accounts(id) on delete cascade,
  application_id uuid references credit_applications(id),
  principal      numeric(18,2) not null,
  rate_monthly   numeric(8,6)  not null,
  term_months    smallint      not null,
  installment    numeric(18,2) not null,
  status         text not null default 'ACTIVE'
                 check (status in ('ACTIVE','PAID','DEFAULTED')),
  disbursed_at   timestamptz not null default now()
);

create table installments (
  id             uuid primary key default gen_random_uuid(),
  loan_id        uuid not null references loans(id) on delete cascade,
  number         smallint not null,
  due_date       date not null,
  amount         numeric(18,2) not null,
  principal_part numeric(18,2) not null,
  interest_part  numeric(18,2) not null,
  status         text not null default 'PENDING'
                 check (status in ('PENDING','DUE','PAID','OVERDUE')),
  paid_at        timestamptz,
  unique (loan_id, number)
);

create table statements (
  id             uuid primary key default gen_random_uuid(),
  account_id     uuid not null references accounts(id) on delete cascade,
  period_start   date not null,
  period_end     date not null,
  due_date       date not null,
  total_amount   numeric(18,2) not null,
  minimum_amount numeric(18,2) not null,
  paid_amount    numeric(18,2) not null default 0,
  status         text not null default 'OPEN'
                 check (status in ('OPEN','PAID','PARTIAL','OVERDUE')),
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------- notificaciones
create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  title      text not null,
  body       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notif_user on notifications(user_id, created_at desc);

-- ---------------------------------------------------------------- reloj de negocio
-- Permite avanzar el tiempo en la demo sin esperar meses reales.
create table business_clock (
  id            boolean primary key default true,
  business_date date not null default current_date,
  constraint solo_una_fila check (id)
);

insert into business_clock (id, business_date) values (true, current_date)
on conflict (id) do nothing;

-- ---------------------------------------------------------------- cuentas de sistema
-- Necesarias para que toda transaccion sume cero.
insert into accounts (account_number, type, label, user_id) values
  ('SYS-0000000001', 'SYSTEM', 'Caja general',        null),
  ('SYS-0000000002', 'SYSTEM', 'Comercios',           null),
  ('SYS-0000000003', 'SYSTEM', 'Ingresos por interes', null)
on conflict (account_number) do nothing;
