import { z } from 'zod';

export const createReleaseSchema = z.object({
  // Define fields here
});

export const updateReleaseSchema = createReleaseSchema.partial();

export type CreateReleaseDto = z.infer<typeof createReleaseSchema>;
export type UpdateReleaseDto = z.infer<typeof updateReleaseSchema>;
