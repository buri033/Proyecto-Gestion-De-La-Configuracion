import React, { useEffect, useState } from 'react';
import { api, ResumenCredito, CuotaPrestamo } from '../lib/api';
import { Banknote, CheckCircle, AlertCircle, ChevronRight, Calendar } from 'lucide-react';

interface PrestamosViewProps {
  onRefresh: () => void;
}

export const PrestamosView: React.FC<PrestamosViewProps> = ({ onRefresh }) => {
  const [creditos, setCreditos] = useState<ResumenCredito[]>([]);
  const [creditoSeleccionado, setCreditoSeleccionado] = useState<string | null>(null);
  const [cuotas, setCuotas] = useState<CuotaPrestamo[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagandoId, setPagandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const cargarCreditos = async () => {
    setLoading(true);
    try {
      const data = await api.misCreditos();
      setCreditos(data);
      if (data.length > 0 && !creditoSeleccionado) {
        setCreditoSeleccionado(data[0].id);
      }
    } catch (err: any) {
      setError(err.message ?? 'No pudimos cargar los préstamos activos');
    } finally {
      setLoading(false);
    }
  };

  const cargarCuotas = async (creditoId: string) => {
    try {
      const data = await api.cuotasPrestamo(creditoId);
      setCuotas(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    cargarCreditos();
  }, []);

  useEffect(() => {
    if (creditoSeleccionado) {
      cargarCuotas(creditoSeleccionado);
    }
  }, [creditoSeleccionado]);

  const handlePagarCuota = async (cuotaId: string) => {
    if (!creditoSeleccionado) return;
    setPagandoId(cuotaId);
    setError(null);
    setExito(null);

    try {
      await api.pagarCuota({ prestamoId: creditoSeleccionado, cuotaId });
      setExito('¡Cuota pagada exitosamente de tu saldo en cuenta!');
      cargarCuotas(creditoSeleccionado);
      cargarCreditos();
      onRefresh();
    } catch (err: any) {
      setError(err.message ?? 'Error al procesar el pago de la cuota');
    } finally {
      setPagandoId(null);
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
            background: 'linear-gradient(135deg, var(--accent-secondary) 0%, var(--accent-cyan) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Banknote size={24} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>Préstamos Vigentes</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Consulta tus créditos activos y realiza pagos de cuotas en tiempo real</p>
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

      {creditos.length === 0 ? (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <Banknote size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p>No tienes préstamos activos en este momento.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          {/* List of Loans */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Tus Créditos</h3>
            {creditos.map((c) => {
              const esSeleccionado = c.id === creditoSeleccionado;
              return (
                <div
                  key={c.id}
                  onClick={() => setCreditoSeleccionado(c.id)}
                  className="glass-card"
                  style={{
                    padding: 20,
                    cursor: 'pointer',
                    borderColor: esSeleccionado ? 'var(--accent-primary)' : 'var(--border-glass)',
                    background: esSeleccionado ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-card)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span className="badge badge-info">{c.status}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>ID: {c.id.substring(0, 8)}...</span>
                  </div>

                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: '4px 0' }}>
                    ${parseFloat(c.total_amount).toLocaleString('es-CO')}
                  </div>

                  {c.remaining_balance && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Saldo Pendiente: <strong style={{ color: 'var(--accent-secondary)' }}>${parseFloat(c.remaining_balance).toLocaleString('es-CO')}</strong>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Breakdown Table for Selected Loan */}
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: 16 }}>
              Desglose de Cuotas
            </h3>

            {cuotas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                Selecciona un crédito para ver sus cuotas.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-subtle)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px' }}>N°</th>
                      <th style={{ padding: '10px' }}>Vencimiento</th>
                      <th style={{ padding: '10px' }}>Monto</th>
                      <th style={{ padding: '10px' }}>Estado</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cuotas.map((cuota) => {
                      const pagada = cuota.status === 'PAID';
                      return (
                        <tr key={cuota.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <td style={{ padding: '10px', fontWeight: 600, color: '#fff', fontSize: '0.85rem' }}>
                            #{cuota.installment_number}
                          </td>
                          <td style={{ padding: '10px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            {new Date(cuota.due_date).toLocaleDateString('es-CO')}
                          </td>
                          <td style={{ padding: '10px', fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '0.85rem' }}>
                            ${parseFloat(cuota.amount).toLocaleString('es-CO')}
                          </td>
                          <td style={{ padding: '10px' }}>
                            <span className={`badge ${pagada ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                              {pagada ? 'PAGADA' : cuota.status}
                            </span>
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right' }}>
                            {!pagada && (
                              <button
                                onClick={() => handlePagarCuota(cuota.id)}
                                className="btn btn-success"
                                disabled={pagandoId === cuota.id}
                                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                              >
                                {pagandoId === cuota.id ? 'Pagando...' : 'Pagar'}
                              </button>
                            )}
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
      )}
    </div>
  );
};
