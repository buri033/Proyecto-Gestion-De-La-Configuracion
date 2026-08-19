-- =====================================================================
-- DATOS DE DEMOSTRACION
-- Correr DESPUES de registrar manualmente los usuarios desde la app.
-- Una demo con la base vacia se ve mal aunque el codigo sea excelente.
-- =====================================================================

-- Recarga inicial a TODAS las cuentas corrientes existentes
do $$
declare r record; i int := 0;
begin
  for r in select id from accounts where type = 'CHECKING' loop
    i := i + 1;
    perform deposit_money(r.id, 2000000, 'seed-deposito-' || i || '-' || r.id);
  end loop;
end $$;

-- Unas cuantas transferencias cruzadas para que el extracto no este vacio
do $$
declare a uuid; b uuid;
begin
  select id into a from accounts where type='CHECKING' order by created_at limit 1;
  select id into b from accounts where type='CHECKING' and id <> a order by created_at limit 1;
  if b is not null then
    perform transfer_money(a, b, 120000, 'Almuerzo',   'seed-tx-1');
    perform transfer_money(b, a,  45000, 'Transporte', 'seed-tx-2');
    perform transfer_money(a, b,  80000, 'Libro',      'seed-tx-3');
  end if;
end $$;

-- Verificacion: DEBE devolver exactamente 0
select verificar_cuadre() as debe_ser_cero;
