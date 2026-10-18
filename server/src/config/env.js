import "dotenv/config";
import { z } from "zod";

// The JWT_SECRET placeholder in server/.env.example. It is long enough to pass the length
// check, so production refuses it by value: a host given the example would otherwise
// start with a secret anyone can read (owner decision, PR #30 review, 2026-10-18).
// Development and tests may use it.
export const EXAMPLE_JWT_SECRET =
  "replace-with-a-32-plus-character-random-string";

const schema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().default(5000),
    MONGODB_URI: z.string().min(1),
    JWT_SECRET: z.string().min(32), // short secrets are a real weakness, not a style nit
    JWT_EXPIRES_IN: z.string().default("5d"),
    CLIENT_URL: z.string().url(),
  })
  .superRefine((value, ctx) => {
    if (
      value.NODE_ENV === "production" &&
      value.JWT_SECRET === EXAMPLE_JWT_SECRET
    )
      ctx.addIssue({
        code: "custom",
        path: ["JWT_SECRET"],
        message: "JWT_SECRET is the example value; generate a new one",
      });
  });

/** Parses an environment object; the module below passes process.env. */
export function parseEnv(source) {
  return schema.safeParse(source);
}

const parsed = parseEnv(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
