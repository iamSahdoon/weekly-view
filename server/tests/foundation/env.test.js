import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { EXAMPLE_JWT_SECRET, parseEnv } from "../../src/config/env.js";

// Owner decision (PR #30 review, 2026-10-18): production refuses the JWT_SECRET copied from
// server/.env.example; development and tests may keep using it. Nothing here connects to a
// database: env.js only parses.

const SERVER = fileURLToPath(new URL("../..", import.meta.url));
const BASE = {
  MONGODB_URI: "mongodb://in-memory.invalid/weeklyview-test",
  CLIENT_URL: "https://weeklyview.example.app",
};
const MESSAGE = "JWT_SECRET is the example value; generate a new one";

describe("config/env.js", () => {
  it("knows the example value that server/.env.example ships", () => {
    const example = readFileSync(`${SERVER}/.env.example`, "utf8");
    expect(example).toMatch(
      new RegExp(`^JWT_SECRET=${EXAMPLE_JWT_SECRET}$`, "m"),
    );
  });

  it("refuses the example JWT_SECRET in production, with a clear message", () => {
    const result = parseEnv({
      ...BASE,
      NODE_ENV: "production",
      JWT_SECRET: EXAMPLE_JWT_SECRET,
    });
    expect(result.success).toBe(false);
    expect(result.error.issues).toEqual([
      expect.objectContaining({ path: ["JWT_SECRET"], message: MESSAGE }),
    ]);
  });

  it("accepts the example JWT_SECRET in development and test", () => {
    for (const NODE_ENV of ["development", "test", undefined])
      expect(
        parseEnv({ ...BASE, NODE_ENV, JWT_SECRET: EXAMPLE_JWT_SECRET }).success,
      ).toBe(true);
  });

  it("accepts any other secret of 32+ characters in production, and still refuses short ones", () => {
    const ok = parseEnv({
      ...BASE,
      NODE_ENV: "production",
      JWT_SECRET: "a".repeat(64),
    });
    expect(ok.success).toBe(true);
    expect(
      parseEnv({ ...BASE, NODE_ENV: "production", JWT_SECRET: "short" })
        .success,
    ).toBe(false);
  });

  it("stops a production process at start-up and prints why", () => {
    const run = (NODE_ENV) =>
      spawnSync(
        process.execPath,
        ["--input-type=module", "-e", 'await import("./src/config/env.js")'],
        {
          cwd: SERVER,
          encoding: "utf8",
          env: {
            PATH: process.env.PATH,
            ...BASE,
            NODE_ENV,
            JWT_SECRET: EXAMPLE_JWT_SECRET,
          },
        },
      );
    const prod = run("production");
    expect(prod.status).toBe(1);
    expect(prod.stderr).toContain("Invalid environment configuration");
    expect(prod.stderr).toContain(MESSAGE);
    expect(run("development").status).toBe(0);
  });
});
