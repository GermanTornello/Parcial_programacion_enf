import { useEffect, useState } from 'react';
import { cargarResenas } from '../api/cartilla';
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

// Reseñas que dejaron los pacientes (resenas-service, GraphQL). En el TP no hay denuncias de reseñas.
export default function ResenasProfesional({ idEnfermero }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    setDatos(null);
    setError('');
    cargarResenas(idEnfermero)
      .then((data) => {
        if (vigente) setDatos(data);
      })
      .catch(() => {
        if (vigente) setError('No pudimos cargar las reseñas.');
      });
    return () => {
      vigente = false;
    };
  }, [idEnfermero, intento]);

  const cantidad = datos?.cantidadResenas ?? 0;

  return (
    <section
      className="content-panel profile-reviews"
      aria-labelledby="resenas-titulo"
      aria-busy={!datos && !error}
    >
      <h2 className="panel-title" id="resenas-titulo">
        <Icon name="star" />
        Reseñas de pacientes
      </h2>
      {error ? (
        <div className="notice notice-error" role="alert">
          {error}{' '}
          <button className="text-link" type="button" onClick={() => setIntento((value) => value + 1)}>
            Reintentar
          </button>
        </div>
      ) : !datos ? (
        <p role="status">Cargando reseñas…</p>
      ) : !datos.resenas.length ? (
        <p>
          Todavía no tiene reseñas. Los pacientes pueden publicarlas después de
          una atención realizada.
        </p>
      ) : (
        <>
          {datos.calificacionPromedio != null && (
            <div className="profile-reviews-summary">
              <strong>{formatoPuntuacion(datos.calificacionPromedio)}</strong>
              <EstrellasLectura valor={datos.calificacionPromedio} />
              <span>
                {cantidad} {cantidad === 1 ? 'reseña' : 'reseñas'}
              </span>
            </div>
          )}
          <ul className="profile-reviews-list">
            {datos.resenas.map((resena) => (
              <li key={resena.idResena}>
                <div className="profile-review-heading">
                  <strong>{resena.paciente || 'Paciente'}</strong>
                  {fechaLegible(resena.fecha) && (
                    <time dateTime={resena.fecha}>{fechaLegible(resena.fecha)}</time>
                  )}
                </div>
                <EstrellasLectura valor={resena.puntuacion} />
                {resena.comentario && <p>{resena.comentario}</p>}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
