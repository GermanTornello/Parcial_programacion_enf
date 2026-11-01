import { API_URLS } from "./config.js";
import { createApiClient } from "./http.js";

export const usuariosApi = createApiClient(API_URLS.usuarios);
export const solicitudesApi = createApiClient(API_URLS.solicitudes);
export const resenasApi = createApiClient(API_URLS.resenas);

export { API_URLS, TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from "./config.js";
export { graphqlRequest } from "./http.js";
