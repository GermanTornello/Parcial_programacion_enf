// Llamadas al backend real (contrato: TAREAS_GRUPO.md, sección 2.7).
// Cuando la capa de API de Pablo (src/api.js) esté lista, se pueden reemplazar los
// cuerpos de estas funciones por las suyas; las pantallas no cambian.
import axios from 'axios';

const hacer = (baseURL) => {
  const i = axios.create({ baseURL });
  i.interceptors.request.use((c) => {
    const t = localStorage.getItem('token');
    if (t) c.headers.Authorization = `Bearer ${t}`;
    return c;
  });
  i.interceptors.response.use((r) => r, (e) => {
    if (e.response?.status === 401 && localStorage.getItem('token')) { localStorage.clear(); window.location.assign('/login'); }
    const m = e.response?.data?.message;
    return Promise.reject(new Error(Array.isArray(m) ? m.join('. ') : m || 'No pudimos conectarnos con el servidor. Probá de nuevo.'));
  });
  return i;
};
const usuarios = hacer(import.meta.env.VITE_USUARIOS_URL);
const solicitudes = hacer(import.meta.env.VITE_SOLICITUDES_URL);
const resenas = hacer(import.meta.env.VITE_RESENAS_URL);

const gql = async (cliente, query, variables) => {
  const { data } = await cliente.post('/graphql', { query, variables });
  if (data.errors) throw new Error(data.errors[0].message);
  return data.data;
};
const limpio = (o = {}) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== undefined && v !== null && v !== false));
const REP = 'enfermeroId promedio cantidad';
const RES = 'id solicitudId pacienteId pacienteNombre enfermeroId puntuacion comentario createdAt';

const reputaciones = async (ids) => {
  if (!ids.length) return {};
  const d = await gql(resenas, `query($ids:[String!]!){ reputaciones(enfermeroIds:$ids){ ${REP} } }`, { ids });
  return Object.fromEntries(d.reputaciones.map((r) => [r.enfermeroId, r]));
};

export const login = (email, password) => usuarios.post('/auth/login', { email, password }).then((r) => r.data);

export const listarServicios = () =>
  gql(solicitudes, '{ servicios(activo:true){ id nombre descripcion duracionEstimadaMin precioReferencia activo } }').then((d) => d.servicios);

export async function buscarEnfermeros(f = {}) {
  const { data } = await usuarios.get('/enfermeros/buscar', { params: limpio({ lat: -32.8895, lng: -68.8458, radioKm: 10, ...f }) });
  const reps = await reputaciones(data.map((e) => e.id)).catch(() => ({}));
  return data.map((e) => ({ ...e, reputacion: reps[e.id] ?? { enfermeroId: e.id, promedio: 0, cantidad: 0 } }));
}
export async function obtenerEnfermero(id) {
  const { data: enfermero } = await usuarios.get(`/enfermeros/${id}`);
  const d = await gql(resenas, `query($id:String!){ resenas(enfermeroId:$id){ ${RES} } reputacion(enfermeroId:$id){ ${REP} } }`, { id });
  return { enfermero, reputacion: d.reputacion, resenas: d.resenas };
}
export const crearSolicitud = (b) => solicitudes.post('/solicitudes', limpio(b)).then((r) => r.data);
export const listarSolicitudes = (f) => solicitudes.get('/solicitudes', { params: limpio(f) }).then((r) => r.data);
export const obtenerSolicitud = (id) => solicitudes.get(`/solicitudes/${id}`).then((r) => r.data);
export const aceptarSolicitud = (id) => solicitudes.patch(`/solicitudes/${id}/aceptar`).then((r) => r.data);
export const rechazarSolicitud = (id, motivo) => solicitudes.patch(`/solicitudes/${id}/rechazar`, limpio({ motivo })).then((r) => r.data);
export const cancelarSolicitud = (id, motivo) => solicitudes.patch(`/solicitudes/${id}/cancelar`, limpio({ motivo })).then((r) => r.data);
export const realizarSolicitud = (id) => solicitudes.patch(`/solicitudes/${id}/realizar`).then((r) => r.data);
export const listarMensajes = (id) => solicitudes.get(`/solicitudes/${id}/mensajes`).then((r) => r.data);
export const enviarMensaje = (id, texto) => solicitudes.post(`/solicitudes/${id}/mensajes`, { texto }).then((r) => r.data);
export const misResenas = () => gql(resenas, `{ misResenas { ${RES} } }`).then((d) => d.misResenas);
export const crearResena = (input) =>
  gql(resenas, `mutation($input:CreateResenaInput!){ createResena(input:$input){ ${RES} } }`, { input: limpio({ ...input, comentario: input.comentario?.trim() }) }).then((d) => d.createResena);
