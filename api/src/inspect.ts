import { query } from './repos/db';

async function inspect() {
  console.log('====================================================');
  console.log('         INSPECTOR DE BASE DE DATOS LOCAL           ');
  console.log('====================================================\n');

  console.log('--- 👤 USUARIOS (auth.users) ---');
  const users = await query('SELECT id, email, created_at FROM auth.users;');
  console.table(users.rows);

  console.log('\n--- 📋 PERFILES (profiles) ---');
  const profiles = await query('SELECT id, full_name, document_id, created_at FROM profiles;');
  console.table(profiles.rows);

  console.log('\n--- 💳 CUENTAS Y SALDOS (account_balances) ---');
  const balances = await query('SELECT account_id, user_id, account_number, type, label, balance, available FROM account_balances;');
  console.table(balances.rows);

  console.log('\n--- 💸 TRANSACCIONES (transactions) ---');
  const txs = await query('SELECT id, type, status, description, created_at FROM transactions ORDER BY created_at DESC LIMIT 10;');
  console.table(txs.rows);

  console.log('\n--- 📖 ASIENTOS CONTABLES / LEDGER (ledger_entries) ---');
  const ledger = await query('SELECT id, transaction_id, account_id, amount, created_at FROM ledger_entries ORDER BY created_at DESC LIMIT 10;');
  console.table(ledger.rows);

  console.log('\n--- 🎴 TARJETAS (cards) ---');
  const cards = await query('SELECT id, account_id, card_type, status, last4, exp_month, exp_year FROM cards;');
  console.table(cards.rows);

  console.log('\n--- 🏦 PRÉSTAMOS (loans) ---');
  const loans = await query('SELECT id, account_id, principal, rate_monthly, term_months, installment, status FROM loans;');
  console.table(loans.rows);

  console.log('\n--- 🔔 NOTIFICACIONES (notifications) ---');
  const notifs = await query('SELECT id, user_id, title, body, read_at, created_at FROM notifications ORDER BY created_at DESC LIMIT 10;');
  console.table(notifs.rows);

  console.log('\n====================================================');
  process.exit(0);
}

inspect().catch((err) => {
  console.error('Error al inspeccionar la BD:', err);
  process.exit(1);
});
