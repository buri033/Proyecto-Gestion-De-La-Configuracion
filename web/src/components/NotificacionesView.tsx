import React, { useEffect, useState } from 'react';
import { api, Notificacion } from '../lib/api';
import { Bell, CheckCheck, CheckCircle2 } from 'lucide-react';

interface NotificacionesViewProps {
  onRefresh: () => void;
}

export const NotificacionesView: React.FC<NotificacionesViewProps> = ({ onRefresh }) => {
  const [notis, setNotis] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(false);

  const cargarNotificaciones = async () => {
    setLoading(true);
    try {
      const data = await api.notificaciones();
      setNotis(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarNotificaciones();
  }, []);

  const handleMarcarLeida = async (id: string) => {
    try {
      await api.marcarLeida(id);
      cargarNotificaciones();
      onRefresh();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleMarcarTodas = async () => {
    try {
      await api.marcarTodasLeidas();
      cargarNotificaciones();
      onRefresh();
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="glass-card" style={{ padding: 28 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--accent-rose) 0%, var(--accent-primary) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Bell size={24} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>Centro de Notificaciones</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Avisos del sistema, alertas de transferencias y depósitos</p>
            </div>
          </div>

          {notis.some((n) => !n.read_at) && (
            <button onClick={handleMarcarTodas} className="btn btn-outline" style={{ fontSize: '0.85rem' }}>
              <CheckCheck size={16} />
              <span>Marcar todas leídas</span>
            </button>
          )}
        </div>

        {notis.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)' }}>
            <Bell size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
            <p>No tienes notificaciones registradas.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {notis.map((n) => {
              const leida = !!n.read_at;
              return (
                <div
                  key={n.id}
                  style={{
                    padding: 18,
                    borderRadius: 'var(--radius-md)',
                    background: leida ? 'rgba(255, 255, 255, 0.02)' : 'rgba(99, 102, 241, 0.1)',
                    border: leida ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(99, 102, 241, 0.3)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 16
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: leida ? 'var(--text-muted)' : '#fff' }}>
                        {n.title}
                      </span>
                      {!leida && (
                        <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>NUEVA</span>
                      )}
                    </div>
                    {n.body && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', marginBottom: 6 }}>
                        {n.body}
                      </p>
                    )}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                      {new Date(n.created_at).toLocaleString('es-CO')}
                    </span>
                  </div>

                  {!leida && (
                    <button
                      onClick={() => handleMarcarLeida(n.id)}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                    >
                      <CheckCircle2 size={14} />
                      <span>Leída</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
