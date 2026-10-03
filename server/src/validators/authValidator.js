import { z } from "zod";

// A1–A8 — api_specification.md §2.1.

export const nameField = z.string().trim().min(1).max(80);
export const emailField = z.string().trim().toLowerCase().pipe(z.email());
export const passwordField = z.string().min(8).max(72); // bcrypt's input limit
const linkTokenField = z.string().min(1).max(200);

export const bootstrapSchema = z.object({});

export const signupSchema = z.object({
  body: z.object({
    name: nameField,
    email: emailField,
    password: passwordField,
  }),
});

// Only shape here: login never says which part was wrong.
export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().min(1).max(254),
    password: z.string().min(1).max(200),
  }),
});

export const meSchema = z.object({});

export const updateMeSchema = z.object({
  body: z.object({ name: nameField }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1).max(200),
    newPassword: passwordField,
  }),
});

export const linkPreviewSchema = z.object({
  body: z.object({ token: linkTokenField }),
});

// `name` is required for an invite; the service checks it once it knows the purpose.
export const linkAcceptSchema = z.object({
  body: z.object({
    token: linkTokenField,
    password: passwordField,
    name: nameField.optional(),
  }),
});
