// PROVISORIO (lo reemplaza la autenticación de Pablo). Guarda { token, user } en localStorage.
import { createContext, useContext, useState } from 'react';

const Ctx = createContext(null);
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } });
  const entrar = ({ access_token, user }) => { localStorage.setItem('token', access_token); localStorage.setItem('user', JSON.stringify(user)); setUsuario(user); };
  const salir = () => { localStorage.clear(); setUsuario(null); };
  return <Ctx.Provider value={{ usuario, entrar, salir }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
