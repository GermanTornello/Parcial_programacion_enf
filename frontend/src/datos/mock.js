// Datos de prueba con la forma EXACTA del contrato (TAREAS_GRUPO.md, sección 2).
// Se usan con VITE_USE_MOCK=true mientras el backend no esté listo.
const espera = (v, ms = 200) => new Promise((r) => setTimeout(() => r(structuredClone(v)), ms));
const falla = (message) => new Promise((_, rej) => setTimeout(() => rej(new Error(message)), 200));
const uid = () => Math.random().toString(16).slice(2, 14).padEnd(24, '0');
const dia = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const yo = () => JSON.parse(localStorage.getItem('user') || 'null');

const CLAVES = { 'admin@enfered.com': 'Admin123!', 'paciente@enfered.com': 'Paciente123!', 'enfermera@enfered.com': 'Enfermera123!' };
const USUARIOS = [
  { id: 'adm-1', nombre: 'Admin', apellido: 'Enfered', email: 'admin@enfered.com', rol: 'ADMIN' },
  { id: 'pac-1', nombre: 'Lucía', apellido: 'Fernández', email: 'paciente@enfered.com', rol: 'PACIENTE' },
  { id: 'enf-0', nombre: 'Marta', apellido: 'Quiroga', email: 'enfermera@enfered.com', rol: 'ENFERMERO' },
  ...[1, 2, 3, 4].map((n) => ({ id: `enf-${n}`, nombre: ['Julián', 'Carolina', 'Diego', 'Valeria'][n - 1], apellido: ['Pereyra', 'Sosa', 'Montenegro', 'Ríos'][n - 1], email: `enfermero${n}@enfered.com`, rol: 'ENFERMERO' })),
];
USUARIOS.filter((u) => u.email.startsWith('enfermero')).forEach((u) => { CLAVES[u.email] = 'Enfermero123!'; });

export const SERVICIOS = [
  { id: '650000000000000000000001', nombre: 'Curaciones', descripcion: 'Curación de heridas y cambio de vendajes.', duracionEstimadaMin: 60, precioReferencia: 9000, activo: true },
  { id: '650000000000000000000002', nombre: 'Inyecciones', descripcion: 'Aplicación de medicación inyectable.', duracionEstimadaMin: 60, precioReferencia: 5000, activo: true },
  { id: '650000000000000000000003', nombre: 'Control de signos vitales', descripcion: 'Presión, pulso, temperatura y saturación.', duracionEstimadaMin: 60, precioReferencia: 6000, activo: true },
  { id: '650000000000000000000004', nombre: 'Higiene y confort', descripcion: 'Aseo y cuidados de confort en cama.', duracionEstimadaMin: 60, precioReferencia: 12000, activo: true },
  { id: '650000000000000000000005', nombre: 'Acompañamiento de adultos mayores', descripcion: 'Compañía y cuidados generales.', duracionEstimadaMin: 120, precioReferencia: 20000, activo: true },
  { id: '650000000000000000000006', nombre: 'Cuidados Intensivos', descripcion: 'Cuidados de alta complejidad.', duracionEstimadaMin: 120, precioReferencia: 30000, activo: true },
];
const S = (n) => `65000000000000000000000${n}`;
const L_A_V = [1, 2, 3, 4, 5].map((d) => ({ dia: d, desde: '08:00', hasta: '18:00' }));

const ENFERMEROS = [
  { id: 'enf-0', nombre: 'Marta', apellido: 'Quiroga', matricula: 'MP-1001', especialidades: ['Geriatría', 'Heridas'], departamento: 'Capital', aniosExperiencia: 12, tarifaHora: 8000, serviciosOfrecidos: [S(1), S(3), S(5)], lat: -32.8895, lng: -68.8458, radioCoberturaKm: 15, disponible: true, disponibilidad: L_A_V, descripcion: 'Enfermera con foco en adultos mayores y curaciones complejas.' },
  { id: 'enf-1', nombre: 'Julián', apellido: 'Pereyra', matricula: 'MP-1002', especialidades: ['Pediatría'], departamento: 'Godoy Cruz', aniosExperiencia: 5, tarifaHora: 6500, serviciosOfrecidos: [S(2), S(3)], lat: -32.927, lng: -68.844, radioCoberturaKm: 10, disponible: true, disponibilidad: [6, 0].map((d) => ({ dia: d, desde: '09:00', hasta: '14:00' })), descripcion: 'Vacunación e inyectables a domicilio.' },
  { id: 'enf-2', nombre: 'Carolina', apellido: 'Sosa', matricula: 'MP-1003', especialidades: ['Geriatría', 'Cuidados paliativos'], departamento: 'Guaymallén', aniosExperiencia: 9, tarifaHora: 7500, serviciosOfrecidos: [S(4), S(5), S(6)], lat: -32.905, lng: -68.788, radioCoberturaKm: 12, disponible: false, disponibilidad: L_A_V, descripcion: 'Acompañamiento y cuidados de confort.' },
  { id: 'enf-3', nombre: 'Diego', apellido: 'Montenegro', matricula: 'MP-1004', especialidades: ['Heridas'], departamento: 'Las Heras', aniosExperiencia: 3, serviciosOfrecidos: [S(1), S(2)], lat: -32.85, lng: -68.828, radioCoberturaKm: 10, disponible: true, disponibilidad: L_A_V, descripcion: '' },
  { id: 'enf-4', nombre: 'Valeria', apellido: 'Ríos', matricula: 'MP-1005', especialidades: ['Cuidados intensivos'], departamento: 'Luján de Cuyo', aniosExperiencia: 14, tarifaHora: 11000, serviciosOfrecidos: [S(3), S(6)], lat: -33.036, lng: -68.879, radioCoberturaKm: 20, disponible: true, disponibilidad: L_A_V, descripcion: 'Experiencia en terapia intensiva.' },
].map(({ lat, lng, ...e }) => ({ ...e, ubicacion: { type: 'Point', coordinates: [lng, lat] } }));

let resenas = [
  { id: 'r1', solicitudId: 's4', pacienteId: 'pac-1', pacienteNombre: 'Lucía Fernández', enfermeroId: 'enf-0', puntuacion: 5, comentario: 'Muy puntual y cuidadosa con mi mamá.', createdAt: new Date(Date.now() - 6e8).toISOString() },
  { id: 'r2', solicitudId: 's9', pacienteId: 'pac-9', pacienteNombre: 'Ana Ruiz', enfermeroId: 'enf-0', puntuacion: 4, comentario: 'Todo bien, explicó cada paso.', createdAt: new Date(Date.now() - 9e8).toISOString() },
  { id: 'r3', solicitudId: 's10', pacienteId: 'pac-9', pacienteNombre: 'Ana Ruiz', enfermeroId: 'enf-4', puntuacion: 5, comentario: '', createdAt: new Date(Date.now() - 8e8).toISOString() },
];
const sv = (n) => SERVICIOS.find((s) => s.id === S(n));
let solicitudes = [
  { id: 's1', pacienteId: 'pac-1', pacienteNombre: 'Lucía Fernández', enfermeroId: 'enf-1', enfermeroNombre: 'Julián Pereyra', servicio: sv(2), fecha: dia(2), hora: '10:00', direccionAtencion: 'San Martín 1250, Godoy Cruz', notas: 'Medicación indicada por el médico.', estado: 'ACEPTADA' },
  { id: 's2', pacienteId: 'pac-1', pacienteNombre: 'Lucía Fernández', enfermeroId: 'enf-0', enfermeroNombre: 'Marta Quiroga', servicio: sv(3), fecha: dia(4), hora: '16:00', direccionAtencion: 'Belgrano 420, Capital', notas: 'Control semanal para mi mamá.', estado: 'PENDIENTE' },
  { id: 's3', pacienteId: 'pac-1', pacienteNombre: 'Lucía Fernández', enfermeroId: 'enf-0', enfermeroNombre: 'Marta Quiroga', servicio: sv(1), fecha: dia(-10), hora: '09:00', direccionAtencion: 'Belgrano 420, Capital', estado: 'REALIZADA' },
  { id: 's4', pacienteId: 'pac-1', pacienteNombre: 'Lucía Fernández', enfermeroId: 'enf-0', enfermeroNombre: 'Marta Quiroga', servicio: sv(5), fecha: dia(-30), hora: '15:00', direccionAtencion: 'Belgrano 420, Capital', estado: 'REALIZADA' },
  { id: 's5', pacienteId: 'pac-1', pacienteNombre: 'Lucía Fernández', enfermeroId: 'enf-3', enfermeroNombre: 'Diego Montenegro', servicio: sv(2), fecha: dia(-3), hora: '11:00', direccionAtencion: 'Belgrano 420, Capital', estado: 'RECHAZADA', motivoRechazo: 'Ese día no estoy en la zona.' },
];
let mensajes = [
  { id: 'm1', solicitud: 's1', autorId: 'enf-1', autorNombre: 'Julián Pereyra', texto: 'Hola Lucía, confirmo el turno. ¿Tenés la receta a mano?', createdAt: new Date(Date.now() - 36e5).toISOString() },
  { id: 'm2', solicitud: 's1', autorId: 'pac-1', autorNombre: 'Lucía Fernández', texto: '¡Sí! La tengo lista, gracias.', createdAt: new Date(Date.now() - 34e5).toISOString() },
];

const km = (a, b, c, d) => { const r = (x) => (x * Math.PI) / 180; const h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); };
const reputacionDe = (id) => { const r = resenas.filter((x) => x.enfermeroId === id); return { enfermeroId: id, cantidad: r.length, promedio: r.length ? Math.round((r.reduce((s, x) => s + x.puntuacion, 0) / r.length) * 10) / 10 : 0 }; };
const propia = (id) => { const s = solicitudes.find((x) => x.id === id); if (!s) throw new Error('La solicitud no existe'); return s; };

export async function login(email, password) {
  const u = USUARIOS.find((x) => x.email === email);
  if (!u || CLAVES[email] !== password) return falla('Email o contraseña incorrectos');
  return espera({ access_token: `mock.${u.id}`, user: u });
}
export const listarServicios = () => espera(SERVICIOS.filter((s) => s.activo));
export async function buscarEnfermeros({ lat = -32.8895, lng = -68.8458, radioKm = 10, especialidad, servicioId, departamento, disponible } = {}) {
  const lista = ENFERMEROS
    .map((e) => ({ ...e, distanciaKm: Math.round(km(lat, lng, e.ubicacion.coordinates[1], e.ubicacion.coordinates[0]) * 10) / 10 }))
    .filter((e) => e.distanciaKm <= radioKm && (!especialidad || e.especialidades.includes(especialidad)) && (!servicioId || e.serviciosOfrecidos.includes(servicioId)) && (!departamento || e.departamento === departamento) && (!disponible || e.disponible))
    .sort((a, b) => a.distanciaKm - b.distanciaKm)
    .map((e) => ({ ...e, reputacion: reputacionDe(e.id) }));
  return espera(lista);
}
export async function obtenerEnfermero(id) {
  const e = ENFERMEROS.find((x) => x.id === id);
  if (!e) return falla('No encontramos a ese enfermero');
  return espera({ enfermero: e, reputacion: reputacionDe(id), resenas: resenas.filter((r) => r.enfermeroId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
}
export async function crearSolicitud(b) {
  const u = yo(); const e = ENFERMEROS.find((x) => x.id === b.enfermeroId); const s = SERVICIOS.find((x) => x.id === b.servicioId);
  if (!e || !e.disponible) return falla('El enfermero no está disponible');
  if (!e.serviciosOfrecidos.includes(b.servicioId)) return falla('El enfermero no ofrece ese servicio');
  if (b.fecha < dia(0) || b.fecha > dia(183)) return falla('La fecha tiene que ser futura y dentro de los próximos 6 meses');
  if (solicitudes.some((x) => x.enfermeroId === e.id && ['PENDIENTE', 'ACEPTADA'].includes(x.estado) && x.fecha === b.fecha && x.hora === b.hora)) return falla('El enfermero ya tiene una solicitud en ese horario');
  if (solicitudes.filter((x) => x.pacienteId === u.id && x.estado === 'PENDIENTE').length >= 5) return falla('Ya tenés 5 solicitudes pendientes');
  const n = { id: uid(), pacienteId: u.id, pacienteNombre: `${u.nombre} ${u.apellido}`, enfermeroId: e.id, enfermeroNombre: `${e.nombre} ${e.apellido}`, servicio: s, fecha: b.fecha, hora: b.hora, direccionAtencion: b.direccionAtencion, notas: b.notas, estado: 'PENDIENTE' };
  solicitudes = [n, ...solicitudes];
  return espera(n);
}
export async function listarSolicitudes({ estado, desde, hasta } = {}) {
  const u = yo();
  return espera(solicitudes.filter((s) => (u.rol === 'ADMIN' || (u.rol === 'PACIENTE' ? s.pacienteId : s.enfermeroId) === u.id) && (!estado || s.estado === estado) && (!desde || s.fecha >= desde) && (!hasta || s.fecha <= hasta)));
}
export const obtenerSolicitud = async (id) => espera(propia(id));
const cambiar = async (id, estado, validas, extra = {}) => {
  const s = propia(id);
  if (!validas.includes(s.estado)) return falla(`No se puede pasar de ${s.estado} a ${estado}`);
  Object.assign(s, { estado }, extra);
  return espera(s);
};
export const aceptarSolicitud = (id) => cambiar(id, 'ACEPTADA', ['PENDIENTE']);
export const rechazarSolicitud = (id, motivo) => cambiar(id, 'RECHAZADA', ['PENDIENTE'], { motivoRechazo: motivo });
export const realizarSolicitud = (id) => cambiar(id, 'REALIZADA', ['ACEPTADA']);
export async function cancelarSolicitud(id, motivo) {
  const rol = yo().rol;
  if (rol === 'ENFERMERO' && !motivo?.trim()) return falla('Si cancelás como enfermero, el motivo es obligatorio');
  return cambiar(id, 'CANCELADA', ['PENDIENTE', 'ACEPTADA'], { canceladaPor: rol, motivoCancelacion: motivo });
}
export const listarMensajes = async (id) => espera(mensajes.filter((m) => m.solicitud === id), 100);
export async function enviarMensaje(id, texto) {
  const u = yo();
  if (!['PENDIENTE', 'ACEPTADA'].includes(propia(id).estado)) return falla('Esta solicitud ya no admite mensajes nuevos');
  const m = { id: uid(), solicitud: id, autorId: u.id, autorNombre: `${u.nombre} ${u.apellido}`, texto, createdAt: new Date().toISOString() };
  mensajes = [...mensajes, m];
  return espera(m, 100);
}
export const misResenas = async () => espera(resenas.filter((r) => r.pacienteId === yo().id));
export async function crearResena({ solicitudId, puntuacion, comentario }) {
  const s = propia(solicitudId);
  if (s.estado !== 'REALIZADA') return falla('Solo podés calificar servicios realizados');
  if (resenas.some((r) => r.solicitudId === solicitudId)) return falla('Esta solicitud ya tiene una reseña');
  const u = yo();
  const r = { id: uid(), solicitudId, pacienteId: u.id, pacienteNombre: `${u.nombre} ${u.apellido}`, enfermeroId: s.enfermeroId, puntuacion, comentario, createdAt: new Date().toISOString() };
  resenas = [r, ...resenas];
  return espera(r);
}
