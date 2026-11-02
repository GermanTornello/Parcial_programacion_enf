import { useCallback, useEffect, useRef, useState } from 'react';

export function useCarga(fn, deps) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);
  const cargar = useCallback(() => {
    setCargando(true);
    fn().then((d) => { setDatos(d); setError(null); }).catch((e) => setError(e.message)).finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(cargar, [cargar]);
  return { datos, setDatos, error, cargando, recargar: cargar };
}

// Cuatro estados de pantalla: carga, vacío, error con "Reintentar" (el éxito lo muestra cada pantalla).
export function Estado({ cargando, error, vacio, onReintentar }) {
  if (cargando) return <p className="aviso info" role="status">Cargando…</p>;
  if (error) return (
    <div className="aviso error" role="alert">
      <p>No pudimos cargar esto: {error}</p>
      <button className="btn" onClick={onReintentar}>Reintentar</button>
    </div>
  );
  return vacio ? <p className="vacio">{vacio}</p> : null;
}

export const Aviso = ({ tipo = 'info', children }) =>
  children ? <p className={`aviso ${tipo}`} role={tipo === 'error' ? 'alert' : 'status'} aria-live="polite">{children}</p> : null;

export const Estrellas = ({ valor, cantidad }) => (
  <span className="estrellas" aria-label={cantidad === 0 ? 'Sin reseñas todavía' : `${valor} de 5 estrellas`}>
    {cantidad === 0 ? <span className="sub">Sin reseñas</span> : <>{'★'.repeat(Math.round(valor))}<span className="off">{'★'.repeat(5 - Math.round(valor))}</span> <b>{valor.toFixed(1)}</b> <span className="sub">({cantidad})</span></>}
  </span>
);

const TXT = { PENDIENTE: 'Pendiente', ACEPTADA: 'Aceptada', REALIZADA: 'Realizada', RECHAZADA: 'Rechazada', CANCELADA: 'Cancelada' };
export const EstadoBadge = ({ estado }) => <span className={`badge ${estado.toLowerCase()}`}>{TXT[estado]}</span>;
export const ESTADOS = Object.keys(TXT);

export const fechaLarga = (fecha, hora) =>
  new Date(`${fecha}T${hora || '00:00'}`).toLocaleString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', ...(hora ? { hour: '2-digit', minute: '2-digit' } : {}) }) + (hora ? ' h' : '');

export function Modal({ titulo, onCerrar, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const previo = document.activeElement;
    ref.current?.querySelector('textarea,input,button')?.focus();
    const esc = (e) => e.key === 'Escape' && onCerrar();
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('keydown', esc); previo?.focus?.(); };
  }, [onCerrar]);
  return (
    <div className="fondo-modal" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo} ref={ref}>
        <h2>{titulo}</h2>{children}
      </div>
    </div>
  );
}

export const Pagina = ({ etiqueta, titulo, children }) => (
  <section className="pagina">
    {etiqueta && <p className="etiqueta">{etiqueta}</p>}
    <h1>{titulo}</h1>{children}
  </section>
);

export function ModalMotivo({ titulo, obligatorio, onConfirmar, onCerrar, textoBoton }) {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const enviar = async (e) => {
    e.preventDefault();
    if (obligatorio && !motivo.trim()) { setError('Contanos el motivo para poder continuar.'); return; }
    setEnviando(true);
    try { await onConfirmar(motivo.trim()); } catch (err) { setError(err.message); setEnviando(false); }
  };
  return (
    <Modal titulo={titulo} onCerrar={onCerrar}>
      <form onSubmit={enviar} className="form">
        <label>Motivo {obligatorio ? '' : '(opcional)'}<textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} /></label>
        <Aviso tipo="error">{error}</Aviso>
        <div className="fila-botones">
          <button type="button" className="btn" onClick={onCerrar}>Volver</button>
          <button className="btn primario" disabled={enviando}>{enviando ? 'Enviando…' : textoBoton}</button>
        </div>
      </form>
    </Modal>
  );
}

export function ModalCalificar({ solicitud, onConfirmar, onCerrar }) {
  const [puntuacion, setPuntuacion] = useState(0);
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const enviar = async (e) => {
    e.preventDefault();
    if (!puntuacion) { setError('Elegí de 1 a 5 estrellas.'); return; }
    setEnviando(true);
    try { await onConfirmar({ solicitudId: solicitud.id, puntuacion, comentario }); } catch (err) { setError(err.message); setEnviando(false); }
  };
  return (
    <Modal titulo={`Calificá a ${solicitud.enfermeroNombre}`} onCerrar={onCerrar}>
      <form onSubmit={enviar} className="form">
        <div className="elegir" role="radiogroup" aria-label="Puntuación">
          {[1, 2, 3, 4, 5].map((n) => (
            <button type="button" key={n} role="radio" aria-checked={puntuacion === n} aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`} className={n <= puntuacion ? 'on' : ''} onClick={() => setPuntuacion(n)}>★</button>
          ))}
        </div>
        <label>Comentario (opcional)<textarea rows={3} maxLength={500} value={comentario} onChange={(e) => setComentario(e.target.value)} /></label>
        <Aviso tipo="error">{error}</Aviso>
        <div className="fila-botones">
          <button type="button" className="btn" onClick={onCerrar}>Ahora no</button>
          <button className="btn primario" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar reseña'}</button>
        </div>
      </form>
    </Modal>
  );
}
