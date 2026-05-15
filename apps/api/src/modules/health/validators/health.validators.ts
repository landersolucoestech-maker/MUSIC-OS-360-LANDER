import { z } from 'zod';

export const createHealthSchema = z.object({
  // Define fields here
});

export const updateHealthSchema = createHealthSchema.partial();

export type CreateHealthDto = z.infer<typeof createHealthSchema>;
export type UpdateHealthDto = z.infer<typeof updateHealthSchema>;
