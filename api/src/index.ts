import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import cuentas from './routes/cuentas';
import transferencias from './routes/transferencias';
import creditos from './routes/creditos';
import tarjetas from './routes/tarjetas';
import notificaciones from './routes/notificaciones';
import cajitas from './routes/cajitas';
import prestamos from './routes/prestamos';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    mensaje: 'Bienvenido a Banco MVP API',
    salud: '/health',
    rutas: ['/health', '/cuentas', '/transferencias', '/creditos', '/tarjetas', '/notificaciones', '/cajitas', '/prestamos'],
  });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, servicio: 'banco-api', fecha: new Date().toISOString() });
});

app.use('/cuentas', cuentas);
app.use('/transferencias', transferencias);
app.use('/creditos', creditos);
app.use('/tarjetas', tarjetas);
app.use('/notificaciones', notificaciones);
app.use('/cajitas', cajitas);
app.use('/prestamos', prestamos);

/**
 * Traduce los codigos de error de PostgreSQL a lenguaje natural.
 * El usuario nunca debe ver un codigo tecnico crudo.
 */
const MENSAJES: Record<string, string> = {
  P0001: 'El monto debe ser mayor a cero',
  P0002: 'No puedes enviarte plata a ti mismo',
  P0003: 'No encontramos esa cuenta',
  P0004: 'Tu cuenta no esta activa',
  P0005: 'No encontramos la cuenta de destino',
  P0006: 'No tienes saldo suficiente',
  P0007: 'Tu tarjeta esta congelada',
  P0008: 'Cupo insuficiente',
};

app.use(
  (
    err: { code?: string; message?: string },
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    const mensaje =
      (err.code ? MENSAJES[err.code] : undefined) ?? err.message ?? 'Algo salio mal';
    res.status(400).json({ error: mensaje });
  }
);

const PORT = Number(process.env['PORT'] ?? 3000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API corriendo en http://localhost:${PORT}`);
  console.log(`Desde el celular usa la IP de tu PC, no localhost`);
});
