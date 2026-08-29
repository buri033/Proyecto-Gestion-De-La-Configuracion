import { auth, AuthUser } from './auth';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = auth.getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? 'Algo salió mal en el servidor');
  return body as T;
}

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface CuentaConSaldo {
  account_id: string;
  account_number: string;
  type: string;
  balance: string;
  available: string;
  label?: string;
  credit_limit?: string;
  goal_amount?: string;
}

export interface Movimiento {
  id: number;
  amount: string;
  created_at: string;
  transactions: { type: string; description: string | null; status: string } | null;
}

export interface Tarjeta {
  id: string;
  card_type: 'DEBIT' | 'CREDIT';
  status: 'ACTIVE' | 'FROZEN' | 'BLOCKED' | 'CANCELLED';
  is_virtual: boolean;
  last4: string;
  exp_month: number;
  exp_year: number;
  account_id: string;
}

export interface Notificacion {
  id: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Cajita {
  account_id: string;
  account_number: string;
  type: string;
  balance: string;
  available: string;
  label?: string;
  goal_amount?: string;
}

export interface ResumenCredito {
  id: string;
  status: 'ACTIVE' | 'PAID' | 'DEFAULTED' | string;
  total_amount: string;
  remaining_balance?: string;
  monthly_payment?: string;
  interest_rate?: string;
  term_months?: number;
  disbursed_at?: string;
}

export interface CuotaPrestamo {
  id: string;
  installment_number: number;
  due_date: string;
  amount: string;
  principal_part: string;
  interest_part: string;
  status: 'PENDING' | 'DUE' | 'PAID' | 'OVERDUE' | string;
  paid_at: string | null;
}

export interface FilaAmortizacion {
  numero: number;
  cuota: number;
  interes: number;
  abonoCapital: number;
  saldoFinal: number;
}

export interface ResultadoSimulacion {
  monto: number;
  plazoMeses: number;
  tasaMensual: number;
  cuotaMensual: number;
  totalIntereses: number;
  totalPagar: number;
  tabla: FilaAmortizacion[];
}

// ─── API Client Methods ──────────────────────────────────────────────────────

export const api = {
  // Autenticación Local
  login: async (email: string, password: string): Promise<AuthUser> => {
    const res = await request<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    auth.setSession(res.token, res.user);
    return res.user;
  },

  register: async (payload: {
    email: string;
    password: string;
    full_name: string;
    account_type?: 'SAVINGS' | 'CHECKING';
  }): Promise<AuthUser> => {
    const res = await request<{ token: string; user: AuthUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    auth.setSession(res.token, res.user);
    return res.user;
  },

  logout: () => {
    auth.clearSession();
  },

  me: () => request<{ user: AuthUser }>('/auth/me'),

  // Cuentas
  misCuentas: () => request<CuentaConSaldo[]>('/cuentas/me'),
  movimientos: (cuentaId: string) => request<Movimiento[]>(`/cuentas/${cuentaId}/movimientos`),
  buscarCuenta: (numero: string) =>
    request<{ id: string; account_number: string; profiles?: { full_name: string } }>(`/cuentas/buscar/${numero}`),

  // Transferencias, recargas y retiros
  transferir: (payload: { origen: string; destino: string; monto: number; descripcion?: string }) =>
    request<{ transaccionId: string }>('/transferencias', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  depositar: (payload: { destino: string; monto: number }) =>
    request<{ transaccionId: string }>('/transferencias/recarga', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  retirar: (payload: { origen: string; monto: number }) =>
    request<{ transaccionId: string }>('/transferencias/retiro', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Tarjetas
  misTarjetas: () => request<Tarjeta[]>('/tarjetas'),
  solicitarTarjetaCredito: () => request<Tarjeta>('/tarjetas/credito', { method: 'POST' }),
  solicitarTarjetaDebito: () => request<Tarjeta>('/tarjetas/debito', { method: 'POST' }),

  // Notificaciones
  notificaciones: () => request<Notificacion[]>('/notificaciones'),
  marcarLeida: (id: string) => request<{ ok: boolean }>(`/notificaciones/${id}/leida`, { method: 'PATCH' }),
  marcarTodasLeidas: () => request<{ ok: boolean }>('/notificaciones/todas/leidas', { method: 'PATCH' }),

  // Cajitas de ahorro
  cajitas: () => request<Cajita[]>('/cajitas'),
  crearCajita: (payload: { nombre: string; meta?: number }) =>
    request<{ cajitaId: string }>('/cajitas', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  moverACajita: (payload: { origen: string; destino: string; monto: number }) =>
    request<{ transaccionId: string }>('/cajitas/mover', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Créditos y Préstamos
  misCreditos: () => request<ResumenCredito[]>('/creditos'),
  solicitarCredito: (payload: { monto: number; plazoMeses: number; destino?: string }) =>
    request<{ ok: boolean; mensaje: string; prestamoId?: string }>('/creditos/solicitar', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  cuotasPrestamo: (creditoId: string) => request<CuotaPrestamo[]>(`/creditos/${creditoId}/cuotas`),
  pagarCuota: (payload: { prestamoId: string; cuotaId: string }) =>
    request<{ ok: boolean }>(`/creditos/${payload.prestamoId}/cuotas/${payload.cuotaId}/pagar`, {
      method: 'POST',
    }),

  // Simulador de Créditos (Sistema Francés)
  simularCredito: (monto: number, plazoMeses: number, tasaMensual = 0.02): ResultadoSimulacion => {
    const r = tasaMensual;
    const n = plazoMeses;
    const M = monto;

    const cuotaMensual = (M * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    let saldo = M;
    const tabla: FilaAmortizacion[] = [];

    for (let i = 1; i <= n; i++) {
      const interes = saldo * r;
      const abonoCapital = cuotaMensual - interes;
      saldo = Math.max(0, saldo - abonoCapital);
      tabla.push({
        numero: i,
        cuota: Math.round(cuotaMensual),
        interes: Math.round(interes),
        abonoCapital: Math.round(abonoCapital),
        saldoFinal: Math.round(saldo),
      });
    }

    const totalPagar = cuotaMensual * n;
    return {
      monto,
      plazoMeses,
      tasaMensual,
      cuotaMensual: Math.round(cuotaMensual),
      totalIntereses: Math.round(totalPagar - monto),
      totalPagar: Math.round(totalPagar),
      tabla,
    };
  },
};
