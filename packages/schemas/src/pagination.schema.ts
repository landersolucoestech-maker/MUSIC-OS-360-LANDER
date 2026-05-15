import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  orderBy: z.string().optional(),
  ascending: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  search: z.string().optional(),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;
