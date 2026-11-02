import { useState } from 'react';
import { Link } from 'react-router-dom';
import { aceptarSolicitud, cancelarSolicitud, listarSolicitudes, realizarSolicitud, rechazarSolicitud } from '../datos';
import { Aviso, ESTADOS, Estado, EstadoBadge, ModalMotivo, Pagina, fechaLarga, useCarga } from '../componentes/ui';

export default function Bandeja() {
  const [f, setF] = useState({ estado: '', desde: '', hasta: '' });
  const res = useCarga(() => listarSolicitudes(f), [f.estado, f.desde, f.hasta]);
  const [modal, setModal] = useState(null);
  const [exito, setExito] = useState('');
  const [error, setError] = useState('');
  const cambiar = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const pendientes = res.datos?.filter((s) => s.estado === 'PENDIENTE').length ?? 0;

  const accion = async (fn, mensaje) => {
    setError(''); setExito('');
    try { await fn(); setExito(mensaje); res.recargar(); } catch (e) { setError(e.message); }
  };

  return (
    <Pagina etiqueta="Enfermeros" titulo="Bandeja de solicitudes">
      {res.datos && <p className="sub" aria-live="polite">{pendientes ? `Tenés ${pendientes} ${pendientes === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'} de respuesta.` : 'No tenés solicitudes pendientes de respuesta.'}</p>}
      <form className="filtros" onSubmit={(e) => e.preventDefault()} aria-label="Filtros">
        <label>Estado<select value={f.estado} onChange={cambiar('estado')}><option value="">Todos</option>{ESTADOS.map((s) => <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</option>)}</select></label>
        <label>Desde<input type="date" value={f.desde} onChange={cambiar('desde')} /></label>
        <label>Hasta<input type="date" value={f.hasta} onChange={cambiar('hasta')} /></label>
      </form>
      <Aviso tipo="exito">{exito}</Aviso>
      <Aviso tipo="error">{error}</Aviso>
      <Estado cargando={res.cargando} error={res.error} onReintentar={res.recargar} vacio={res.datos?.length === 0 && 'Todavía no recibiste solicitudes.'} />
      <ul className="lista">
        {res.datos?.map((s) => (
          <li key={s.id} className="tarjeta">
            <div>
              <h2>{s.servicio.nombre} · {s.pacienteNombre}</h2>
              <p className="sub">{fechaLarga(s.fecha, s.hora)} · {s.direccionAtencion}</p>
              {s.notas && <p>{s.notas}</p>}
              {s.estado === 'CANCELADA' && <p className="sub">Cancelada por {s.canceladaPor === 'ENFERMERO' ? 'vos' : 'el paciente'}{s.motivoCancelacion ? `: ${s.motivoCancelacion}` : ''}</p>}
            </div>
            <div className="acciones">
              <EstadoBadge estado={s.estado} />
              {s.estado === 'PENDIENTE' && <>
                <button className="btn primario" onClick={() => accion(() => aceptarSolicitud(s.id), 'Aceptaste la solicitud.')}>Aceptar</button>
                <button className="btn" onClick={() => setModal({ tipo: 'rechazar', s })}>Rechazar</button>
              </>}
              {s.estado === 'ACEPTADA' && <button className="btn primario" onClick={() => accion(() => realizarSolicitud(s.id), 'Marcaste el servicio como realizado.')}>Marcar realizada</button>}
              {['PENDIENTE', 'ACEPTADA'].includes(s.estado) && <Link className="btn" to={`/chat/${s.id}`}>Abrir chat</Link>}
              {['PENDIENTE', 'ACEPTADA'].includes(s.estado) && <button className="btn" onClick={() => setModal({ tipo: 'cancelar', s })}>Cancelar</button>}
            </div>
          </li>
        ))}
      </ul>
      {modal?.tipo === 'rechazar' && (
        <ModalMotivo titulo="Rechazar solicitud" textoBoton="Rechazar" onCerrar={() => setModal(null)}
          onConfirmar={async (m) => { await rechazarSolicitud(modal.s.id, m); setModal(null); setExito('Rechazaste la solicitud.'); res.recargar(); }} />
      )}
      {modal?.tipo === 'cancelar' && (
        <ModalMotivo titulo="Cancelar solicitud" obligatorio textoBoton="Cancelar solicitud" onCerrar={() => setModal(null)}
          onConfirmar={async (m) => { await cancelarSolicitud(modal.s.id, m); setModal(null); setExito('Cancelaste la solicitud.'); res.recargar(); }} />
      )}
    </Pagina>
  );
}
