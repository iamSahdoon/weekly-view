import axios from "axios";
import { authEvents } from "../lib/authEvents.js";
import { normalizeError } from "../lib/normalizeError.js";
import { tokenStore } from "../lib/tokenStore.js";

// The one axios instance (tech_stack.md §6.2). In the demo, bootDemo swaps its
// adapter for the in-browser one; nothing else changes.
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data, // the envelope; `api` takes its .data
  (error) => {
    const sent = error.config?.headers?.Authorization?.replace("Bearer ", "");
    if (
      error.response?.status === 401 &&
      sent && // a failed sign-in carries no token: not a session expiry
      sent === tokenStore.get() // an older in-flight request must not delete a fresh token
    ) {
      tokenStore.clear();
      // Never a hard redirect: it would discard an in-progress report.
      authEvents.emit("session-expired");
    }
    return Promise.reject(normalizeError(error));
  },
);

// What services use. Each returns the envelope's `data`, nothing else.
export const api = {
  get: (url, config) => apiClient.get(url, config).then((env) => env.data),
  post: (url, body, config) =>
    apiClient.post(url, body, config).then((env) => env.data),
  put: (url, body, config) =>
    apiClient.put(url, body, config).then((env) => env.data),
  patch: (url, body, config) =>
    apiClient.patch(url, body, config).then((env) => env.data),
  delete: (url, config) =>
    apiClient.delete(url, config).then((env) => env.data),
};
