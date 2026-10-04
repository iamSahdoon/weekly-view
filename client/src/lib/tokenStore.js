// The JWT in localStorage `wv_token` (frontend_architecture.md §2). Every access
// is wrapped: with storage blocked the app runs with no token.

const KEY = "wv_token";

export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem(KEY, token);
    } catch {
      // Storage blocked: the session lasts as long as the page.
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // Nothing stored, nothing to clear.
    }
  },
};
