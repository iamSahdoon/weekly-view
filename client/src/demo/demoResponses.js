// Shared by the demo's route files: the response helpers and the signed-in guard.
// A handler returns { status, data } or { status, error: { code, message, extra? } } —
// the real codes and envelopes, so the pages' error paths run in the demo too.

export const ok = (data, status = 200) => ({ status, data });

export const fail = (status, code, message, extra) => ({
  status,
  error: { code, message, extra },
});

export function currentUser(store) {
  return store.users.find((u) => u._id === store.session.userId) ?? null;
}

// The demo has no sign-in: the chooser sets the session. With no one chosen, a
// request that needs a person is refused as FORBIDDEN — the adapter never
// answers 401, which would open the session-expiry modal.
export function withUser(handler) {
  return (store, req) => {
    const user = currentUser(store);
    if (!user) return fail(403, "FORBIDDEN", "Choose a perspective first.");
    return handler(store, req, user);
  };
}
