import { useEffect, useState } from 'react';
import { resenasApi } from '../api/contract.js';
import Icon from './ui/Icon';
import { EstrellasLectura, formatoPuntuacion } from './SelectorEstrellas';

function fechaLegible(valor) {
  const fecha = new Date(valor);
  if (!valor || Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function ResenasProfesional({ idEnfermero }) {
  const [resenas, setResenas] = useState([]);
  const [reputacion, setReputacion] = useState(null);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError('');
    Promise.all([
      resenasApi.list(String(idEnfermero)),
      resenasApi.reputation(String(idEnfermero)),
    ])
      .then(([lista, promedio]) => {
        if (!activo) return;
        setResenas(Array.isArray(lista) ? lista : []);
        setReputacion(promedio);
      })
      .catch((requestError) => {
        if (activo) setError(requestError.response?.data?.message || requestError.message || 'No pudimos cargar las reseñas.');
      })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [idEnfermero, intento]);

  return (
    <section className="content-panel profile-reviews" aria-labelledby="resenas-titulo" aria-busy={cargando}>
      <h2 className="panel-title" id="resenas-titulo"><Icon name="star" /> Reseñas de pacientes</h2>
      {error ? (
        <div className="notice notice-error" role="alert">
          {error}{' '}
          <button className="text-link" type="button" onClick={() => setIntento((value) => value + 1)}>Reintentar</button>
        </div>
      ) : cargando ? (
        <p role="status">Cargando reseñas…</p>
      ) : !resenas.length ? (
        <p>Todavía no tiene reseñas. Los pacientes pueden publicarlas después de una atención realizada.</p>
      ) : (
        <>
          {reputacion && reputacion.cantidad > 0 ? (
            <div className="profile-reviews-summary">
              <strong>{formatoPuntuacion(reputacion.promedio)}</strong>
              <EstrellasLectura valor={reputacion.promedio} />
              <span>{reputacion.cantidad} {reputacion.cantidad === 1 ? 'reseña' : 'reseñas'}</span>
            </div>
          ) : null}
          <ul className="profile-reviews-list">
            {resenas.map((resena) => (
              <li key={resena.id}>
                <div className="profile-review-heading">
                  <strong>{resena.pacienteNombre || 'Paciente'}</strong>
                  {fechaLegible(resena.createdAt) ? <time dateTime={resena.createdAt}>{fechaLegible(resena.createdAt)}</time> : null}
                </div>
                <EstrellasLectura valor={resena.puntuacion} />
                {resena.comentario ? <p>{resena.comentario}</p> : null}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
