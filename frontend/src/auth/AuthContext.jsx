import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from "../api/config.js";
import { authApi } from "./authApi.js";

const AuthContext = createContext(null);
const LEGACY_SESSION_KEYS = ["refresh_token", "rol"];

function clearStoredSession() {
  [TOKEN_STORAGE_KEY, USER_STORAGE_KEY, ...LEGACY_SESSION_KEYS].forEach((key) => {
    window.localStorage.removeItem(key);
  });
}

function readStoredSession() {
  if (typeof window === "undefined") return { token: null, user: null };
  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  const rawUser = window.localStorage.getItem(USER_STORAGE_KEY);
  if (!token || !rawUser) {
    clearStoredSession();
    return { token: null, user: null };
  }
  try {
    return { token, user: JSON.parse(rawUser) };
  } catch {
    clearStoredSession();
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession);

  const logout = useCallback(() => {
    clearStoredSession();
    setSession({ token: null, user: null });
  }, []);

  const login = useCallback(async (credentials) => {
    const result = await authApi.login(credentials);
    if (!result?.access_token || !result?.user?.id || !result?.user?.rol) {
      throw new Error("La respuesta del servidor no tiene el formato esperado.");
    }
    clearStoredSession();
    window.localStorage.setItem(TOKEN_STORAGE_KEY, result.access_token);
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(result.user));
    setSession({ token: result.access_token, user: result.user });
    return result.user;
  }, []);

  useEffect(() => {
    const handleExpired = () => setSession({ token: null, user: null });
    const handleStorage = (event) => {
      if (event.key === TOKEN_STORAGE_KEY || event.key === USER_STORAGE_KEY) {
        setSession(readStoredSession());
      }
    };
    window.addEventListener("enfered:session-expired", handleExpired);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("enfered:session-expired", handleExpired);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const value = useMemo(() => ({
    token: session.token,
    user: session.user,
    isAuthenticated: Boolean(session.token && session.user),
    login,
    logout,
  }), [session, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider.");
  return context;
}



