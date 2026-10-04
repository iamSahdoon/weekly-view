import { beforeAll, describe, expect, it } from "vitest";
import { apiClient } from "../../services/apiClient.js";
import { createDemoAdapter } from "../demoAdapter.js";
import { createDemoStore } from "../demoStore.js";
import { PERSPECTIVES } from "../fixtures.js";

// Every function in services/ answered by the demo adapter (frontend_architecture.md
// §11.5). A service gaining a function without a case here fails the first test;
// a case answered by the "no such route" 404 fails the second. Each case checks
// the keys its hook reads, or the real error code a page expects.

const services = import.meta.glob("../../services/*Service.js", {
  eager: true,
});

const ME_KEYS = [
  "_id",
  "name",
  "email",
  "role",
  "status",
  "projects",
  "joinedAt",
  "isOwner",
  "onLeave",
  "owner",
];
const hasKeys = (keys) => (data) =>
  expect(Object.keys(data)).toEqual(expect.arrayContaining(keys));
const rejects = (code) => ({ rejects: code });

const CASES = {
  authService: {
    getBootstrap: { args: [], check: hasKeys(["available"]) },
    signUp: {
      args: [{ name: "A", email: "a@example.com", password: "password1" }],
      ...rejects("SIGNUP_CLOSED"),
    },
    login: {
      args: [{ email: "imali@example.com", password: "password1" }],
      ...rejects("FORBIDDEN"),
    },
    getMe: { args: [], check: hasKeys(ME_KEYS) },
    updateMe: {
      args: [{ name: "Imali Jayasuriya" }],
      check: (me) => expect(me.name).toBe("Imali Jayasuriya"),
    },
    changePassword: {
      args: [{ currentPassword: "x", newPassword: "password2" }],
      check: (data) => hasKeys(ME_KEYS)(data.user),
    },
    previewLink: { args: [{ token: "sample" }], ...rejects("LINK_INVALID") },
    acceptLink: {
      args: [{ token: "sample", password: "password1" }],
      ...rejects("LINK_INVALID"),
    },
  },
};

const moduleName = (path) => path.split("/").pop().replace(".js", "");
const functionsOf = (module) =>
  Object.entries(module).filter(([, value]) => typeof value === "function");

beforeAll(() => {
  const store = createDemoStore();
  store.session.userId = PERSPECTIVES.member;
  apiClient.defaults.adapter = createDemoAdapter(store, { latency: 0 });
});

describe("demo coverage", () => {
  it("has a case for every service function", () => {
    const missing = [];
    for (const [path, module] of Object.entries(services)) {
      for (const [name] of functionsOf(module)) {
        if (!CASES[moduleName(path)]?.[name])
          missing.push(`${moduleName(path)}.${name}`);
      }
    }
    expect(missing).toEqual([]);
  });

  for (const [path, module] of Object.entries(services)) {
    for (const [name, fn] of functionsOf(module)) {
      const testCase = CASES[moduleName(path)]?.[name];
      if (!testCase) continue;
      it(`answers ${moduleName(path)}.${name}`, async () => {
        if (testCase.rejects) {
          const error = await fn(...testCase.args).catch((e) => e);
          expect(error.name).toBe("ApiError");
          expect(error.code).toBe(testCase.rejects);
        } else {
          testCase.check(await fn(...testCase.args));
        }
      });
    }
  }

  it("never reaches the network: an unknown route is the 404 envelope", async () => {
    const error = await apiClient.get("/nowhere").catch((e) => e);
    expect(error.code).toBe("ROUTE_NOT_FOUND");
    expect(error.httpStatus).toBe(404);
  });
});
