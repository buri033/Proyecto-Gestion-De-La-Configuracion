import React from 'react';
import {
  LayoutDashboard,
  ArrowRightLeft,
  History,
  CreditCard,
  Banknote,
  PiggyBank,
  ArrowUpDown,
  FileSpreadsheet,
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'transferencias', label: 'Transferencias', icon: ArrowRightLeft },
    { id: 'movimientos', label: 'Historial', icon: History },
    { id: 'deposito-retiro', label: 'Recarga / Retiro', icon: ArrowUpDown },
    { id: 'tarjetas', label: 'Mis Tarjetas', icon: CreditCard },
    { id: 'creditos', label: 'Simulador & Créditos', icon: FileSpreadsheet },
    { id: 'prestamos', label: 'Préstamos Activos', icon: Banknote },
    { id: 'cajitas', label: 'Cajitas de Ahorro', icon: PiggyBank },
  ];

  return (
    <aside style={{ width: 260, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ padding: '0 12px 12px 12px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Menú Principal
      </div>

      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: isActive
                ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(99, 102, 241, 0.1) 100%)'
                : 'transparent',
              border: isActive ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
              color: isActive ? '#fff' : 'var(--text-muted)',
              fontWeight: isActive ? 600 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'left',
            }}
          >
            <Icon size={20} color={isActive ? 'var(--accent-primary)' : 'var(--text-muted)'} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </aside>
  );
};
