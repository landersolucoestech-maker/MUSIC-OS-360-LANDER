import { z } from 'zod';

export const createTakedownSchema = z.object({
  // Define fields here
});

export const updateTakedownSchema = createTakedownSchema.partial();

export type CreateTakedownDto = z.infer<typeof createTakedownSchema>;
export type UpdateTakedownDto = z.infer<typeof updateTakedownSchema>;
