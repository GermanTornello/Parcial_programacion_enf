import { usuariosApi } from "./index.js";

export const profileApi = {
  async getCurrent(signal) {
    const response = await usuariosApi.get("/auth/me", { signal });
    return response.data?.user ?? response.data;
  },

  async update(data) {
    const response = await usuariosApi.patch("/perfil", data);
    return response.data?.user ?? response.data;
  },
};
