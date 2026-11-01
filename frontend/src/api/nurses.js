import { usuariosApi } from "./index.js";

export const nursesApi = {
  async search(params = {}, signal) {
    const response = await usuariosApi.get("/enfermeros/buscar", { params, signal });
    return response.data?.enfermeros ?? response.data;
  },
  async getPublicProfile(id, signal) {
    const response = await usuariosApi.get(`/enfermeros/${encodeURIComponent(id)}`, { signal });
    return response.data?.enfermero ?? response.data;
  },
};
