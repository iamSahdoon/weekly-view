import { z } from "zod";
import { ROLES } from "../constants/roles.js";
import { WEEKDAYS } from "../constants/weekdays.js";
import { paginationQuery } from "../utils/paginate.js";
import { weekKey } from "./reportValidator.js";
import { objectId } from "./userValidator.js";

// C1–C5, V1–V4 — api_specification.md §2.6, §2.7.

const reportParams = z.object({ id: objectId });
const threadParams = reportParams.extend({ threadId: objectId });
const replyParams = threadParams.extend({ replyId: objectId });

const commentText = z.object({ text: z.string().trim().min(1).max(2000) });

// A comma list, each value checked by `item` (§1.7).
const commaList = (item) =>
  z
    .string()
    .transform((s) => s.split(",").map((v) => v.trim()))
    .pipe(z.array(item).min(1));

// ---------------------------------------------------------------- comments

export const dayCommentSchema = z.object({
  params: reportParams.extend({ weekday: z.enum(WEEKDAYS) }),
  body: commentText,
});

export const weekCommentSchema = z.object({
  params: reportParams,
  body: commentText,
});

export const replySchema = z.object({
  params: threadParams,
  body: commentText,
});

export const editThreadSchema = z.object({
  params: threadParams,
  body: commentText,
});

export const editReplySchema = z.object({
  params: replyParams,
  body: commentText,
});

export const deleteThreadSchema = z.object({ params: threadParams });

export const deleteReplySchema = z.object({ params: replyParams });

// ---------------------------------------------------------------- review

const revisionNumber = z.number().int().min(1);

export const approveSchema = z.object({
  params: reportParams,
  body: z.object({
    revisionNumber,
    comment: z.string().trim().max(2000).optional(),
  }),
});

export const sendBackSchema = z.object({
  params: reportParams,
  body: z.object({
    revisionNumber,
    comment: z
      .string()
      .trim()
      .min(10, "Write at least 10 characters")
      .max(2000),
  }),
});

// ---------------------------------------------------------------- the review desk

export const reviewDeskSchema = z.object({
  query: z
    .object({
      approval: z.enum(["requested", "all"]).default("requested"),
      person: commaList(objectId).optional(),
      project: commaList(objectId).optional(),
      weekFrom: weekKey.optional(),
      weekTo: weekKey.optional(),
      role: commaList(z.enum(ROLES)).optional(),
      sort: z.enum(["submittedAt", "weekKey"]).default("submittedAt"),
      dir: z.enum(["asc", "desc"]).default("asc"),
      ...paginationQuery,
    })
    .refine((q) => !q.weekFrom || !q.weekTo || q.weekFrom <= q.weekTo, {
      message: "Must be on or after weekFrom",
      path: ["weekTo"],
    }),
});

export const reviewDeskCountSchema = z.object({});
