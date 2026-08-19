import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const url = process.env['SUPABASE_URL'];
const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
const anonKey = process.env['SUPABASE_ANON_KEY'];

if (!url || !serviceKey || !anonKey) {
  throw new Error(
    'Faltan variables en el archivo .env. Copia .env.example y pega tus claves de Supabase.'
  );
}

/**
 * Cliente con permisos totales. NUNCA sale del servidor.
 * Con esta llave se puede leer y escribir cualquier fila, saltandose RLS.
 */
export const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

/** Cliente publico. Solo se usa para validar el token del usuario. */
export const supabaseAnon = createClient(url, anonKey, {
  auth: { persistSession: false },
});
