// Cartilla de enfermeros contra los microservicios (contrato, sección 2.7).
// La pantalla de PP3 (ListaEnfermeros) espera { enfermeros, total_resultados, total_paginas } con los
// nombres de campo de PP3: esta capa llama a la API nueva y adapta la respuesta, así la pantalla
// no se reescribe.
import { catalogApi, resenasApi, solicitudesApi } from "./resources.js";
import { usuariosApi } from "./index.js";

// Los 18 departamentos de Mendoza con el nombre exacto del contrato (sección 2.6).
export const DEPARTAMENTOS_CONTRATO = [
  "Capital", "Godoy Cruz", "Guaymallén", "Las Heras", "Luján de Cuyo", "Maipú",
  "Lavalle", "San Martín", "Rivadavia", "Junín", "Santa Rosa", "La Paz",
  "Tupungato", "Tunuyán", "San Carlos", "San Rafael", "General Alvear", "Malargüe",
];

// Índice = día de `disponibilidad` (0 = domingo), igual que en el backend.
export const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const DIAS_SEMANA = [...DIAS.slice(1), DIAS[0]]; // para los filtros: de lunes a domingo

// Sin ubicación del paciente se busca en toda la provincia desde Mendoza capital.
const MENDOZA = { lat: -32.8895, lng: -68.8458 };
const RADIO_PROVINCIA_KM = 200;
const POR_PAGINA = 6;

const sinTildes = (texto) =>
  String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const departamentoDelFiltro = (valor) => (valor === "Ciudad de Mendoza" ? "Capital" : valor);

/**
 * Catálogo con la forma de PP3 ({ idServicio, tipoServicio }) para los filtros y las tarjetas.
 * Se pide una sola vez por sesión del navegador; si falla, se vuelve a pedir la próxima vez.
 */
let catalogo = null;
export function cargarServicios() {
  catalogo ??= catalogApi
    .list({ activo: true })
    .then((servicios) => servicios.map((s) => ({ idServicio: s.id, tipoServicio: s.nombre, ...s })))
    .catch((error) => {
      catalogo = null;
      throw error;
    });
  return catalogo;
}

/** Especialidades que existen entre los enfermeros aprobados (para el filtro). */
export async function cargarEspecialidades(signal) {
  const { data } = await usuariosApi.get("/enfermeros/buscar", {
    params: { lat: MENDOZA.lat, lng: MENDOZA.lng, radioKm: RADIO_PROVINCIA_KM },
    signal,
  });
  const unicas = new Map();
  (Array.isArray(data) ? data : []).forEach((enfermero) => {
    (enfermero.especialidades ?? []).forEach((nombre) => {
      const clave = sinTildes(nombre);
      if (clave && !unicas.has(clave)) unicas.set(clave, nombre.trim());
    });
  });
  return [...unicas.values()].sort((a, b) => a.localeCompare(b, "es"));
}

const minutos = (hora) => {
  const [h, m] = String(hora).split(":").map(Number);
  return h * 60 + m;
};

/** ¿Atiende ese día (y en ese horario)? Con `parcial`, alcanza con que la franja se superponga. */
function atiendeEn(enfermero, dia, desde, hasta, parcial) {
  if (!dia && !desde) return true;
  const indiceDia = dia ? DIAS.findIndex((d) => sinTildes(d) === sinTildes(dia)) : -1;
  return (enfermero.disponibilidad ?? []).some((franja) => {
    if (indiceDia >= 0 && franja.dia !== indiceDia) return false;
    if (!desde || !hasta) return true;
    const [fd, fh, bd, bh] = [franja.desde, franja.hasta, desde, hasta].map(minutos);
    return parcial ? fd < bh && fh > bd : fd <= bd && fh >= bh;
  });
}

/** Un enfermero del contrato con los nombres de campo que usan las tarjetas y el mapa de PP3. */
function aFormatoCartilla(enfermero, servicios, reputacion, conDistancia) {
  const [lng, lat] = enfermero.ubicacion?.coordinates ?? [];
  const porId = new Map(servicios.map((s) => [String(s.idServicio), s]));
  return {
    ...enfermero,
    usuario_id: enfermero.id,
    ciudad: enfermero.departamento,
    especialidad: (enfermero.especialidades ?? []).join(", "),
    experiencia_anios: enfermero.aniosExperiencia ?? 0,
    tarifa_hora: enfermero.tarifaHora ?? null,
    servicios: (enfermero.serviciosOfrecidos ?? []).map((id) => porId.get(String(id))).filter(Boolean),
    latitud: lat ?? null,
    longitud: lng ?? null,
    // La distancia solo tiene sentido si el paciente eligió su ubicación
    distancia_km: conDistancia ? enfermero.distanciaKm : null,
    puntuacion: reputacion?.cantidad > 0 ? reputacion.promedio : null,
    cantidadResenas: reputacion?.cantidad ?? 0,
  };
}

/**
 * Búsqueda de la cartilla. Recibe los parámetros de la URL de PP3 (q, servicio, especialidad, ciudad,
 * precio_min, precio_max, dia_semana, hora_desde, hora_hasta, horario, lat, lng, radio_km, page,
 * per_page) y devuelve { enfermeros, total_resultados, total_paginas }.
 * El backend filtra por cercanía, servicio, especialidad y departamento; el resto (texto, precio y
 * horario) se filtra acá sobre ese resultado.
 */
export async function buscarCartilla(parametros, signal) {
  const p = parametros instanceof URLSearchParams ? parametros : new URLSearchParams(parametros);
  // Sin catálogo las tarjetas igual se muestran, solo que sin la lista de servicios
  const servicios = await cargarServicios().catch(() => []);
  const conUbicacion = p.get("lat") && p.get("lng");
  const servicioIds = (p.get("servicio") || "").split(",").filter(Boolean);
  const departamento = departamentoDelFiltro(p.get("ciudad") || "");

  const { data } = await usuariosApi.get("/enfermeros/buscar", {
    params: {
      lat: conUbicacion ? p.get("lat") : MENDOZA.lat,
      lng: conUbicacion ? p.get("lng") : MENDOZA.lng,
      radioKm: conUbicacion && p.get("radio_km") ? p.get("radio_km") : RADIO_PROVINCIA_KM,
      // Con un solo servicio filtra el backend; con varios (búsqueda asistida) se filtra abajo
      servicioId: servicioIds.length === 1 ? servicioIds[0] : undefined,
      especialidad: p.get("especialidad") || undefined,
      departamento: departamento || undefined,
    },
    signal,
  });

  const texto = sinTildes(p.get("q"));
  const precioMin = p.get("precio_min") ? Number(p.get("precio_min")) : null;
  const precioMax = p.get("precio_max") ? Number(p.get("precio_max")) : null;
  const filtrados = (Array.isArray(data) ? data : []).filter((e) => {
    if (servicioIds.length > 1 && !servicioIds.some((id) => (e.serviciosOfrecidos ?? []).includes(id))) return false;
    if (texto) {
      const donde = sinTildes([e.nombre, e.apellido, e.departamento, ...(e.especialidades ?? [])].join(" "));
      if (!texto.split(/\s+/).every((palabra) => donde.includes(palabra))) return false;
    }
    if (precioMin !== null && !(Number(e.tarifaHora) >= precioMin)) return false;
    if (precioMax !== null && !(Number(e.tarifaHora) <= precioMax)) return false;
    return atiendeEn(e, p.get("dia_semana"), p.get("hora_desde"), p.get("hora_hasta"), p.get("horario") === "parcial");
  });

  const porPagina = Math.max(1, Number(p.get("per_page")) || POR_PAGINA);
  const totalPaginas = Math.ceil(filtrados.length / porPagina);
  const pagina = Math.min(Math.max(1, Number(p.get("page")) || 1), Math.max(1, totalPaginas));
  const visibles = filtrados.slice((pagina - 1) * porPagina, pagina * porPagina);

  // Las estrellas vienen de resenas-service; si no responde, la cartilla igual se muestra
  const reputaciones = visibles.length
    ? await resenasApi.reputations(visibles.map((e) => e.id)).catch(() => [])
    : [];
  const repPorId = new Map(reputaciones.map((r) => [r.enfermeroId, r]));

  return {
    enfermeros: visibles.map((e) => aFormatoCartilla(e, servicios, repPorId.get(e.id), conUbicacion)),
    total_resultados: filtrados.length,
    total_paginas: totalPaginas,
  };
}

/**
 * Vista "Pacientes asignados" del enfermero: sus pacientes con solicitudes PENDIENTE o ACEPTADA,
 * armada con GET /solicitudes (en el TP no se comparte la ubicación del paciente).
 */
export async function buscarPacientesAsignados(parametros, signal) {
  const p = parametros instanceof URLSearchParams ? parametros : new URLSearchParams(parametros);
  const solicitudes = await solicitudesApi.list({}, signal);
  const activas = (Array.isArray(solicitudes) ? solicitudes : []).filter((s) =>
    ["PENDIENTE", "ACEPTADA"].includes(s.estado),
  );
  const pacientes = new Map();
  activas.forEach((s) => {
    const actual = pacientes.get(s.pacienteId);
    if (actual) actual.solicitudes += 1;
    else {
      const [nombre, ...apellido] = String(s.pacienteNombre || "Paciente").split(" ");
      pacientes.set(s.pacienteId, { id: s.pacienteId, usuario_id: s.pacienteId, nombre, apellido: apellido.join(" "), solicitudes: 1 });
    }
  });
  const texto = sinTildes(p.get("q"));
  const lista = [...pacientes.values()].filter((x) => !texto || sinTildes(`${x.nombre} ${x.apellido}`).includes(texto));
  const porPagina = Math.max(1, Number(p.get("per_page")) || POR_PAGINA);
  const totalPaginas = Math.ceil(lista.length / porPagina);
  const pagina = Math.max(1, Number(p.get("page")) || 1);
  return {
    enfermeros: lista.slice((pagina - 1) * porPagina, pagina * porPagina),
    total_resultados: lista.length,
    total_paginas: totalPaginas,
  };
}

/**
 * Perfil público de un enfermero (GET /enfermeros/:id) con los nombres de campo de PP3
 * que usa VerPerfiles: verificado, horarios, servicios, experiencia_anios, etc.
 */
export async function cargarPerfilPublico(id, signal) {
  const [{ data: enfermero }, servicios] = await Promise.all([
    usuariosApi.get(`/enfermeros/${encodeURIComponent(id)}`, { signal }),
    cargarServicios().catch(() => []),
  ]);
  const base = aFormatoCartilla(enfermero, servicios, null, false);
  return {
    ...base,
    rol: "enfermero",
    enfermero_id: enfermero.id,
    verificado: enfermero.estadoVerificacion === "APROBADO",
    matricula: enfermero.matricula,
    horarios: (enfermero.disponibilidad ?? []).map((franja, indice) => ({
      id: `${franja.dia}-${franja.desde}-${indice}`,
      dia_semana: DIAS[franja.dia],
      hora_inicio: franja.desde,
      hora_fin: franja.hasta,
      estado: "disponible",
    })),
  };
}

/** Reseñas y reputación de un enfermero (resenas-service, GraphQL), con la forma que muestra el perfil. */
export async function cargarResenas(enfermeroId) {
  const [resenas, reputacion] = await Promise.all([
    resenasApi.list(enfermeroId),
    resenasApi.reputation(enfermeroId),
  ]);
  return {
    resenas: resenas.map((r) => ({
      idResena: r.id,
      paciente: r.pacienteNombre,
      fecha: r.createdAt,
      puntuacion: r.puntuacion,
      comentario: r.comentario ?? "",
    })),
    cantidadResenas: reputacion?.cantidad ?? resenas.length,
    calificacionPromedio: reputacion?.cantidad > 0 ? reputacion.promedio : null,
  };
}

/** Dirección escrita → coordenadas, con OpenStreetMap (Nominatim), limitado a Mendoza. */
export async function buscarDireccion(direccion, signal) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.search = new URLSearchParams({
    q: /mendoza/i.test(direccion) ? direccion : `${direccion}, Mendoza`,
    format: "jsonv2",
    limit: "1",
    countrycodes: "ar",
    "accept-language": "es",
  }).toString();
  const respuesta = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!respuesta.ok) throw Object.assign(new Error("No se pudo buscar la dirección"), { status: respuesta.status });
  const [lugar] = await respuesta.json();
  if (!lugar) throw Object.assign(new Error("Dirección no encontrada"), { status: 404 });
  return {
    latitud: Number(lugar.lat),
    longitud: Number(lugar.lon),
    descripcion: lugar.display_name?.split(",").slice(0, 2).join(",") || direccion,
  };
}
