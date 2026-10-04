// Method + path → handler, one per endpoint the client calls. Mirrors
// api_specification.md, never the server's route files. A handler gets
// (store, { params, query, body }) and returns { status, data } or
// { status, error: { code, message, extra? } } — the real codes and envelopes,
// so the pages' error paths run in the demo too (demoResponses.js).

import { fail, ok, withUser } from "./demoResponses.js";
import { weekRoutes } from "./demoWeekRoutes.js";

const NOT_IN_DEMO = "Accounts and links aren't part of the demo.";

function projectRef(store, id) {
  const project = store.projects.find((p) => p._id === id);
  return project
    ? { _id: project._id, name: project.name, status: project.status }
    : null;
}

/** The API's `Me` (api_specification.md §1.10). */
export function meOf(store, user) {
  const owner = store.users.find((u) => u.isOwner);
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    projects: user.projectIds
      .map((id) => projectRef(store, id))
      .filter(Boolean),
    joinedAt: user.joinedAt,
    isOwner: user.isOwner,
    onLeave: user.onLeave,
    owner: owner ? { name: owner.name, email: owner.email } : null,
  };
}

const authRoutes = [
  // A1 — nobody signs up in the demo.
  ["get", "/auth/bootstrap", () => ok({ available: false })],
  ["post", "/auth/signup", () => fail(403, "SIGNUP_CLOSED", NOT_IN_DEMO)],
  ["post", "/auth/login", () => fail(403, "FORBIDDEN", NOT_IN_DEMO)],
  ["get", "/auth/me", withUser((store, req, user) => ok(meOf(store, user)))],
  [
    "patch",
    "/auth/me",
    withUser((store, { body }, user) => {
      const name = typeof body?.name === "string" ? body.name.trim() : "";
      if (name.length < 1 || name.length > 80) {
        return fail(422, "VALIDATION_FAILED", "Check the highlighted fields.", {
          fields: { name: "Enter a name of 1 to 80 characters." },
        });
      }
      user.name = name;
      return ok(meOf(store, user));
    }),
  ],
  [
    "post",
    "/auth/password",
    withUser((store, { body }, user) => {
      const next = body?.newPassword ?? "";
      if (next.length < 8 || next.length > 72) {
        return fail(422, "VALIDATION_FAILED", "Check the highlighted fields.", {
          fields: { newPassword: "Use 8 to 72 characters." },
        });
      }
      // No password is stored in the demo; the session simply carries on.
      return ok({ token: null, user: meOf(store, user) });
    }),
  ],
  ["post", "/auth/links/preview", () => fail(404, "LINK_INVALID", NOT_IN_DEMO)],
  ["post", "/auth/links/accept", () => fail(404, "LINK_INVALID", NOT_IN_DEMO)],
];

const ROUTES = [...authRoutes, ...weekRoutes].map(
  ([method, path, handler]) => ({
    method,
    handler,
    ...compile(path),
  }),
);

function compile(path) {
  const names = [];
  const source = path.replace(/:(\w+)/g, (_, name) => {
    names.push(name);
    return "([^/]+)";
  });
  return { pattern: new RegExp(`^${source}$`), names };
}

/** The handler and path params for a request, or null. */
export function matchRoute(method, url) {
  const path = url.split("?")[0];
  for (const route of ROUTES) {
    if (route.method !== method) continue;
    const match = route.pattern.exec(path);
    if (match) {
      const params = Object.fromEntries(
        route.names.map((name, i) => [name, decodeURIComponent(match[i + 1])]),
      );
      return { handler: route.handler, params };
    }
  }
  return null;
}

export function notFound() {
  return fail(404, "ROUTE_NOT_FOUND", "That isn't part of the demo.");
}
