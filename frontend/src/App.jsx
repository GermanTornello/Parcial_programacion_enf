import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { registrarNavegacion, rutaDeLogin, sesionActual } from './api';
import { useAuth } from './auth/AuthContext.jsx';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import Login from './components/Login';
import Home from './components/Home';
import RegisterPage from './pages/RegisterPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import AppShell from './components/AppShell';
import Landing from './components/Landing';
import CargaPantalla from './components/ui/CargaPantalla';
import './App.css';

// Carga por partes: el cÃ³digo de estas pantallas se descarga reciÃ©n cuando se abren,
// asÃ­ la primera vista llega antes en celulares con poca seÃ±al.
const VerPerfiles = lazy(() => import('./components/VerPerfiles'));
const ListaEnfermeros = lazy(() => import('./components/ListaEnfermeros'));
const SolicitarServicio = lazy(() => import('./components/SolicitarServicio'));
const ConfirmacionSolicitud = lazy(() => import('./components/ConfirmacionSolicitud'));
const SolicitudesEnfermero = lazy(() => import('./components/SolicitudesEnfermero'));
const EstadoSolicitudes = lazy(() => import('./components/EstadoSolicitudes'));
const Privacidad = lazy(() => import('./components/Legal').then((m) => ({ default: m.Privacidad })));
const Terminos = lazy(() => import('./components/Legal').then((m) => ({ default: m.Terminos })));

const TITULO_INICIAL = 'Enfered Â· Cuidado cerca tuyo';
const TITULOS = [
  [/^\/login$/, 'Iniciar sesiÃ³n'],
  [/^\/registro$/, 'Crear cuenta'],
  [/^\/terminos$/, 'TÃ©rminos y condiciones'],
  [/^\/privacidad$/, 'PolÃ­tica de privacidad'],
  [/^\/home$/, 'Inicio'],
  [/^\/cartilla$/, 'Cartilla'],
  [/^\/perfil\/[^/]+\/solicitar$/, 'Pedir un turno'],
  [/^\/perfil\/[^/]+$/, 'Perfil del profesional'],
  [/^\/solicitudes\/[^/]+$/, 'Comprobante de solicitud'],
  [/^\/solicitudes-enfermero$/, 'Solicitudes recibidas'],
  [/^\/mis-solicitudes$/, 'Mis solicitudes'],
  [/^\/perfil-paciente$/, 'Mi perfil'],
  [/^\/perfil-enfermero$/, 'Mi perfil profesional'],
  [/^\/admin$/, 'Panel de administraciÃ³n'],
];

function EntryRoute() {
  const session = sesionActual();
  return (
    <Navigate
      to={session ? (session.rol === 'administrador' ? '/admin' : '/home') : '/login'}
      replace
    />
  );
}

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const target = () => document.getElementById(hash.slice(1));
      const scroll = () => target()?.scrollIntoView({ block: 'start' });
      if (target()) {
        scroll();
        return;
      }
      // El perfil carga sus secciones despuÃ©s de consultar la API.
      const observer = new window.MutationObserver(() => {
        if (target()) {
          scroll();
          observer.disconnect();
        }
      });
      observer.observe(document.getElementById('root'), {
        childList: true,
        subtree: true,
      });
      return () => observer.disconnect();
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, hash]);
  return null;
}

function enfocar(elemento) {
  if (!elemento) return false;
  if (!elemento.hasAttribute('tabindex')) elemento.setAttribute('tabindex', '-1');
  elemento.focus({ preventScroll: true });
  return true;
}

// TÃ­tulo de la pestaÃ±a por pantalla y, al navegar, foco en el tÃ­tulo para que el lector
// de pantalla anuncie la pÃ¡gina nueva en lugar de quedarse en el enlace tocado.
function TituloYFoco() {
  const { pathname, hash } = useLocation();
  const primeraVista = useRef(true);
  useEffect(() => {
    const titulo = TITULOS.find(([patron]) => patron.test(pathname))?.[1];
    document.title = titulo ? `${titulo} Â· Enfered` : TITULO_INICIAL;
    if (primeraVista.current) {
      primeraVista.current = false;
      return undefined;
    }
    if (hash) return undefined;
    const buscarTitulo = () => document.querySelector('#contenido h1') || document.querySelector('h1');
    if (enfocar(buscarTitulo())) return undefined;
    // Las pantallas por partes o que consultan la API muestran el tÃ­tulo un momento despuÃ©s.
    const observer = new window.MutationObserver(() => {
      if (enfocar(buscarTitulo())) observer.disconnect();
    });
    observer.observe(document.getElementById('root'), { childList: true, subtree: true });
    const espera = window.setTimeout(() => {
      observer.disconnect();
      enfocar(document.getElementById('contenido'));
    }, 2000);
    return () => {
      observer.disconnect();
      window.clearTimeout(espera);
    };
  }, [pathname, hash]);
  return null;
}

// Un 401 en cualquier pedido vuelve al login con la navegaciÃ³n del router, sin recargar.
function ConectarSesion() {
  const navigate = useNavigate();
  useEffect(() => {
    registrarNavegacion((destino) => navigate(destino, { replace: true }));
    const handleExpired = () => navigate('/login?motivo=expirada', { replace: true });
    window.addEventListener('enfered:session-expired', handleExpired);
    return () => {
      registrarNavegacion(null);
      window.removeEventListener('enfered:session-expired', handleExpired);
    };
  }, [navigate]);
  return null;
}
export function RutaProtegida({ children, rol }) {
  const [, actualizar] = useState(0);
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const session = sesionActual();
  const expiration = session?.exp;

  useEffect(() => {
    if (!expiration) return undefined;
    const restante = expiration * 1000 - Date.now();
    const timer = window.setTimeout(
      () => actualizar((value) => value + 1),
      Math.max(0, Math.min(restante + 100, 2147483647)),
    );
    return () => window.clearTimeout(timer);
  }, [expiration]);

  if (!isAuthenticated || !session) {
    return (
      <Navigate
        to={rutaDeLogin('expirada', location.pathname + location.search)}
        replace
      />
    );
  }
  if (rol && session.rol !== rol) {
    return <Navigate to={session.rol === 'administrador' ? '/admin' : '/home'} replace />;
  }
  if (!rol && session.rol === 'administrador') return <Navigate to="/admin" replace />;
  return children;
}
function RutaProtegidaAdmin({ children }) {
  return <RutaProtegida rol="administrador">{children}</RutaProtegida>;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <TituloYFoco />
      <ConectarSesion />
      <Suspense fallback={<CargaPantalla />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/terminos" element={<Terminos />} />
          <Route path="/privacidad" element={<Privacidad />} />
          <Route
            element={
              <RutaProtegida>
                <AppShell />
              </RutaProtegida>
            }
          >
            <Route path="/home" element={<Home />} />
            <Route path="/perfil/:id/solicitar" element={<RutaProtegida rol="paciente"><SolicitarServicio /></RutaProtegida>} />
            <Route path="/solicitudes/:idSolicitud" element={<ConfirmacionSolicitud />} />
            <Route path="/solicitudes-enfermero" element={<RutaProtegida rol="enfermero"><SolicitudesEnfermero /></RutaProtegida>} />
            <Route path="/mis-solicitudes" element={<RutaProtegida rol="paciente"><EstadoSolicitudes /></RutaProtegida>} />
            <Route
              path="/perfil-paciente"
              element={
                <RutaProtegida rol="paciente">
                  <ProfilePage />
                </RutaProtegida>
              }
            />
            <Route
              path="/perfil-enfermero"
              element={
                <RutaProtegida rol="enfermero">
                  <ProfilePage />
                </RutaProtegida>
              }
            />
            <Route path="/perfil/:id" element={<VerPerfiles />} />
            <Route path="/cartilla" element={<ListaEnfermeros />} />
          </Route>
          <Route
            element={
              <RutaProtegidaAdmin>
                <AppShell />
              </RutaProtegidaAdmin>
            }
          >
            <Route path="/admin" element={<AdminPage />} />
          </Route>
          <Route path="*" element={<EntryRoute />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}


