import { api } from "./apiClient.js";

// A1–A8 (api_specification.md §2.1). Secrets travel in bodies only, never a URL.

/** A1 → { available } */
export const getBootstrap = () => api.get("/auth/bootstrap");

/** A2 → { token, user: Me } */
export const signUp = ({ name, email, password }) =>
  api.post("/auth/signup", { name, email, password });

/** A3 → { token, user: Me } */
export const login = ({ email, password }) =>
  api.post("/auth/login", { email, password });

/** A4 → Me */
export const getMe = () => api.get("/auth/me");

/** A5 → Me */
export const updateMe = ({ name }) => api.patch("/auth/me", { name });

/** A6 → { token, user: Me } */
export const changePassword = ({ currentPassword, newPassword }) =>
  api.post("/auth/password", { currentPassword, newPassword });

/** A7 → { purpose, email, role? } */
export const previewLink = ({ token }) =>
  api.post("/auth/links/preview", { token });

/** A8 → { token, user: Me }. `name` only for an invite. */
export const acceptLink = ({ token, password, name }) =>
  api.post(
    "/auth/links/accept",
    name ? { token, password, name } : { token, password },
  );
