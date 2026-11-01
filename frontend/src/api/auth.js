import { usuariosApi } from "./index.js";

export const authApi = {
  async login(credentials) {
    const response = await usuariosApi.post("/auth/login", credentials, { skipAuth: true });
    return response.data;
  },
  async registerPatient(data) {
    const response = await usuariosApi.post("/auth/register/paciente", data, { skipAuth: true });
    return response.data;
  },
  async registerNurse(data) {
    const response = await usuariosApi.post("/auth/register/enfermero", data, { skipAuth: true });
    return response.data;
  },
};

