import { z } from "zod";
import { DEFAULT_PAGE_OFFSET, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../constants/pagination";

export const listPaginationSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
  offset: z.number().int().min(0).default(DEFAULT_PAGE_OFFSET),
});

export type ListPaginationInput = z.infer<typeof listPaginationSchema>;
