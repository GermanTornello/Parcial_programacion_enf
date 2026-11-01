import { API_URLS } from "./config.js";
import { usuariosApi } from "./index.js";
import { graphqlRequest } from "./http.js";

const SERVICE_FIELDS = "id nombre descripcion duracionEstimadaMin precioReferencia activo";

export const adminApi = {
  async pendingNurses() {
    const response = await usuariosApi.get("/admin/enfermeros", {
      params: { estado: "PENDIENTE" },
    });
    return response.data?.enfermeros ?? response.data;
  },

  async verifyNurse(id, estado, motivo) {
    const body = { estado };
    if (motivo) body.motivo = motivo;
    const response = await usuariosApi.patch(
      "/admin/enfermeros/" + encodeURIComponent(id) + "/verificacion",
      body,
    );
    return response.data;
  },

  async users({ rol = "", search = "" } = {}) {
    const response = await usuariosApi.get("/admin/usuarios", {
      params: { rol: rol || undefined, search: search || undefined },
    });
    return response.data?.usuarios ?? response.data;
  },

  async deleteUser(id) {
    const response = await usuariosApi.delete(
      "/admin/usuarios/" + encodeURIComponent(id),
    );
    return response.data;
  },

  listServices(search = "") {
    const query =
      "query AdminServicios($search: String) {" +
      " servicios(search: $search) {" + SERVICE_FIELDS + " }" +
      "}";
    return graphqlRequest(API_URLS.solicitudes + "/graphql", query, {
      search: search || null,
    }).then((data) => data?.servicios ?? []);
  },

  createService(input) {
    const mutation =
      "mutation CrearServicio($input: CreateServicioInput!) {" +
      " createServicio(input: $input) {" + SERVICE_FIELDS + " }" +
      "}";
    return graphqlRequest(API_URLS.solicitudes + "/graphql", mutation, { input });
  },

  updateService(id, input) {
    const mutation =
      "mutation EditarServicio($id: ID!, $input: UpdateServicioInput!) {" +
      " updateServicio(id: $id, input: $input) {" + SERVICE_FIELDS + " }" +
      "}";
    return graphqlRequest(API_URLS.solicitudes + "/graphql", mutation, { id, input });
  },

  deleteService(id) {
    const mutation =
      "mutation EliminarServicio($id: ID!) { removeServicio(id: $id) }";
    return graphqlRequest(API_URLS.solicitudes + "/graphql", mutation, { id }).then(
      (data) => data?.removeServicio,
    );
  },
};
