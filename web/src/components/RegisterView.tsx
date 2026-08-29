import React, { useState } from 'react';
import { api } from '../lib/api';
import { ShieldCheck, UserPlus, Lock, Mail, User, ArrowLeft, Wallet } from 'lucide-react';

interface RegisterViewProps {
  onSwitchToLogin: () => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({ onSwitchToLogin }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState<'SAVINGS' | 'CHECKING'>('SAVINGS');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.register({
        email,
        password,
        full_name: fullName,
        account_type: accountType,
      });
      setSuccess(true);
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
      <div className="glass-card" style={{ width: '100%', maxWidth: 480, padding: 36 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, var(--accent-secondary) 0%, var(--accent-cyan) 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow-emerald)',
            marginBottom: 16
          }}>
            <ShieldCheck size={32} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>
            Crear Cuenta <span className="gradient-text-emerald">Bancaria</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Abre tu cuenta de ahorros o corriente en menos de un minuto
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

        {success ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div className="badge badge-success" style={{ padding: '8px 16px', fontSize: '0.9rem', marginBottom: 16 }}>
              ¡Registro Exitoso!
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: 24 }}>
              Tu {accountType === 'SAVINGS' ? 'Cuenta de Ahorros' : 'Cuenta Corriente'} ha sido creada. Ya puedes iniciar sesión con tu correo y contraseña.
            </p>
            <button onClick={onSwitchToLogin} className="btn btn-primary" style={{ width: '100%' }}>
              Ir al Inicio de Sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="input-group">
              <label className="input-label">Nombre Completo</label>
              <div style={{ position: 'relative' }}>
                <User size={18} color="var(--text-subtle)" style={{ position: 'absolute', left: 14, top: 14 }} />
                <input
                  type="text"
                  className="input-field"
                  style={{ paddingLeft: 42 }}
                  placeholder="Juan Pérez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Tipo de Cuenta a Abrir</label>
              <div style={{ position: 'relative' }}>
                <Wallet size={18} color="var(--text-subtle)" style={{ position: 'absolute', left: 14, top: 14, zIndex: 2 }} />
                <select
                  className="input-field"
                  style={{ paddingLeft: 42 }}
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value as 'SAVINGS' | 'CHECKING')}
                >
                  <option value="SAVINGS" style={{ background: '#111827' }}>Cuenta de Ahorros Principal</option>
                  <option value="CHECKING" style={{ background: '#111827' }}>Cuenta Corriente</option>
                </select>
              </div>
            </div>

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
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-success"
              disabled={loading}
              style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
            >
              {loading ? 'Creando cuenta...' : (
                <>
                  <span>Registrarme y Abrir Cuenta</span>
                  <UserPlus size={18} />
                </>
              )}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-glass)' }}>
          <button
            onClick={onSwitchToLogin}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <ArrowLeft size={16} />
            <span>Volver al inicio de sesión</span>
          </button>
        </div>
      </div>
    </div>
  );
};
