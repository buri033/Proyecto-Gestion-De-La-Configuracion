import React, { useState } from 'react';
import { Movimiento } from '../lib/api';
import { History, ArrowDownLeft, ArrowUpRight, Search, Filter } from 'lucide-react';

interface MovimientosViewProps {
  movimientos: Movimiento[];
}

export const MovimientosView: React.FC<MovimientosViewProps> = ({ movimientos }) => {
  const [filtro, setFiltro] = useState<'TODOS' | 'ENTRADAS' | 'SALIDAS'>('TODOS');
  const [busqueda, setBusqueda] = useState('');

  const formatCOP = (valor: string | number) => {
    const num = typeof valor === 'string' ? parseFloat(valor) : valor;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const filtrados = movimientos.filter((m) => {
    const monto = parseFloat(m.amount);
    if (filtro === 'ENTRADAS' && monto <= 0) return false;
    if (filtro === 'SALIDAS' && monto >= 0) return false;

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      const desc = (m.transactions?.description ?? '').toLowerCase();
      const tipo = (m.transactions?.type ?? '').toLowerCase();
      return desc.includes(q) || tipo.includes(q);
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="glass-card" style={{ padding: 28 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-primary) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <History size={24} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>Historial Contable</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Registro inmutable de movimientos del libro mayor (ledger)</p>
            </div>
          </div>

          {/* Filters & Search */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ position: 'relative', width: 220 }}>
              <Search size={16} color="var(--text-subtle)" style={{ position: 'absolute', left: 12, top: 12 }} />
              <input
                type="text"
                className="input-field"
                style={{ paddingLeft: 36, padding: '8px 12px 8px 36px', fontSize: '0.85rem' }}
                placeholder="Buscar descripción..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 4, background: 'rgba(15, 23, 42, 0.6)', padding: 4, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
              <button
                onClick={() => setFiltro('TODOS')}
                className={`btn ${filtro === 'TODOS' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '6px 12px', fontSize: '0.8rem', border: 'none' }}
              >
                Todos ({movimientos.length})
              </button>
              <button
                onClick={() => setFiltro('ENTRADAS')}
                className={`btn ${filtro === 'ENTRADAS' ? 'btn-success' : 'btn-outline'}`}
                style={{ padding: '6px 12px', fontSize: '0.8rem', border: 'none' }}
              >
                Entradas
              </button>
              <button
                onClick={() => setFiltro('SALIDAS')}
                className={`btn ${filtro === 'SALIDAS' ? 'btn-danger' : 'btn-outline'}`}
                style={{ padding: '6px 12px', fontSize: '0.8rem', border: 'none' }}
              >
                Salidas
              </button>
            </div>
          </div>
        </div>

        {filtrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)' }}>
            No se encontraron movimientos con los filtros aplicados.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-subtle)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '14px 16px' }}>ID</th>
                  <th style={{ padding: '14px 16px' }}>Tipo de Asiento</th>
                  <th style={{ padding: '14px 16px' }}>Descripción</th>
                  <th style={{ padding: '14px 16px' }}>Fecha y Hora</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Monto (COP)</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((m) => {
                  const esEntrada = parseFloat(m.amount) > 0;
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', transition: 'background 0.2s ease' }}>
                      <td style={{ padding: '14px 16px', color: 'var(--text-subtle)', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        #{m.id}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: esEntrada ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            {esEntrada ? <ArrowDownLeft size={16} color="#34d399" /> : <ArrowUpRight size={16} color="#fca5a5" />}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>
                            {m.transactions?.type ?? (esEntrada ? 'DEPÓSITO' : 'RETIRO')}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        {m.transactions?.description ?? 'Movimiento registrado'}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-subtle)', fontSize: '0.85rem' }}>
                        {new Date(m.created_at).toLocaleString('es-CO')}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, fontSize: '0.95rem', color: esEntrada ? '#34d399' : '#fca5a5' }}>
                        {esEntrada ? '+' : ''}{formatCOP(m.amount)}
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
