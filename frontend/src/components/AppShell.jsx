import { Suspense } from 'react';
import {
  Link,
  NavLink,
  Outlet,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { sesionActual } from '../api';
import { useAuth } from '../auth/AuthContext.jsx';
import Brand from './ui/Brand';
import Icon from './ui/Icon';
import CargaPantalla from './ui/CargaPantalla';
import './Legal.css';
export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = sesionActual();
  const { logout } = useAuth();
  const admin = session?.rol === 'administrador';
  const nurse = session?.rol === 'enfermero';
  const profile = nurse ? '/perfil-enfermero' : '/perfil-paciente';
  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }
  return (
    <div className={`app-shell ${admin ? 'admin-shell' : ''}`}>
      <a className="skip-link" href="#contenido">
        Ir al contenido
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <nav className="main-nav" aria-label="Navegación principal">
            {admin ? (
              <>
                <NavLink to="/admin" end>
                  <Icon name="home" size={18} />
                  Panel
                </NavLink>
              </>
            ) : (
              <>
                <NavLink to="/home">
                  <Icon name="home" size={18} />
                  Inicio
                </NavLink>
                <NavLink
                  to="/cartilla"
                  className={({ isActive }) =>
                    isActive || location.pathname.startsWith('/perfil/')
                      ? 'active'
                      : undefined
                  }
                >
                  <Icon name="search" size={18} />
                  <span className="nav-long-label">
                    {nurse ? 'Pacientes asignados' : 'Buscar profesionales'}
                  </span>
                  <span className="nav-short-label">
                    {nurse ? 'Pacientes' : 'Buscar'}
                  </span>
                </NavLink>
                <NavLink to={profile}>
                  <Icon name="user" size={18} />
                  Mi perfil
                </NavLink>
              </>
            )}
          </nav>
          <div className="account-actions">
            {!admin && (
              <>
                <Link
                  className="button button-secondary nurse-requests-link"
                  to={nurse ? '/solicitudes-enfermero' : '/mis-solicitudes'}
                  aria-label={nurse ? 'Ver solicitudes recibidas' : 'Ver mis solicitudes'}
                >
                  <Icon name="briefcase" size={17} />
                  <span className="nurse-requests-label">{nurse ? 'Solicitudes' : 'Mis solicitudes'}</span>
                </Link>
              </>
            )}
            {/* El perfil se abre desde "Mi perfil" en la navegación; acá solo queda salir, con texto visible. */}
            <button
              className="button button-secondary logout-button"
              type="button"
              onClick={handleLogout}
              title="Cerrar sesión"
            >
              <Icon name="logout" size={18} />
              Salir
            </button>
          </div>
        </div>
      </header>
      <main id="contenido" className="site-main">
        <Suspense fallback={<CargaPantalla />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="site-footer">
        <Brand />
        <p>Enfermería a domicilio, cerca tuyo.</p>
        <nav className="footer-legal" aria-label="Información legal">
          <Link to="/terminos">Términos y condiciones</Link>
          <Link to="/privacidad">Privacidad</Link>
        </nav>
      </footer>
    </div>
  );
}
