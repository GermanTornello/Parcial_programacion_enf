import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cancelarSolicitud, crearResena, listarSolicitudes, misResenas } from '../datos';
import { Aviso, ESTADOS, Estado, EstadoBadge, ModalCalificar, ModalMotivo, Pagina, fechaLarga, useCarga } from '../componentes/ui';

export default function MisSolicitudes() {
  const [f, setF] = useState({ estado: '', desde: '', hasta: '' });
  const res = useCarga(() => listarSolicitudes(f), [f.estado, f.desde, f.hasta]);
  const rev = useCarga(misResenas, []);
  const [cancelando, setCancelando] = useState(null);
  const [calificando, setCalificando] = useState(null);
  const [exito, setExito] = useState('');
  const yaCalificadas = new Set((rev.datos ?? []).map((r) => r.solicitudId));
  const cambiar = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <Pagina etiqueta="Pacientes" titulo="Mis solicitudes">
      <form className="filtros" onSubmit={(e) => e.preventDefault()} aria-label="Filtros">
        <label>Estado<select value={f.estado} onChange={cambiar('estado')}><option value="">Todos</option>{ESTADOS.map((s) => <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</option>)}</select></label>
        <label>Desde<input type="date" value={f.desde} onChange={cambiar('desde')} /></label>
        <label>Hasta<input type="date" value={f.hasta} onChange={cambiar('hasta')} /></label>
      </form>
      <Aviso tipo="exito">{exito}</Aviso>
      <Estado cargando={res.cargando} error={res.error} onReintentar={res.recargar}
        vacio={res.datos?.length === 0 && (f.estado || f.desde || f.hasta ? 'No hay solicitudes con esos filtros.' : <>Todavía no pediste ningún servicio. <Link to="/buscar">Buscá un enfermero</Link> para empezar.</>)} />
      <ul className="lista">
        {res.datos?.map((s) => (
          <li key={s.id} className="tarjeta">
            <div>
              <h2>{s.servicio.nombre} con {s.enfermeroNombre}</h2>
              <p className="sub">{fechaLarga(s.fecha, s.hora)} · {s.direccionAtencion}</p>
              {s.notas && <p>{s.notas}</p>}
              {s.estado === 'RECHAZADA' && s.motivoRechazo && <p className="sub">Motivo: {s.motivoRechazo}</p>}
              {s.estado === 'CANCELADA' && <p className="sub">Cancelada por {s.canceladaPor === 'ENFERMERO' ? 'el enfermero' : 'vos'}{s.motivoCancelacion ? `: ${s.motivoCancelacion}` : ''}</p>}
            </div>
            <div className="acciones">
              <EstadoBadge estado={s.estado} />
              {['PENDIENTE', 'ACEPTADA'].includes(s.estado) && <Link className="btn" to={`/chat/${s.id}`}>Abrir chat</Link>}
              {['PENDIENTE', 'ACEPTADA'].includes(s.estado) && <button className="btn" onClick={() => setCancelando(s)}>Cancelar</button>}
              {s.estado === 'REALIZADA' && !yaCalificadas.has(s.id) && <button className="btn primario" onClick={() => setCalificando(s)}>Calificar</button>}
              {s.estado === 'REALIZADA' && yaCalificadas.has(s.id) && <span className="sub">Ya la calificaste</span>}
            </div>
          </li>
        ))}
      </ul>
      {cancelando && (
        <ModalMotivo titulo="Cancelar solicitud" textoBoton="Cancelar solicitud" onCerrar={() => setCancelando(null)}
          onConfirmar={async (m) => { await cancelarSolicitud(cancelando.id, m); setCancelando(null); setExito('Cancelaste la solicitud.'); res.recargar(); }} />
      )}
      {calificando && (
        <ModalCalificar solicitud={calificando} onCerrar={() => setCalificando(null)}
          onConfirmar={async (d) => { await crearResena(d); setCalificando(null); setExito('¡Gracias por tu reseña!'); rev.recargar(); }} />
      )}
    </Pagina>
  );
}
