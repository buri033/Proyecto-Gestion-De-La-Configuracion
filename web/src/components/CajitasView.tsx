import React, { useEffect, useState } from 'react';
import { api, Cajita, CuentaConSaldo } from '../lib/api';
import { PiggyBank, Plus, ArrowRightLeft, Target, CheckCircle, AlertCircle } from 'lucide-react';

interface CajitasViewProps {
  cuentaPrincipal: CuentaConSaldo | null;
  onRefresh: () => void;
}

export const CajitasView: React.FC<CajitasViewProps> = ({ cuentaPrincipal, onRefresh }) => {
  const [cajitas, setCajitas] = useState<Cajita[]>([]);
  const [nombre, setNombre] = useState('');
  const [meta, setMeta] = useState('');
  const [loadingCrear, setLoadingCrear] = useState(false);
  const [cajitaDestinoId, setCajitaDestinoId] = useState<string | null>(null);
  const [montoMover, setMontoMover] = useState('');
  const [loadingMover, setLoadingMover] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const cargarCajitas = async () => {
    try {
      const data = await api.cajitas();
      setCajitas(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    cargarCajitas();
  }, []);

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    setLoadingCrear(true);
    setError(null);
    setExito(null);

    try {
      const valMeta = meta ? parseFloat(meta) : undefined;
      await api.crearCajita({ nombre: nombre.trim(), meta: valMeta });
      setExito(`¡Cajita "${nombre}" creada exitosamente!`);
      setNombre('');
      setMeta('');
      cargarCajitas();
      onRefresh();
    } catch (err: any) {
      setError(err.message ?? 'No se pudo crear la cajita');
    } finally {
      setLoadingCrear(false);
    }
  };

  const handleMover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cuentaPrincipal || !cajitaDestinoId) return;
    const valMonto = parseFloat(montoMover);

    if (isNaN(valMonto) || valMonto <= 0) {
      setError('Ingresa un monto válido para transferir a la cajita');
      return;
    }

    setLoadingMover(true);
    setError(null);
    setExito(null);

    try {
      await api.moverACajita({
        origen: cuentaPrincipal.account_id,
        destino: cajitaDestinoId,
        monto: valMonto,
      });

      setExito(`¡Se movieron $${valMonto.toLocaleString('es-CO')} a tu cajita!`);
      setMontoMover('');
      setCajitaDestinoId(null);
      cargarCajitas();
      onRefresh();
    } catch (err: any) {
      setError(err.message ?? 'Error al mover fondos a la cajita');
    } finally {
      setLoadingMover(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div className="glass-card" style={{ padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-secondary) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <PiggyBank size={24} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>Cajitas de Ahorro</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Bolsillos de ahorro con metas específicas y transferencia inmediata</p>
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(244, 63, 94, 0.15)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          color: '#fca5a5',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.85rem'
        }}>
          {error}
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
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <CheckCircle size={20} />
          <span>{exito}</span>
        </div>
      )}

      {/* Grid: Create Pocket & Pocket Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        {/* Create Pocket Form */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={18} color="var(--accent-cyan)" />
            <span>Crear Nueva Cajita</span>
          </h3>

          <form onSubmit={handleCrear}>
            <div className="input-group">
              <label className="input-label">Nombre de la Cajita</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej. Vacaciones, Moto, Fondo de Emergencia"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>

            <div className="input-group" style={{ marginBottom: 20 }}>
              <label className="input-label">Meta de Ahorro COP (Opcional)</label>
              <input
                type="number"
                className="input-field"
                placeholder="Ej. $ 1.000.000"
                value={meta}
                onChange={(e) => setMeta(e.target.value)}
                min="0"
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loadingCrear} style={{ width: '100%' }}>
              {loadingCrear ? 'Creando cajita...' : 'Crear Cajita'}
            </button>
          </form>
        </div>

        {/* Transfer to Pocket Quick Box */}
        {cajitas.length > 0 && (
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ArrowRightLeft size={18} color="var(--accent-secondary)" />
              <span>Abonar a tu Cajita</span>
            </h3>

            <form onSubmit={handleMover}>
              <div className="input-group">
                <label className="input-label">Selecciona Cajita Destino</label>
                <select
                  className="input-field"
                  value={cajitaDestinoId ?? ''}
                  onChange={(e) => setCajitaDestinoId(e.target.value)}
                  required
                >
                  <option value="" style={{ background: '#111827' }}>-- Selecciona Cajita --</option>
                  {cajitas.map((c) => (
                    <option key={c.account_id} value={c.account_id} style={{ background: '#111827' }}>
                      {c.label ?? c.account_number} (Saldo: ${parseFloat(c.balance).toLocaleString('es-CO')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group" style={{ marginBottom: 20 }}>
                <label className="input-label">Monto a Mover (COP)</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="Ej. $ 50.000"
                  value={montoMover}
                  onChange={(e) => setMontoMover(e.target.value)}
                  min="1"
                  required
                />
              </div>

              <button type="submit" className="btn btn-success" disabled={loadingMover || !cajitaDestinoId} style={{ width: '100%' }}>
                {loadingMover ? 'Moviendo dinero...' : 'Abonar a Cajita'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* List of Pockets */}
      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>Tus Cajitas de Ahorro</h3>
      {cajitas.length === 0 ? (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <PiggyBank size={44} style={{ opacity: 0.3, marginBottom: 8 }} />
          <p>Aún no tienes cajitas de ahorro creadas.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {cajitas.map((c) => {
            const saldoNum = parseFloat(c.balance);
            const metaNum = c.goal_amount ? parseFloat(c.goal_amount) : 0;
            const porcentaje = metaNum > 0 ? Math.min(100, Math.round((saldoNum / metaNum) * 100)) : 0;

            return (
              <div key={c.account_id} className="glass-card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                    {c.label ?? 'Cajita sin nombre'}
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontFamily: 'monospace' }}>
                    {c.account_number}
                  </span>
                </div>

                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-secondary)', margin: '8px 0' }}>
                  ${saldoNum.toLocaleString('es-CO')}
                </div>

                {metaNum > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                      <span>Meta: ${metaNum.toLocaleString('es-CO')}</span>
                      <strong style={{ color: '#fff' }}>{porcentaje}%</strong>
                    </div>
                    {/* Progress Bar */}
                    <div style={{ height: 8, width: '100%', background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${porcentaje}%`,
                        background: 'linear-gradient(90deg, #10b981, #06b6d4)',
                        borderRadius: 4,
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
