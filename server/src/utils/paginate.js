import { z } from "zod";

export const PAGE_LIMITS = Object.freeze([20, 50, 100]);

// Spread into a list endpoint's query schema: z.object({ ...paginationQuery, ... }).
export const paginationQuery = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .refine((n) => PAGE_LIMITS.includes(n), {
      message: "Must be 20, 50 or 100",
    })
    .default(20),
};

export function pageWindow({ page, limit }) {
  return { skip: (page - 1) * limit, limit };
}

export function pageMeta({ page, limit, total }) {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

export function paginated(items, { page, limit, total }) {
  return { items, meta: pageMeta({ page, limit, total }) };
}
