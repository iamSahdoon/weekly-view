import { z } from "zod";

// Client-side schemas for the auth forms (frontend_architecture.md §6.1). They
// mirror api_specification.md §2.1's limits; messages are plain sentences.

const email = z
  .string()
  .trim()
  .min(1, "Enter your email.")
  .pipe(z.email("Enter an email address like name@example.com."));

const name = z
  .string()
  .trim()
  .min(1, "Enter your name.")
  .max(80, "Use 80 characters or fewer.");

const newPassword = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use 72 characters or fewer.");

// Login checks shape only: the server gives one answer for every failure.
export const signInSchema = z.object({
  email: z.string().trim().min(1, "Enter your email."),
  password: z.string().min(1, "Enter your password."),
});

export const signUpSchema = z.object({ name, email, password: newPassword });

export const acceptInviteSchema = z.object({ name, password: newPassword });

export const resetPasswordSchema = z
  .object({ password: newPassword, confirm: z.string() })
  .refine((values) => values.password === values.confirm, {
    path: ["confirm"],
    message: "The two passwords don't match.",
  });
