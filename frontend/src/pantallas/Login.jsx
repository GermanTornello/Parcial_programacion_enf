// PROVISORIO (lo reemplaza el Login de Pablo).
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { login, MODO_PRUEBA } from '../datos';
import { useAuth } from '../auth.jsx';
import { Aviso } from '../componentes/ui';

export default function Login() {
  const { usuario, entrar } = useAuth();
  const [email, setEmail] = useState('paciente@enfered.com');
  const [password, setPassword] = useState('Paciente123!');
  const [error, setError] = useState('');
  if (usuario) return <Navigate to="/" replace />;
  const enviar = async (e) => { e.preventDefault(); setError(''); try { entrar(await login(email, password)); } catch (err) { setError(err.message); } };
  return (
    <section className="login">
      <p className="etiqueta">Enfermería a domicilio</p>
      <h1>Iniciá sesión</h1>
      <form className="form" onSubmit={enviar}>
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Contraseña<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        <Aviso tipo="error">{error}</Aviso>
        <button className="btn primario">Ingresar</button>
      </form>
      {MODO_PRUEBA && <p className="aviso info">Modo datos de prueba. Probá con paciente@enfered.com / Paciente123! o enfermera@enfered.com / Enfermera123!</p>}
    </section>
  );
}
