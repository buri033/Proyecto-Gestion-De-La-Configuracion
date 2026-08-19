import React, { useState } from 'react';
import { api, Tarjeta } from '../lib/api';
import { CreditCard, Plus, ShieldCheck, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

interface TarjetasViewProps {
  tarjetas: Tarjeta[];
  onRefresh: () => void;
}

export const TarjetasView: React.FC<TarjetasViewProps> = ({ tarjetas, onRefresh }) => {
  const [solicitandoTipo, setSolicitandoTipo] = useState<'DEBIT' | 'CREDIT' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const tieneCredito = tarjetas.some((t) => t.card_type === 'CREDIT');

  const handleSolicitar = async (tipo: 'DEBIT' | 'CREDIT') => {
    setSolicitandoTipo(tipo);
    setError(null);
    setExito(null);

    try {
      if (tipo === 'CREDIT') {
        await api.solicitarTarjetaCredito();
        setExito('¡Tarjeta de crédito emitida exitosamente con cupo de $2.000.000!');
      } else {
        await api.solicitarTarjetaDebito();
        setExito('¡Tarjeta de débito emitida exitosamente!');
      }
      onRefresh();
    } catch (err: any) {
      setError(err.message ?? 'No se pudo emitir la tarjeta');
    } finally {
      setSolicitandoTipo(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div className="glass-card" style={{ padding: 28 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-primary) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <CreditCard size={24} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>Gestión de Tarjetas</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Tarjetas físicas y digitales emitidas con validación de Algoritmo de Luhn
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => handleSolicitar('DEBIT')}
              className="btn btn-success"
              disabled={solicitandoTipo !== null}
            >
              <Plus size={16} />
              <span>{solicitandoTipo === 'DEBIT' ? 'Emitiendo...' : 'Solicitar Débito'}</span>
            </button>

            <button
              onClick={() => handleSolicitar('CREDIT')}
              className="btn btn-primary"
              disabled={solicitandoTipo !== null || tieneCredito}
              title={tieneCredito ? 'Ya posees tu tarjeta de crédito máxima (1 por usuario)' : 'Solicitar Tarjeta de Crédito'}
            >
              <Sparkles size={16} />
              <span>
                {solicitandoTipo === 'CREDIT'
                  ? 'Emitiendo...'
                  : tieneCredito
                  ? 'Tarjeta Crédito Activa (Máx 1)'
                  : 'Solicitar Crédito ($2M)'}
              </span>
            </button>
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

        {/* Cards Grid */}
        {tarjetas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <CreditCard size={44} style={{ opacity: 0.3, marginBottom: 8 }} />
            <p>No tienes tarjetas activas registradas en este momento.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            {tarjetas.map((t) => {
              const esCredito = t.card_type === 'CREDIT';
              const activa = t.status === 'ACTIVE';

              return (
                <div
                  key={t.id}
                  style={{
                    borderRadius: 'var(--radius-xl)',
                    padding: 28,
                    background: esCredito
                      ? 'linear-gradient(135deg, #312e81 0%, #4338ca 50%, #6366f1 100%)'
                      : 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #10b981 100%)',
                    color: '#fff',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 15px 35px rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    minHeight: 210,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.05em' }}>
                      BANCO MVP
                    </span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }}>
                        {t.card_type}
                      </span>
                      <span className={`badge ${activa ? 'badge-success' : 'badge-danger'}`}>
                        {activa ? 'ACTIVA' : t.status}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '14px 0' }}>
                    <div style={{
                      width: 44,
                      height: 32,
                      borderRadius: 6,
                      background: 'linear-gradient(135deg, #fef08a 0%, #eab308 100%)',
                      border: '1px solid #ca8a04',
                    }} />
                    <span style={{ fontSize: '0.75rem', opacity: 0.8, textTransform: 'uppercase' }}>
                      {t.is_virtual ? 'Tarjeta Digital' : 'Tarjeta Física'}
                    </span>
                  </div>

                  <div>
                    <div style={{ fontSize: '1.3rem', fontFamily: 'monospace', letterSpacing: '0.18em', fontWeight: 700 }}>
                      •••• •••• •••• {t.last4}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: '0.85rem', opacity: 0.9 }}>
                      <span>VALID THRU: {String(t.exp_month).padStart(2, '0')}/{t.exp_year}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ShieldCheck size={14} /> Luhn ok
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
