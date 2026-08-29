import { useEffect, useState } from 'react';
import { auth, Session } from './lib/auth';
import { api, CuentaConSaldo, Movimiento, Tarjeta, Notificacion } from './lib/api';

import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';

import { LoginView } from './components/LoginView';
import { RegisterView } from './components/RegisterView';
import { DashboardView } from './components/DashboardView';
import { TransferenciasView } from './components/TransferenciasView';
import { MovimientosView } from './components/MovimientosView';
import { DepositoRetiroView } from './components/DepositoRetiroView';
import { TarjetasView } from './components/TarjetasView';
import { CreditosView } from './components/CreditosView';
import { PrestamosView } from './components/PrestamosView';
import { CajitasView } from './components/CajitasView';
import { NotificacionesView } from './components/NotificacionesView';

export function App() {
  const [session, setSession] = useState<Session | null>(auth.getSession());
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [activeView, setActiveView] = useState<string>('dashboard');

  const [cuentaPrincipal, setCuentaPrincipal] = useState<CuentaConSaldo | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([]);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [_loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    const sub = auth.onAuthStateChange((s) => {
      setSession(s);
    });

    return () => sub.unsubscribe();
  }, []);

  const cargarDatos = async () => {
    if (!session) return;
    setLoadingData(true);
    try {
      const cuentas = await api.misCuentas();
      const principal = cuentas.find((c) => c.type === 'CHECKING' || c.type === 'SAVINGS') ?? cuentas[0] ?? null;
      setCuentaPrincipal(principal);

      if (principal) {
        const movs = await api.movimientos(principal.account_id);
        setMovimientos(movs);
      }

      const tjs = await api.misTarjetas();
      setTarjetas(tjs);

      const notis = await api.notificaciones();
      setNotificaciones(notis);
    } catch (err) {
      console.error('Error al cargar datos del usuario:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (session) {
      cargarDatos();
    }
  }, [session]);

  if (!session) {
    if (authMode === 'register') {
      return <RegisterView onSwitchToLogin={() => setAuthMode('login')} />;
    }
    return <LoginView onSwitchToRegister={() => setAuthMode('register')} />;
  }

  const unreadNotifications = notificaciones.filter((n) => !n.read_at).length;
  const userName = session.user.full_name ?? session.user.email.split('@')[0] ?? 'Usuario';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
      <Navbar
        userName={userName}
        unreadNotifications={unreadNotifications}
        onNavigate={setActiveView}
        activeView={activeView}
      />

      <div style={{ display: 'flex', flex: 1, maxWidth: 1400, width: '100%', margin: '0 auto' }}>
        <Sidebar activeView={activeView} onNavigate={setActiveView} />

        <main className="main-content">
          {activeView === 'dashboard' && (
            <DashboardView
              cuenta={cuentaPrincipal}
              movimientos={movimientos}
              tarjetas={tarjetas}
              onNavigate={setActiveView}
            />
          )}

          {activeView === 'transferencias' && (
            <TransferenciasView cuenta={cuentaPrincipal} onSuccess={cargarDatos} />
          )}

          {activeView === 'movimientos' && <MovimientosView movimientos={movimientos} />}

          {activeView === 'deposito-retiro' && (
            <DepositoRetiroView cuenta={cuentaPrincipal} onSuccess={cargarDatos} />
          )}

          {activeView === 'tarjetas' && (
            <TarjetasView tarjetas={tarjetas} onRefresh={cargarDatos} />
          )}

          {activeView === 'creditos' && <CreditosView onRefresh={cargarDatos} />}

          {activeView === 'prestamos' && <PrestamosView onRefresh={cargarDatos} />}

          {activeView === 'cajitas' && (
            <CajitasView cuentaPrincipal={cuentaPrincipal} onRefresh={cargarDatos} />
          )}

          {activeView === 'notificaciones' && (
            <NotificacionesView onRefresh={cargarDatos} />
          )}
        </main>
      </div>
    </div>
  );
}
