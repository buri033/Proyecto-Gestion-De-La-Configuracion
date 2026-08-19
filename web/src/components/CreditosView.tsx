import React, { useState } from 'react';
import { api, ResultadoSimulacion } from '../lib/api';
import { FileSpreadsheet, Calculator, CheckCircle, AlertCircle, TrendingUp, DollarSign, Calendar, Percent } from 'lucide-react';

interface CreditosViewProps {
  onRefresh: () => void;
}

export const CreditosView: React.FC<CreditosViewProps> = ({ onRefresh }) => {
  // Simulador local state
  const [simMonto, setSimMonto] = useState('3000000');
  const [simPlazo, setSimPlazo] = useState('12');
  const [simTasa, setSimTasa] = useState('2.0');
  const [resultadoSim, setResultadoSim] = useState<ResultadoSimulacion | null>(null);

  // Solicitud backend state
  const [solMonto, setSolMonto] = useState('');
  const [solPlazo, setSolPlazo] = useState('12');
  const [loading, setLoading] = useState(false);
  const [errorSol, setErrorSol] = useState<string | null>(null);
  const [exitoSol, setExitoSol] = useState<string | null>(null);

  const handleSimular = (e: React.FormEvent) => {
    e.preventDefault();
    const m = parseFloat(simMonto);
    const p = parseInt(simPlazo, 10);
    const t = parseFloat(simTasa) / 100;

    if (isNaN(m) || m <= 0 || isNaN(p) || p <= 0) return;
    const res = api.simularCredito(m, p, t);
    setResultadoSim(res);
  };

  const handleSolicitar = async (e: React.FormEvent) => {
    e.preventDefault();
    const m = parseFloat(solMonto);
    const p = parseInt(solPlazo, 10);

    if (isNaN(m) || m <= 0 || isNaN(p) || p <= 0) {
      setErrorSol('Ingresa un monto y plazo válidos');
      return;
    }

    setLoading(true);
    setErrorSol(null);
    setExitoSol(null);

    try {
      const res = await api.solicitarCredito({ monto: m, plazoMeses: p });
      setExitoSol(res.mensaje ?? '¡Crédito aprobado y desembolsado exitosamente!');
      setSolMonto('');
      onRefresh();
    } catch (err: any) {
      setErrorSol(err.message ?? 'No se pudo procesar el crédito');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Header Banner */}
      <div className="glass-card" style={{ padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 46,
            height: 46,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-primary) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow-indigo)'
          }}>
            <FileSpreadsheet size={24} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>Motor de Créditos & Amortización</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Simula tu préstamo con el Sistema Francés o solicita desembolso inmediato con nuestro motor de Scoring.
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Simulator & Application Form */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 28 }}>
        {/* Interactive Simulator */}
        <div className="glass-card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Calculator size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>Simulador Interactivo</h3>
          </div>

          <form onSubmit={handleSimular}>
            <div className="input-group">
              <label className="input-label">Monto Solicitado (COP)</label>
              <input
                type="number"
                className="input-field"
                value={simMonto}
                onChange={(e) => setSimMonto(e.target.value)}
                min="100000"
                step="100000"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="input-group">
                <label className="input-label">Plazo (Meses)</label>
                <input
                  type="number"
                  className="input-field"
                  value={simPlazo}
                  onChange={(e) => setSimPlazo(e.target.value)}
                  min="1"
                  max="60"
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Tasa Mensual (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="input-field"
                  value={simTasa}
                  onChange={(e) => setSimTasa(e.target.value)}
                  min="0"
                  max="10"
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-secondary" style={{ width: '100%', marginTop: 8 }}>
              Calcular Amortización
            </button>
          </form>

          {resultadoSim && (
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-glass)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: 10 }}>Resultados Estimados</div>
              <div className="glass-panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Cuota Mensual:</span>
                  <strong style={{ color: 'var(--accent-secondary)', fontSize: '1.1rem' }}>
                    ${resultadoSim.cuotaMensual.toLocaleString('es-CO')}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Intereses:</span>
                  <span style={{ color: '#fff', fontSize: '0.9rem' }}>
                    ${resultadoSim.totalIntereses.toLocaleString('es-CO')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total a Pagar:</span>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>
                    ${resultadoSim.totalPagar.toLocaleString('es-CO')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Real Credit Application Form */}
        <div className="glass-card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <TrendingUp size={20} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>Solicitar Desembolso</h3>
          </div>

          {errorSol && (
            <div style={{
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#fca5a5',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              marginBottom: 16
            }}>
              {errorSol}
            </div>
          )}

          {exitoSol && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              padding: '14px 18px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.9rem',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>
              <CheckCircle size={20} />
              <span>{exitoSol}</span>
            </div>
          )}

          <form onSubmit={handleSolicitar}>
            <div className="input-group">
              <label className="input-label">Monto del Préstamo (COP)</label>
              <input
                type="number"
                className="input-field"
                placeholder="Ej. $ 2.000.000"
                value={solMonto}
                onChange={(e) => setSolMonto(e.target.value)}
                min="100000"
                required
              />
            </div>

            <div className="input-group" style={{ marginBottom: 24 }}>
              <label className="input-label">Plazo de Pago (Meses)</label>
              <select
                className="input-field"
                value={solPlazo}
                onChange={(e) => setSolPlazo(e.target.value)}
              >
                <option value="6" style={{ background: '#111827' }}>6 Meses</option>
                <option value="12" style={{ background: '#111827' }}>12 Meses</option>
                <option value="24" style={{ background: '#111827' }}>24 Meses</option>
                <option value="36" style={{ background: '#111827' }}>36 Meses</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: 14, fontSize: '0.95rem' }}
            >
              {loading ? 'Evaluando Scoring en tiempo real...' : 'Evaluar y Desembolsar Crédito'}
            </button>
          </form>
        </div>
      </div>

      {/* Complete Amortization Table */}
      {resultadoSim && (
        <div className="glass-card" style={{ padding: 28 }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: 16 }}>
            Tabla de Amortización (Sistema Francés)
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-subtle)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px' }}>Cuota N°</th>
                  <th style={{ padding: '12px 16px' }}>Valor Cuota</th>
                  <th style={{ padding: '12px 16px' }}>Interés (2%)</th>
                  <th style={{ padding: '12px 16px' }}>Abono a Capital</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Saldo Restante</th>
                </tr>
              </thead>
              <tbody>
                {resultadoSim.tabla.map((f) => (
                  <tr key={f.numero} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#fff' }}>
                      Cuota #{f.numero}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                      ${f.cuota.toLocaleString('es-CO')}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#fca5a5' }}>
                      ${f.interes.toLocaleString('es-CO')}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#34d399' }}>
                      ${f.abonoCapital.toLocaleString('es-CO')}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)' }}>
                      ${f.saldoFinal.toLocaleString('es-CO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
