import { z } from 'zod';

export const createBriefingSchema = z.object({
  // Define fields here
});

export const updateBriefingSchema = createBriefingSchema.partial();

export type CreateBriefingDto = z.infer<typeof createBriefingSchema>;
export type UpdateBriefingDto = z.infer<typeof updateBriefingSchema>;
