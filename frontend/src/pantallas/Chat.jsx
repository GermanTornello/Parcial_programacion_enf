import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { enviarMensaje, listarMensajes, obtenerSolicitud } from '../datos';
import { useAuth } from '../auth';
import { Aviso, Estado, Pagina, useCarga } from '../componentes/ui';

const ABIERTO = ['PENDIENTE', 'ACEPTADA'];

export default function Chat() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const sol = useCarga(() => obtenerSolicitud(id), [id]);
  const msgs = useCarga(() => listarMensajes(id), [id]);
  const [texto, setTexto] = useState('');
  const [fallo, setFallo] = useState('');
  const fin = useRef(null);
  const { setDatos } = msgs;

  // Se actualiza solo cada 3 segundos (polling).
  useEffect(() => {
    const t = setInterval(() => listarMensajes(id).then(setDatos).catch(() => {}), 3000);
    return () => clearInterval(t);
  }, [id, setDatos]);
  useEffect(() => { fin.current?.scrollIntoView({ block: 'end' }); }, [msgs.datos?.length]);

  const abierto = sol.datos ? ABIERTO.includes(sol.datos.estado) : false;
  const otro = sol.datos && (usuario.rol === 'PACIENTE' ? sol.datos.enfermeroNombre : sol.datos.pacienteNombre);
  const volver = usuario.rol === 'PACIENTE' ? '/solicitudes' : '/bandeja';

  const enviar = async (e) => {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    setFallo('');
    try { const m = await enviarMensaje(id, t); setTexto(''); setDatos((p) => [...(p ?? []), m]); } catch (err) { setFallo(err.message); }
  };

  return (
    <Pagina etiqueta={sol.datos?.servicio.nombre} titulo={otro ? `Chat con ${otro}` : 'Chat'}>
      <Link to={volver} className="volver">‹ Volver</Link>
      <Estado cargando={msgs.cargando && !msgs.datos} error={msgs.error} onReintentar={msgs.recargar} />
      <div className="chat" role="log" aria-live="polite" aria-label="Mensajes">
        {msgs.datos?.length === 0 && <p className="vacio">Todavía no hay mensajes. Escribí el primero para coordinar la visita.</p>}
        {msgs.datos?.map((m) => (
          <p key={m.id} className={m.autorId === usuario.id ? 'burbuja mia' : 'burbuja'}>
            <span className="autor">{m.autorId === usuario.id ? 'Vos' : m.autorNombre}</span>
            {m.texto}
            <time>{new Date(m.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</time>
          </p>
        ))}
        <div ref={fin} />
      </div>
      {sol.datos && !abierto && <Aviso tipo="info">Esta solicitud está {sol.datos.estado.toLowerCase()}, así que el chat quedó solo para leer.</Aviso>}
      <Aviso tipo="error">{fallo}</Aviso>
      <form className="envio" onSubmit={enviar}>
        <label className="oculto" htmlFor="msg">Mensaje</label>
        <input id="msg" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={1000} placeholder={abierto ? 'Escribí un mensaje' : 'Chat cerrado'} disabled={!abierto} />
        <button className="btn primario" disabled={!abierto || !texto.trim()}>Enviar</button>
      </form>
    </Pagina>
  );
}
