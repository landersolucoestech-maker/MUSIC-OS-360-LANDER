import { z } from 'zod';

export const createHrSchema = z.object({
  // Define fields here
});

export const updateHrSchema = createHrSchema.partial();

export type CreateHrDto = z.infer<typeof createHrSchema>;
export type UpdateHrDto = z.infer<typeof updateHrSchema>;
