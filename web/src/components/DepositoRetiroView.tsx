import React, { useState } from 'react';
import { api, CuentaConSaldo } from '../lib/api';
import { ArrowDownCircle, ArrowUpCircle, CheckCircle, AlertCircle, PlusCircle, MinusCircle } from 'lucide-react';

interface DepositoRetiroViewProps {
  cuenta: CuentaConSaldo | null;
  onSuccess: () => void;
}

export const DepositoRetiroView: React.FC<DepositoRetiroViewProps> = ({ cuenta, onSuccess }) => {
  const [modo, setModo] = useState<'DEPOSITO' | 'RETIRO'>('DEPOSITO');
  const [monto, setMonto] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cuenta) return;

    const valMonto = parseFloat(monto);
    if (isNaN(valMonto) || valMonto <= 0) {
      setError('Ingresa un monto válido mayor a $0');
      return;
    }

    setLoading(true);
    setError(null);
    setExito(null);

    try {
      if (modo === 'DEPOSITO') {
        await api.depositar({ destino: cuenta.account_id, monto: valMonto });
        setExito(`¡Recarga exitosa por $${valMonto.toLocaleString('es-CO')} a tu cuenta!`);
      } else {
        await api.retirar({ origen: cuenta.account_id, monto: valMonto });
        setExito(`¡Retiro exitoso por $${valMonto.toLocaleString('es-CO')} de tu cuenta!`);
      }
      setMonto('');
      onSuccess();
    } catch (err: any) {
      setError(err.message ?? 'Operación fallida');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 650, margin: '0 auto' }}>
      <div className="glass-card" style={{ padding: 36 }}>
        {/* Toggle Pills */}
        <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.6)', padding: 6, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)', marginBottom: 28 }}>
          <button
            onClick={() => { setModo('DEPOSITO'); setError(null); setExito(null); }}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: modo === 'DEPOSITO' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
              color: modo === 'DEPOSITO' ? '#fff' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s ease'
            }}
          >
            <PlusCircle size={18} />
            <span>Recargar / Depositar</span>
          </button>
          <button
            onClick={() => { setModo('RETIRO'); setError(null); setExito(null); }}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: modo === 'RETIRO' ? 'linear-gradient(135deg, #f43f5e, #e11d48)' : 'transparent',
              color: modo === 'RETIRO' ? '#fff' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s ease'
            }}
          >
            <MinusCircle size={18} />
            <span>Retirar Dinero</span>
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#fca5a5',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {exito && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.9rem',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <CheckCircle size={20} />
            <span>{exito}</span>
          </div>
        )}

        <div className="glass-panel" style={{ padding: 18, marginBottom: 24 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>Cuenta Ahorros</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <span style={{ fontWeight: 600, color: '#fff' }}>N° {cuenta?.account_number}</span>
            <span style={{ fontWeight: 700, color: 'var(--accent-secondary)' }}>
              Disponible: ${parseFloat(cuenta?.available ?? '0').toLocaleString('es-CO')}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group" style={{ marginBottom: 28 }}>
            <label className="input-label">Monto a {modo === 'DEPOSITO' ? 'Ingresar' : 'Retirar'} (COP)</label>
            <input
              type="number"
              className="input-field"
              placeholder="$ 100.000"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              min="1"
              required
            />
          </div>

          <button
            type="submit"
            className={`btn ${modo === 'DEPOSITO' ? 'btn-success' : 'btn-danger'}`}
            disabled={loading}
            style={{ width: '100%', padding: 14, fontSize: '1rem' }}
          >
            {loading
              ? 'Procesando transacción...'
              : modo === 'DEPOSITO'
              ? 'Confirmar Depósito'
              : 'Confirmar Retiro'}
          </button>
        </form>
      </div>
    </div>
  );
};
