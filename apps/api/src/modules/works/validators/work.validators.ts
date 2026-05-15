import { z } from 'zod';

export const createWorkSchema = z.object({
  // Define fields here
});

export const updateWorkSchema = createWorkSchema.partial();

export type CreateWorkDto = z.infer<typeof createWorkSchema>;
export type UpdateWorkDto = z.infer<typeof updateWorkSchema>;
