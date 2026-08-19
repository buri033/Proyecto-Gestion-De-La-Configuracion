import React, { useState } from 'react';
import { CuentaConSaldo, Movimiento, Tarjeta } from '../lib/api';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  PiggyBank,
  PlusCircle,
  CreditCard,
  History,
  TrendingUp,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';

interface DashboardViewProps {
  cuenta: CuentaConSaldo | null;
  movimientos: Movimiento[];
  tarjetas: Tarjeta[];
  onNavigate: (view: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  cuenta,
  movimientos,
  tarjetas,
  onNavigate,
}) => {
  const [mostrarSaldo, setMostrarSaldo] = useState(true);

  const formatCOP = (valor: string | number | undefined) => {
    const num = typeof valor === 'string' ? parseFloat(valor) : valor ?? 0;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const tarjetaPrincipal = tarjetas.find((t) => t.status === 'ACTIVE') ?? tarjetas[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Welcome Banner / Balance Hero */}
      <div
        className="glass-card"
        style={{
          padding: 32,
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.9) 0%, rgba(17, 24, 39, 0.95) 100%)',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(99, 102, 241, 0.3)',
        }}
      >
        {/* Glow effect */}
        <div style={{
          position: 'absolute',
          top: -80,
          right: -80,
          width: 260,
          height: 260,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <ShieldCheck size={14} /> {cuenta?.label ?? 'Cuenta Ahorros'}
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-subtle)' }}>
                N° {cuenta?.account_number ?? '000-000000-00'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Saldo Total Disponible
              </div>
              <button
                onClick={() => setMostrarSaldo(!mostrarSaldo)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--border-glass)',
                  color: 'var(--text-muted)',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                title={mostrarSaldo ? 'Ocultar saldo' : 'Mostrar saldo'}
              >
                {mostrarSaldo ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div style={{ fontSize: '2.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#fff', margin: '4px 0 8px 0' }}>
              {mostrarSaldo ? formatCOP(cuenta?.available ?? '0') : '••••••••'}
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-subtle)' }}>
              Saldo Contable: <strong style={{ color: 'var(--text-muted)' }}>{mostrarSaldo ? formatCOP(cuenta?.balance ?? '0') : '••••••••'}</strong>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <button onClick={() => onNavigate('transferencias')} className="btn btn-primary">
              <ArrowRightLeft size={18} />
              <span>Transferir</span>
            </button>
            <button onClick={() => onNavigate('deposito-retiro')} className="btn btn-success">
              <PlusCircle size={18} />
              <span>Recargar / Retirar</span>
            </button>
            <button onClick={() => onNavigate('creditos')} className="btn btn-secondary">
              <TrendingUp size={18} />
              <span>Simular Crédito</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid Section: Cards & Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        {/* Virtual Card Preview Widget */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Tarjeta Asociada</h3>
            <button onClick={() => onNavigate('tarjetas')} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              Ver todas
            </button>
          </div>

          {tarjetaPrincipal ? (
            <div
              style={{
                borderRadius: 'var(--radius-lg)',
                padding: 24,
                background: tarjetaPrincipal.card_type === 'CREDIT'
                  ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
                  : 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
                color: '#fff',
                position: 'relative',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
                minHeight: 180,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, letterSpacing: '0.05em' }}>
                  BANCO MVP
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.2)' }}>
                  {tarjetaPrincipal.card_type}
                </span>
              </div>

              {/* SIM Chip Visual */}
              <div style={{
                width: 36,
                height: 26,
                borderRadius: 4,
                background: 'linear-gradient(135deg, #fef08a 0%, #eab308 100%)',
                border: '1px solid #ca8a04',
                margin: '12px 0'
              }} />

              <div>
                <div style={{ fontSize: '1.2rem', fontFamily: 'monospace', letterSpacing: '0.15em', fontWeight: 700 }}>
                  •••• •••• •••• {tarjetaPrincipal.last4}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.8rem', opacity: 0.9 }}>
                  <span>Vence: {String(tarjetaPrincipal.exp_month).padStart(2, '0')}/{tarjetaPrincipal.exp_year}</span>
                  <span>Estado: {tarjetaPrincipal.status}</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
              <CreditCard size={40} style={{ opacity: 0.4, marginBottom: 8 }} />
              <p style={{ fontSize: '0.9rem' }}>No tienes tarjetas activas en este momento.</p>
              <button onClick={() => onNavigate('tarjetas')} className="btn btn-secondary" style={{ marginTop: 12 }}>
                Solicitar Tarjeta
              </button>
            </div>
          )}
        </div>

        {/* Quick Features & Shortcuts */}
        <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: 16 }}>Accesos Rápidos</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button
                onClick={() => onNavigate('cajitas')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 14,
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-glass)',
                  color: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <PiggyBank size={24} color="var(--accent-cyan)" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Cajitas</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Ahorro con meta</div>
                </div>
              </button>

              <button
                onClick={() => onNavigate('prestamos')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 14,
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-glass)',
                  color: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <TrendingUp size={24} color="var(--accent-purple)" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Préstamos</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Pagar cuotas</div>
                </div>
              </button>
            </div>
          </div>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>¿Necesitas simular un crédito?</span>
            <button onClick={() => onNavigate('creditos')} className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
              Abrir Simulador
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="glass-card" style={{ padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>Últimos Movimientos</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-subtle)' }}>Transacciones recientes en tu cuenta principal</p>
          </div>
          <button onClick={() => onNavigate('movimientos')} className="btn btn-outline" style={{ fontSize: '0.85rem' }}>
            <History size={16} /> Ver Todo
          </button>
        </div>

        {movimientos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            No hay movimientos registrados en esta cuenta.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-subtle)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px' }}>Tipo</th>
                  <th style={{ padding: '12px 16px' }}>Descripción</th>
                  <th style={{ padding: '12px 16px' }}>Fecha</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.slice(0, 5).map((m) => {
                  const esEntrada = parseFloat(m.amount) > 0;
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: esEntrada ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            {esEntrada ? <ArrowDownLeft size={18} color="#34d399" /> : <ArrowUpRight size={18} color="#fca5a5" />}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>
                            {m.transactions?.type ?? (esEntrada ? 'DEPÓSITO' : 'RETIRO')}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        {m.transactions?.description ?? 'Transacción bancaria'}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-subtle)', fontSize: '0.85rem' }}>
                        {new Date(m.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, fontSize: '0.95rem', color: esEntrada ? '#34d399' : '#fca5a5' }}>
                        {mostrarSaldo ? (esEntrada ? '+' : '') + formatCOP(m.amount) : '••••••'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
