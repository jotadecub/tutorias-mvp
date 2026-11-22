import axios, { AxiosError } from "axios";

export const TOKEN_KEY = "tutorias_token";

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Si el token expira o es inválido (fuera del login), se cierra la sesión.
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    const isLogin = error.config?.url?.includes("/auth/login");
    if (error.response?.status === 401 && !isLogin) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event("auth:expired"));
    }
    return Promise.reject(error);
  },
);

interface ApiErrorBody { error?: string; fields?: Record<string, string> }

export function errorMessage(err: unknown): string {
  if (axios.isAxiosError<ApiErrorBody>(err)) {
    if (err.response?.data?.error) return err.response.data.error;
    if (!err.response) return "No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.";
  }
  return "Ocurrió un error inesperado.";
}

export function fieldErrors(err: unknown): Record<string, string> {
  if (axios.isAxiosError<ApiErrorBody>(err)) return err.response?.data?.fields ?? {};
  return {};
}
