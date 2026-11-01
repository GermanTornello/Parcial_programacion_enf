import { solicitudesApi as solicitudesClient, API_URLS, graphqlRequest } from "./index.js";

const SERVICE_FIELDS = "id nombre descripcion duracionEstimadaMin precioReferencia activo";
const REVIEW_FIELDS = "id solicitudId pacienteId pacienteNombre enfermeroId puntuacion comentario createdAt";

export const catalogApi = {
  list({ search = "", activo } = {}) {
    const query = `query Servicios($search: String, $activo: Boolean) { servicios(search: $search, activo: $activo) { ${SERVICE_FIELDS} } }`;
    return graphqlRequest(`${API_URLS.solicitudes}/graphql`, query, {
      search: search || null,
      activo: activo ?? null,
    }).then((data) => data?.servicios ?? []);
  },
  get(id) {
    const query = `query Servicio($id: ID!) { servicio(id: $id) { ${SERVICE_FIELDS} } }`;
    return graphqlRequest(`${API_URLS.solicitudes}/graphql`, query, { id }).then((data) => data?.servicio ?? null);
  },
  create(input) {
    const mutation = `mutation CrearServicio($input: CreateServicioInput!) { createServicio(input: $input) { ${SERVICE_FIELDS} } }`;
    return graphqlRequest(`${API_URLS.solicitudes}/graphql`, mutation, { input }).then((data) => data?.createServicio);
  },
  update(id, input) {
    const mutation = `mutation EditarServicio($id: ID!, $input: UpdateServicioInput!) { updateServicio(id: $id, input: $input) { ${SERVICE_FIELDS} } }`;
    return graphqlRequest(`${API_URLS.solicitudes}/graphql`, mutation, { id, input }).then((data) => data?.updateServicio);
  },
  remove(id) {
    const mutation = "mutation EliminarServicio($id: ID!) { removeServicio(id: $id) }";
    return graphqlRequest(`${API_URLS.solicitudes}/graphql`, mutation, { id }).then((data) => data?.removeServicio);
  },
};

export const solicitudesApi = {
  async list(params = {}, signal) {
    const response = await solicitudesClient.get("/solicitudes", { params, signal });
    return response.data;
  },
  async get(id, signal) {
    const response = await solicitudesClient.get(`/solicitudes/${encodeURIComponent(id)}`, { signal });
    return response.data;
  },
  async create(data) {
    const response = await solicitudesClient.post("/solicitudes", data);
    return response.data;
  },
  async accept(id) {
    const response = await solicitudesClient.patch(`/solicitudes/${encodeURIComponent(id)}/aceptar`);
    return response.data;
  },
  async reject(id, data = {}) {
    const response = await solicitudesClient.patch(`/solicitudes/${encodeURIComponent(id)}/rechazar`, data);
    return response.data;
  },
  async cancel(id, data = {}) {
    const response = await solicitudesClient.patch(`/solicitudes/${encodeURIComponent(id)}/cancelar`, data);
    return response.data;
  },
  async perform(id) {
    const response = await solicitudesClient.patch(`/solicitudes/${encodeURIComponent(id)}/realizar`);
    return response.data;
  },
  async messages(id, signal) {
    const response = await solicitudesClient.get(`/solicitudes/${encodeURIComponent(id)}/mensajes`, { signal });
    return response.data;
  },
  async sendMessage(id, texto) {
    const response = await solicitudesClient.post(`/solicitudes/${encodeURIComponent(id)}/mensajes`, { texto });
    return response.data;
  },
};

export const resenasApi = {
  list(enfermeroId) {
    const query = `query Resenas($enfermeroId: String!) { resenas(enfermeroId: $enfermeroId) { ${REVIEW_FIELDS} } }`;
    return graphqlRequest(`${API_URLS.resenas}/graphql`, query, { enfermeroId }).then((data) => data?.resenas ?? []);
  },
  get(id) {
    const query = `query Resena($id: ID!) { resena(id: $id) { ${REVIEW_FIELDS} } }`;
    return graphqlRequest(`${API_URLS.resenas}/graphql`, query, { id }).then((data) => data?.resena ?? null);
  },
  mine() {
    const query = `query MisResenas { misResenas { ${REVIEW_FIELDS} } }`;
    return graphqlRequest(`${API_URLS.resenas}/graphql`, query).then((data) => data?.misResenas ?? []);
  },
  reputation(enfermeroId) {
    const query = "query Reputacion($enfermeroId: String!) { reputacion(enfermeroId: $enfermeroId) { enfermeroId promedio cantidad } }";
    return graphqlRequest(`${API_URLS.resenas}/graphql`, query, { enfermeroId }).then((data) => data?.reputacion);
  },
  reputations(enfermeroIds) {
    const query = "query Reputaciones($enfermeroIds: [String!]!) { reputaciones(enfermeroIds: $enfermeroIds) { enfermeroId promedio cantidad } }";
    return graphqlRequest(`${API_URLS.resenas}/graphql`, query, { enfermeroIds }).then((data) => data?.reputaciones ?? []);
  },
  create(input) {
    const mutation = `mutation CrearResena($input: CreateResenaInput!) { createResena(input: $input) { ${REVIEW_FIELDS} } }`;
    return graphqlRequest(`${API_URLS.resenas}/graphql`, mutation, { input }).then((data) => data?.createResena);
  },
  update(id, input) {
    const mutation = `mutation EditarResena($id: ID!, $input: UpdateResenaInput!) { updateResena(id: $id, input: $input) { ${REVIEW_FIELDS} } }`;
    return graphqlRequest(`${API_URLS.resenas}/graphql`, mutation, { id, input }).then((data) => data?.updateResena);
  },
  remove(id) {
    const mutation = "mutation EliminarResena($id: ID!) { removeResena(id: $id) }";
    return graphqlRequest(`${API_URLS.resenas}/graphql`, mutation, { id }).then((data) => data?.removeResena);
  },
};
