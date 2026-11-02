// PROVISORIO (lo reemplaza el Layout y las rutas de Pablo). Deja las rutas de las pantallas de Leo.
import { Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Login from './pantallas/Login.jsx';
import Buscar from './pantallas/Buscar.jsx';
import Perfil from './pantallas/Perfil.jsx';
import Solicitar from './pantallas/Solicitar.jsx';
import MisSolicitudes from './pantallas/MisSolicitudes.jsx';
import Bandeja from './pantallas/Bandeja.jsx';
import Chat from './pantallas/Chat.jsx';

const inicio = (u) => (u.rol === 'ENFERMERO' ? '/bandeja' : '/buscar');
const Marca = () => <strong className="marca"><span className="cruz">✚</span> Enfered<span className="punto">.</span></strong>;

function Protegida({ roles }) {
  const { usuario, salir } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(usuario.rol)) return <Navigate to={inicio(usuario)} replace />;
  return (
    <>
      <header className="top">
        <Marca />
        <nav aria-label="Principal">
          {usuario.rol === 'PACIENTE' && <><NavLink to="/buscar">Buscar</NavLink><NavLink to="/solicitudes">Mis solicitudes</NavLink></>}
          {usuario.rol === 'ENFERMERO' && <NavLink to="/bandeja">Bandeja</NavLink>}
        </nav>
        <span className="quien">{usuario.nombre}</span>
        <button className="link" onClick={salir}>Salir</button>
      </header>
      <main><Outlet /></main>
    </>
  );
}

export default function App() {
  const { usuario } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to={usuario ? inicio(usuario) : '/login'} replace />} />
      <Route element={<Protegida roles={['PACIENTE']} />}>
        <Route path="/buscar" element={<Buscar />} />
        <Route path="/enfermeros/:id" element={<Perfil />} />
        <Route path="/enfermeros/:id/solicitar" element={<Solicitar />} />
        <Route path="/solicitudes" element={<MisSolicitudes />} />
      </Route>
      <Route element={<Protegida roles={['ENFERMERO']} />}><Route path="/bandeja" element={<Bandeja />} /></Route>
      <Route element={<Protegida roles={['PACIENTE', 'ENFERMERO']} />}><Route path="/chat/:id" element={<Chat />} /></Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
