import React, { useState } from 'react';
import { api, CuentaConSaldo } from '../lib/api';
import { ArrowRightLeft, Search, CheckCircle, AlertCircle, Send } from 'lucide-react';

interface TransferenciasViewProps {
  cuenta: CuentaConSaldo | null;
  onSuccess: () => void;
}

export const TransferenciasView: React.FC<TransferenciasViewProps> = ({ cuenta, onSuccess }) => {
  const [numeroDestino, setNumeroDestino] = useState('');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [cuentaDestinoInfo, setCuentaDestinoInfo] = useState<{ id: string; account_number: string; name?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const handleBuscar = async () => {
    if (!numeroDestino.trim()) return;
    setBuscando(true);
    setError(null);
    setCuentaDestinoInfo(null);

    try {
      const res = await api.buscarCuenta(numeroDestino.trim());
      setCuentaDestinoInfo({
        id: res.id,
        account_number: res.account_number,
        name: res.profiles?.full_name ?? 'Usuario Registrado',
      });
    } catch (err: any) {
      setError(err.message ?? 'No encontramos esa cuenta destino');
    } finally {
      setBuscando(false);
    }
  };

  const handleTransferir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cuenta) return;
    if (!cuentaDestinoInfo) {
      setError('Debes buscar y verificar primero la cuenta de destino');
      return;
    }

    const valMonto = parseFloat(monto);
    if (isNaN(valMonto) || valMonto <= 0) {
      setError('Ingresa un monto válido mayor a $0');
      return;
    }

    setLoading(true);
    setError(null);
    setExito(null);

    try {
      await api.transferir({
        origen: cuenta.account_id,
        destino: cuentaDestinoInfo.id,
        monto: valMonto,
        descripcion: descripcion || 'Transferencia entre cuentas',
      });

      setExito(`¡Transferencia exitosa de $${valMonto.toLocaleString('es-CO')} a ${cuentaDestinoInfo.name}!`);
      setNumeroDestino('');
      setMonto('');
      setDescripcion('');
      setCuentaDestinoInfo(null);
      onSuccess();
    } catch (err: any) {
      setError(err.message ?? 'Fallo en la transferencia');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="glass-card" style={{ padding: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <div style={{
            width: 46,
            height: 46,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-cyan) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow-indigo)'
          }}>
            <ArrowRightLeft size={24} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>Transferir Dinero</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Envío inmediato entre cuentas de Banco MVP</p>
          </div>
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

        {/* Source Account Info */}
        <div className="glass-panel" style={{ padding: 16, marginBottom: 24 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cuenta de Origen</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <span style={{ fontWeight: 600, color: '#fff' }}>N° {cuenta?.account_number}</span>
            <span style={{ fontWeight: 700, color: 'var(--accent-secondary)' }}>
              Disponible: ${parseFloat(cuenta?.available ?? '0').toLocaleString('es-CO')}
            </span>
          </div>
        </div>

        {/* Destination Lookup Form */}
        <div className="input-group">
          <label className="input-label">Número de Cuenta Destino</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              className="input-field"
              placeholder="Ej. 100-123456-01"
              value={numeroDestino}
              onChange={(e) => setNumeroDestino(e.target.value)}
            />
            <button
              type="button"
              onClick={handleBuscar}
              className="btn btn-secondary"
              disabled={buscando || !numeroDestino.trim()}
              style={{ whiteSpace: 'nowrap' }}
            >
              <Search size={16} />
              <span>{buscando ? 'Buscando...' : 'Verificar'}</span>
            </button>
          </div>
        </div>

        {/* Verified Target Account Box */}
        {cuentaDestinoInfo && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600, textTransform: 'uppercase' }}>Destinatario Verificado</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>{cuentaDestinoInfo.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cuenta: {cuentaDestinoInfo.account_number}</div>
            </div>
            <CheckCircle size={24} color="#34d399" />
          </div>
        )}

        <form onSubmit={handleTransferir}>
          <div className="input-group">
            <label className="input-label">Monto a Transferir (COP)</label>
            <input
              type="number"
              className="input-field"
              placeholder="$ 50.000"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              min="1"
              required
            />
          </div>

          <div className="input-group" style={{ marginBottom: 28 }}>
            <label className="input-label">Descripción (Opcional)</label>
            <input
              type="text"
              className="input-field"
              placeholder="Ej. Pago de arriendo"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !cuentaDestinoInfo}
            style={{ width: '100%', padding: 14, fontSize: '1rem' }}
          >
            {loading ? 'Procesando transferencia...' : (
              <>
                <span>Confirmar y Enviar Dinero</span>
                <Send size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
