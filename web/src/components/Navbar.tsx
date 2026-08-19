import React from 'react';
import { Bell, LogOut, ShieldCheck, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface NavbarProps {
  userName?: string;
  unreadNotifications: number;
  onNavigate: (view: string) => void;
  activeView: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  userName = 'Usuario',
  unreadNotifications,
  onNavigate,
  activeView,
}) => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="glass-panel" style={{ borderRadius: 0, borderBottom: '1px solid var(--border-glass)', padding: '16px 32px', marginBottom: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1400, margin: '0 auto' }}>
        {/* Brand */}
        <div 
          onClick={() => onNavigate('dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
        >
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-cyan) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow-indigo)'
          }}>
            <ShieldCheck size={26} color="#fff" />
          </div>
          <div>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>
              Banco<span className="gradient-text-indigo">MVP</span>
            </span>
            <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Banca Digital
            </span>
          </div>
        </div>

        {/* User Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Notification Button */}
          <button
            onClick={() => onNavigate('notificaciones')}
            className={`btn ${activeView === 'notificaciones' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ position: 'relative', padding: '10px 14px', borderRadius: 'var(--radius-full)' }}
            title="Notificaciones"
          >
            <Bell size={18} />
            {unreadNotifications > 0 && (
              <span style={{
                position: 'absolute',
                top: -4,
                right: -4,
                background: 'var(--accent-rose)',
                color: '#fff',
                fontSize: '0.7rem',
                fontWeight: 700,
                width: 18,
                height: 18,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 10px rgba(244, 63, 94, 0.6)'
              }}>
                {unreadNotifications}
              </span>
            )}
          </button>

          {/* User Badge */}
          <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px', borderRadius: 'var(--radius-full)' }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-primary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.9rem'
            }}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {userName}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="btn btn-outline"
            style={{ padding: '10px 16px', borderRadius: 'var(--radius-full)' }}
            title="Cerrar Sesión"
          >
            <LogOut size={16} />
            <span style={{ fontSize: '0.85rem' }}>Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
};
