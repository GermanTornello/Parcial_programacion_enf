import { catalogApi, nursesApi, profileApi, requestsApi, resenasApi } from "../api/contract.js";

const ESTADOS_ANTIGUOS = {
  PENDIENTE: "Pendiente",
  ACEPTADA: "Aceptada",
  RECHAZADA: "Rechazada",
  CANCELADA: "Cancelada",
  REALIZADA: "Realizada",
};
const NOMBRES_DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function idDe(value) {
  if (typeof value === "string") return value;
  return value?.id ?? value?._id ?? value?.idServicio ?? null;
}

function persona(nombre = "") {
  const [firstName = "", ...lastNames] = String(nombre).trim().split(/\s+/);
  return { nombre: firstName, apellido: lastNames.join(" ") };
}

function adaptarSolicitud(value) {
  if (!value || typeof value !== "object") return value;
  const nurseName = value.enfermeroNombre || "";
  const patientName = value.pacienteNombre || "";
  const service = value.servicio;
  return {
    ...value,
    idSolicitud: value.idSolicitud ?? value.id,
    idPaciente: value.idPaciente ?? value.pacienteId,
    idEnfermero: value.idEnfermero ?? value.enfermeroId,
    estado: ESTADOS_ANTIGUOS[value.estado] || value.estado,
    paciente: value.paciente || persona(patientName),
    enfermero: value.enfermero || persona(nurseName),
    servicio: service && {
      ...service,
      idServicio: service.idServicio ?? service.id,
      tipoServicio: service.tipoServicio ?? service.nombre,
      precioEstimado: service.precioEstimado ?? service.precioReferencia,
    },
  };
}

function adaptarResultado(value, message) {
  const solicitud = adaptarSolicitud(value?.solicitud || value);
  return { ...(value && typeof value === "object" ? value : {}), solicitud, mensaje: value?.mensaje || message };
}

export async function obtenerProfesional(id, signal) {
  const nurse = await nursesApi.getPublicProfile(id, signal);
  return {
    ...nurse,
    idEnfermero: nurse.idEnfermero ?? nurse.id,
    verificado: nurse.verificado ?? nurse.estadoVerificacion === "APROBADO",
    servicios: (nurse.servicios ?? nurse.serviciosOfrecidos ?? []).map((service) => ({
      idServicio: idDe(service),
    })).filter((service) => service.idServicio),
    horarios: nurse.horarios ?? (nurse.disponibilidad ?? []).map(({ dia, desde, hasta }) => ({
      dia_semana: NOMBRES_DIAS[dia],
      hora_inicio: desde,
      hora_fin: hasta,
      estado: "Disponible",
    })),
  };
}

export async function obtenerServicios() {
  const services = await catalogApi.list({ activo: true });
  return services.map((service) => ({
    ...service,
    idServicio: service.idServicio ?? service.id,
    tipoServicio: service.tipoServicio ?? service.nombre,
    precioEstimado: service.precioEstimado ?? service.precioReferencia,
    duracionMinutos: service.duracionMinutos ?? service.duracionEstimadaMin,
  }));
}

export async function crearSolicitud(data) {
  const result = await requestsApi.create({
    enfermeroId: String(data.enfermeroId ?? data.idEnfermero),
    servicioId: String(data.servicioId ?? data.idServicio),
    fecha: data.fecha,
    hora: data.hora,
    direccionAtencion: data.direccionAtencion,
    ...(data.notas ? { notas: data.notas } : {}),
  });
  return adaptarResultado(result, "Solicitud creada.");
}

export async function obtenerSolicitud(id, signal) {
  return adaptarSolicitud(await requestsApi.get(id, signal));
}

export async function cancelarSolicitud(id, data = {}) {
  return adaptarResultado(await requestsApi.cancel(id, data), "Solicitud cancelada.");
}

export async function cancelarTurnoEnfermero(id, motivo) {
  return adaptarResultado(await requestsApi.cancel(id, { motivo }), "Turno cancelado.");
}

export async function obtenerSolicitudesEnfermero(_id, signal) {
  const response = await requestsApi.list({}, signal);
  const items = Array.isArray(response) ? response : response?.solicitudes;
  return Array.isArray(items) ? items.map(adaptarSolicitud) : items;
}

export async function aceptarSolicitud(id) {
  return adaptarResultado(await requestsApi.accept(id), "Solicitud aceptada.");
}

export async function rechazarSolicitud(id, data = {}) {
  return adaptarResultado(await requestsApi.reject(id, data), "Solicitud rechazada.");
}

export async function finalizarSolicitud(id) {
  return adaptarResultado(await requestsApi.perform(id), "Servicio marcado como realizado.");
}

export async function obtenerSolicitudesPaciente(_id, signal) {
  const response = await requestsApi.list({}, signal);
  const items = Array.isArray(response) ? response : response?.solicitudes;
  return Array.isArray(items) ? items.map(adaptarSolicitud) : items;
}

// Perfil del usuario logueado (GET /auth/me). En el contrato el id del paciente y del
// enfermero es el mismo id del usuario.
export async function obtenerPerfilPropio(signal) {
  const user = await profileApi.getCurrent(signal);
  return { ...user, idPaciente: user?.id, idEnfermero: user?.id };
}

export async function actualizarTelefono(telefono) {
  return profileApi.update({ telefono });
}

// Mensaje del contrato ({ id, autorId, autorNombre, texto, createdAt }) con los nombres de PP3.
function adaptarMensaje(value) {
  return {
    ...value,
    idMensaje: value.idMensaje ?? value.id,
    idEmisor: value.idEmisor ?? value.autorId,
    contenido: value.contenido ?? value.texto,
    fechaHora: value.fechaHora ?? value.createdAt,
  };
}

export async function obtenerMensajes(idSolicitud, signal) {
  const items = await requestsApi.messages(idSolicitud, signal);
  return Array.isArray(items) ? items.map(adaptarMensaje) : items;
}

export async function enviarMensaje(idSolicitud, contenido) {
  return adaptarMensaje(await requestsApi.sendMessage(idSolicitud, contenido));
}

// Reseñas del paciente (GraphQL misResenas) indexadas por solicitud: dicen qué atención ya calificó.
export async function calificacionesPropias() {
  const resenas = await resenasApi.mine();
  return Object.fromEntries(resenas.map((resena) => [resena.solicitudId, {
    idCalificacion: resena.id,
    idSolicitud: resena.solicitudId,
    estrellas: resena.puntuacion,
    comentario: resena.comentario ?? "",
  }]));
}

export async function calificarSolicitud({ idSolicitud, puntuacion, comentario }) {
  const resena = await resenasApi.create({
    solicitudId: String(idSolicitud),
    puntuacion,
    ...(comentario?.trim() ? { comentario: comentario.trim() } : {}),
  });
  return { idResena: resena.id, puntuacion: resena.puntuacion, comentario: resena.comentario ?? "" };
}

export function errorSolicitud(error) {
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message.join(" ");
  if (typeof message === "string") return message;
  if (error.response?.status === 401) return "Tu sesión venció. Volvé a iniciar sesión.";
  if (error.response?.status === 404) return "No encontramos esa solicitud.";
  if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
    return "No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.";
  }
  return error.message || "No se pudo completar la operación. Intentá nuevamente.";
}
