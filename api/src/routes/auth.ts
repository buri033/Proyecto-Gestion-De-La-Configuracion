import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../repos/db';
import { requireAuth, JWT_SECRET } from '../middleware';

const router = Router();

/** Registrar nuevo usuario */
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, full_name, account_type } = req.body as {
      email?: string;
      password?: string;
      full_name?: string;
      account_type?: 'SAVINGS' | 'CHECKING';
    };

    if (!email || !password || !full_name) {
      res.status(400).json({ error: 'Faltan campos obligatorios: email, password y full_name' });
      return;
    }

    const emailTrim = email.trim().toLowerCase();
    const existing = await query(`SELECT id FROM auth.users WHERE email = $1;`, [emailTrim]);
    if (existing.rows.length > 0) {
      res.status(400).json({ error: 'El correo electrónico ya se encuentra registrado.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userRes = await query<{ id: string }>(
      `INSERT INTO auth.users (email, password_hash) VALUES ($1, $2) RETURNING id;`,
      [emailTrim, passwordHash]
    );

    const userId = userRes.rows[0]?.id;
    if (!userId) throw new Error('No se pudo crear el usuario');

    const docId = 'DOC-' + Math.floor(10000000 + Math.random() * 90000000).toString();

    // Crear perfil
    await query(
      `INSERT INTO profiles (id, full_name, document_id) VALUES ($1, $2, $3);`,
      [userId, full_name.trim(), docId]
    );

    // Crear cuenta bancaria inicial
    const numCuenta = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const type = account_type === 'CHECKING' ? 'CHECKING' : 'SAVINGS';
    const label = type === 'SAVINGS' ? 'Cuenta de ahorros principal' : 'Cuenta corriente principal';

    const accountRes = await query<{ id: string }>(
      `INSERT INTO accounts (user_id, account_number, type, label) VALUES ($1, $2, $3, $4) RETURNING id;`,
      [userId, numCuenta, type, label]
    );

    const accountId = accountRes.rows[0]?.id;
    if (!accountId) throw new Error('No se pudo crear la cuenta');

    const now = new Date();

    // Crear tarjeta de debito inicial
    await query(
      `INSERT INTO cards (account_id, card_type, is_virtual, last4, exp_month, exp_year) VALUES ($1, $2, $3, $4, $5, $6);`,
      [
        accountId,
        'DEBIT',
        true,
        String(Math.floor(1000 + Math.random() * 9000)),
        now.getMonth() + 1,
        now.getFullYear() + 5,
      ]
    );

    // Crear notificacion de bienvenida
    await query(
      `INSERT INTO notifications (user_id, title, body) VALUES ($1, $2, $3);`,
      [userId, 'Bienvenido a Banco MVP', 'Tu cuenta principal ha sido creada con éxito.']
    );

    const token = jwt.sign({ userId, email: emailTrim }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: userId,
        email: emailTrim,
        full_name: full_name.trim(),
      },
    });
  } catch (e) {
    next(e);
  }
});

/** Iniciar sesión */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: 'Ingresa correo y contraseña' });
      return;
    }

    const emailTrim = email.trim().toLowerCase();
    const userRes = await query<{ id: string; email: string; password_hash: string }>(
      `SELECT id, email, password_hash FROM auth.users WHERE email = $1;`,
      [emailTrim]
    );

    if (userRes.rows.length === 0 || !userRes.rows[0]) {
      res.status(400).json({ error: 'Credenciales incorrectas. Revisa tu correo y contraseña.' });
      return;
    }

    const user = userRes.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      res.status(400).json({ error: 'Credenciales incorrectas. Revisa tu correo y contraseña.' });
      return;
    }

    const profileRes = await query<{ full_name: string }>(
      `SELECT full_name FROM profiles WHERE id = $1;`,
      [user.id]
    );

    const fullName = profileRes.rows[0]?.full_name ?? 'Usuario';
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: fullName,
      },
    });
  } catch (e) {
    next(e);
  }
});

/** Obtener usuario actual */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const userRes = await query<{ id: string; email: string }>(
      `SELECT id, email FROM auth.users WHERE id = $1;`,
      [req.userId]
    );

    if (userRes.rows.length === 0 || !userRes.rows[0]) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    const profileRes = await query<{ full_name: string }>(
      `SELECT full_name FROM profiles WHERE id = $1;`,
      [req.userId]
    );

    const user = userRes.rows[0];
    res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: profileRes.rows[0]?.full_name ?? 'Usuario',
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
