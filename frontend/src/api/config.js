export const TOKEN_STORAGE_KEY = "token";
export const USER_STORAGE_KEY = "usuario";

export const API_URLS = {
  usuarios: import.meta.env.VITE_USUARIOS_URL || "http://localhost:3001",
  solicitudes: import.meta.env.VITE_SOLICITUDES_URL || "http://localhost:3002",
  resenas: import.meta.env.VITE_RESENAS_URL || "http://localhost:3003",
};
