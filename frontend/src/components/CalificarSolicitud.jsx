import { useState } from 'react';
import { resenasApi } from '../api/contract.js';
import { fechaLegible } from '../fechas';
import ModalCalificacion from './ModalCalificacion';

// HU11: el paciente califica una atención Realizada desde la tarjeta o el comprobante.
// Mismo POST /resenas que el historial; el backend rechaza una segunda reseña.
export default function CalificarSolicitud({ solicitud, onCalificada }) {
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const profesional = [solicitud.enfermero?.nombre, solicitud.enfermero?.apellido].filter(Boolean).join(' ');

  async function enviar({ estrellas, comentario }) {
    if (guardando) return;
    setGuardando(true);
    setError('');
    try {
      const resultado = await resenasApi.create({
        solicitudId: String(solicitud.idSolicitud),
        puntuacion: estrellas,
        comentario,
      });      setAbierto(false);
      onCalificada?.({
        idCalificacion: resultado?.id,
        idSolicitud: solicitud.idSolicitud,
        estrellas: resultado?.puntuacion ?? estrellas,
        comentario: resultado?.comentario ?? comentario,
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <button
        className="button button-primary"
        type="button"
        onClick={() => { setError(''); setAbierto(true); }}
      >
        Calificar
      </button>
      {abierto && (
        <ModalCalificacion
          id={`calificar-${solicitud.idSolicitud}`}
          titulo="Calificar la atención"
          descripcion={[profesional, solicitud.servicio?.tipoServicio, fechaLegible(solicitud.fecha)]
            .filter(Boolean).join(' · ')}
          guardando={guardando}
          error={error}
          onEnviar={enviar}
          onCerrar={() => setAbierto(false)}
        />
      )}
    </>
  );
}
