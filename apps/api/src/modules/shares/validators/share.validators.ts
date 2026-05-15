import { z } from 'zod';

export const createShareSchema = z.object({
  // Define fields here
});

export const updateShareSchema = createShareSchema.partial();

export type CreateShareDto = z.infer<typeof createShareSchema>;
export type UpdateShareDto = z.infer<typeof updateShareSchema>;
