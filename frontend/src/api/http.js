import axios from "axios";
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from "./config.js";

const graphqlClients = new Map();

function expireSession() {
  if (typeof window === "undefined") return;

  [TOKEN_STORAGE_KEY, USER_STORAGE_KEY, "refresh_token", "rol"].forEach((key) => {
    window.localStorage.removeItem(key);
  });
  window.dispatchEvent(new Event("enfered:session-expired"));
}

export function createApiClient(baseURL) {
  const client = axios.create({
    baseURL,
    headers: { "Content-Type": "application/json" },
  });

  client.interceptors.request.use((config) => {
    const skipAuth = config.skipAuth;
    delete config.skipAuth;
    const token =
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(TOKEN_STORAGE_KEY);

    if (token && !skipAuth) {
      config.headers.Authorization = "Bearer " + token;
    }

    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401 && error.config?.headers?.Authorization) expireSession();
      return Promise.reject(error);
    },
  );

  return client;
}

export async function graphqlRequest(url, query, variables = {}) {
  let client = graphqlClients.get(url);

  if (!client) {
    client = createApiClient(url);
    graphqlClients.set(url, client);
  }

  const response = await client.post("", { query, variables });
  const errors = response.data?.errors;

  if (errors?.length) {
    const error = new Error(errors.map(({ message }) => message).join("; "));
    error.graphqlErrors = errors;
    throw error;
  }

  return response.data?.data;
}





