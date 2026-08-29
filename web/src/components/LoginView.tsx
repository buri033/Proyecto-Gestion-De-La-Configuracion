import React, { useState } from 'react';
import { api } from '../lib/api';
import { ShieldCheck, LogIn, Lock, Mail, ArrowRight } from 'lucide-react';

interface LoginViewProps {
  onSwitchToRegister: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.login(email, password);
    } catch (err: any) {
      if (err.message.includes('fetch') || err.message.includes('Failed')) {
        setError('No se pudo conectar con el servidor API local. Revisa que el backend (api) esté corriendo en http://localhost:3000');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: 440, padding: 36 }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-cyan) 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow-indigo)',
            marginBottom: 16
          }}>
            <ShieldCheck size={32} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>
            Banco<span className="gradient-text-indigo">MVP</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Ingresa a tu banca digital segura
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#fca5a5',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            marginBottom: 20
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label className="input-label">Correo Electrónico</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="var(--text-subtle)" style={{ position: 'absolute', left: 14, top: 14 }} />
              <input
                type="email"
                className="input-field"
                style={{ paddingLeft: 42 }}
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: 24 }}>
            <label className="input-label">Contraseña</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="var(--text-subtle)" style={{ position: 'absolute', left: 14, top: 14 }} />
              <input
                type="password"
                className="input-field"
                style={{ paddingLeft: 42 }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
          >
            {loading ? 'Iniciando sesión...' : (
              <>
                <span>Ingresar</span>
                <LogIn size={18} />
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-glass)' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>¿No tienes una cuenta aún? </span>
          <button
            onClick={onSwitchToRegister}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-cyan)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              verticalAlign: 'baseline'
            }}
          >
            <span>Regístrate aquí</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
