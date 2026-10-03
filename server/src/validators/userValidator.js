import { z } from "zod";
import { ROLES } from "../constants/roles.js";
import { paginationQuery } from "../utils/paginate.js";
import { emailField } from "./authValidator.js";

// U1–U6, U9–U13 — api_specification.md §2.2.

const objectId = z.string().regex(/^[0-9a-f]{24}$/i, "Not a valid id");
const userParams = z.object({ userId: objectId });

// A comma list, each value checked against its enum (§1.7).
const commaList = (values) =>
  z
    .string()
    .transform((s) => s.split(",").map((v) => v.trim()))
    .pipe(z.array(z.enum(values)).min(1));

export const USER_STATUSES = Object.freeze(["invited", "active", "removed"]);
export const USER_SORTS = Object.freeze([
  "name",
  "joinedAt",
  "lastActivityAt",
  "reportsFiled",
]);

export const listUsersSchema = z.object({
  query: z.object({
    q: z.string().trim().min(1).max(100).optional(),
    role: commaList(ROLES).optional(),
    status: commaList(USER_STATUSES).optional(),
    project: objectId.optional(),
    sort: z.enum(USER_SORTS).default("name"),
    dir: z.enum(["asc", "desc"]).default("asc"),
    ...paginationQuery,
  }),
});

export const onLeaveSchema = z.object({});

export const userIdSchema = z.object({ params: userParams });

export const inviteSchema = z.object({
  body: z.object({
    email: emailField,
    role: z.enum(ROLES),
    projects: z.array(objectId).max(100).optional(),
  }),
});

export const roleSchema = z.object({
  params: userParams,
  body: z.object({ role: z.enum(ROLES) }),
});

export const leaveSchema = z.object({
  params: userParams,
  body: z.object({ onLeave: z.boolean() }),
});

export const emailSchema = z.object({
  params: userParams,
  body: z.object({ email: emailField }),
});
