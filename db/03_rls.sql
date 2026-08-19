-- =====================================================================
-- ROW LEVEL SECURITY
-- IMPORTANTE: durante el desarrollo (sabado a martes) puedes NO correr
-- este archivo. Corrélo el MIERCOLES y prueba todo de nuevo.
-- Activar RLS temprano es la causa #1 de "no me carga nada y no se por que".
-- =====================================================================

alter table profiles            enable row level security;
alter table accounts            enable row level security;
alter table transactions        enable row level security;
alter table ledger_entries      enable row level security;
alter table cards               enable row level security;
alter table credit_applications enable row level security;
alter table loans               enable row level security;
alter table installments        enable row level security;
alter table statements          enable row level security;
alter table notifications       enable row level security;

create policy "perfil propio" on profiles
  for select using (auth.uid() = id);
create policy "actualizar perfil propio" on profiles
  for update using (auth.uid() = id);

create policy "cuentas propias" on accounts
  for select using (auth.uid() = user_id);

create policy "asientos de mis cuentas" on ledger_entries
  for select using (
    exists (select 1 from accounts a
             where a.id = ledger_entries.account_id and a.user_id = auth.uid())
  );

create policy "transacciones que me tocan" on transactions
  for select using (
    exists (select 1 from ledger_entries le
              join accounts a on a.id = le.account_id
             where le.transaction_id = transactions.id and a.user_id = auth.uid())
  );

create policy "mis tarjetas" on cards
  for select using (
    exists (select 1 from accounts a
             where a.id = cards.account_id and a.user_id = auth.uid())
  );

create policy "mis solicitudes" on credit_applications
  for all using (auth.uid() = user_id);

create policy "mis prestamos" on loans
  for select using (
    exists (select 1 from accounts a
             where a.id = loans.account_id and a.user_id = auth.uid())
  );

create policy "mis cuotas" on installments
  for select using (
    exists (select 1 from loans l join accounts a on a.id = l.account_id
             where l.id = installments.loan_id and a.user_id = auth.uid())
  );

create policy "mis extractos" on statements
  for select using (
    exists (select 1 from accounts a
             where a.id = statements.account_id and a.user_id = auth.uid())
  );

create policy "mis notificaciones" on notifications
  for all using (auth.uid() = user_id);

-- NOTA: la escritura en accounts, ledger_entries y transactions NO tiene
-- politica de INSERT a proposito. Solo se escribe a traves de las funciones
-- SECURITY DEFINER (transfer_money, deposit_money, etc). Esto es deliberado:
-- ningun cliente puede insertar asientos directamente.
