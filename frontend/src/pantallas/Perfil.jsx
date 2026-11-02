import { Link, useParams } from 'react-router-dom';
import { listarServicios, obtenerEnfermero } from '../datos';
import { useAuth } from '../auth';
import { Estado, Estrellas, Pagina, useCarga } from '../componentes/ui';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function Perfil() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const perfil = useCarga(() => obtenerEnfermero(id), [id]);
  const servicios = useCarga(listarServicios, []);
  if (!perfil.datos) return <Pagina titulo="Perfil"><Estado cargando={perfil.cargando} error={perfil.error} onReintentar={perfil.recargar} /></Pagina>;

  const { enfermero: e, reputacion, resenas } = perfil.datos;
  const ofrecidos = (servicios.datos ?? []).filter((s) => e.serviciosOfrecidos.includes(s.id));
  return (
    <Pagina etiqueta={`${e.departamento} · Matrícula ${e.matricula}`} titulo={`${e.nombre} ${e.apellido}`}>
      <Link to="/buscar" className="volver">‹ Volver a la búsqueda</Link>
      <p><Estrellas valor={reputacion.promedio} cantidad={reputacion.cantidad} /></p>
      <p className="sub">{e.aniosExperiencia} años de experiencia · Atiende hasta {e.radioCoberturaKm} km a la redonda{e.tarifaHora ? ` · Tarifa propia: $${e.tarifaHora.toLocaleString('es-AR')} por hora` : ''}</p>
      {e.descripcion && <p>{e.descripcion}</p>}
      <p className="tags">{e.especialidades.map((s) => <span key={s} className="verde">{s}</span>)}</p>

      <h2>Servicios que ofrece</h2>
      {ofrecidos.length === 0 ? <p className="vacio">Todavía no cargó servicios.</p> : (
        <ul className="lista">{ofrecidos.map((s) => <li key={s.id} className="tarjeta"><div><h3>{s.nombre}</h3><p className="sub">{s.descripcion} · {s.duracionEstimadaMin} min</p></div></li>)}</ul>
      )}

      <h2>Horarios de atención</h2>
      {e.disponibilidad?.length ? (
        <ul className="horarios">{[...e.disponibilidad].sort((a, b) => a.dia - b.dia).map((h) => <li key={h.dia}><b>{DIAS[h.dia]}</b> de {h.desde} a {h.hasta}</li>)}</ul>
      ) : <p className="vacio">Coordiná el horario por chat al solicitar el servicio.</p>}

      {usuario.rol === 'PACIENTE' && (e.disponible
        ? <Link className="btn primario" to={`/enfermeros/${e.id}/solicitar`}>Solicitar servicio</Link>
        : <p className="aviso info">Por ahora no está recibiendo solicitudes nuevas.</p>)}

      <h2>Reseñas</h2>
      {resenas.length === 0 && <p className="vacio">Todavía no tiene reseñas.</p>}
      <ul className="lista">
        {resenas.map((r) => (
          <li key={r.id} className="tarjeta"><div>
            <p><Estrellas valor={r.puntuacion} cantidad={1} /> <b>{r.pacienteNombre}</b> <span className="sub">· {new Date(r.createdAt).toLocaleDateString('es-AR')}</span></p>
            {r.comentario && <p>{r.comentario}</p>}
          </div></li>
        ))}
      </ul>
    </Pagina>
  );
}
