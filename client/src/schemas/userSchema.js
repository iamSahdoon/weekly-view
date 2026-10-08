import { z } from "zod";
import { ROLES } from "../lib/constants.js";

// The forms on the people pages and the Account page, mirroring U3, U12, A5 and A6
// (api_specification.md §2.1–§2.2, §2.8). Messages are plain sentences.

const email = z
  .string()
  .trim()
  .min(1, "Enter an email.")
  .pipe(z.email("Enter an email address like name@example.com."));

export const inviteSchema = z.object({
  email,
  role: z.enum(ROLES, { error: "Choose a role." }),
  projects: z.array(z.string()),
});

export const changeEmailSchema = z.object({ email });

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(80, "Use 80 characters or fewer."),
});

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z
      .string()
      .min(8, "Use at least 8 characters.")
      .max(72, "Use 72 characters or fewer."),
    confirm: z.string(),
  })
  .refine((values) => values.newPassword === values.confirm, {
    path: ["confirm"],
    message: "The two passwords don't match.",
  });

export const holidaySchema = z.object({
  date: z.string().refine((v) => v.length > 0, "Pick a date."),
  name: z
    .string()
    .trim()
    .min(1, "Name the holiday.")
    .max(100, "Use 100 characters or fewer."),
});
