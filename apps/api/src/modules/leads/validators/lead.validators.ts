import { z } from 'zod';

export const createLeadSchema = z.object({
  // Define fields here
});

export const updateLeadSchema = createLeadSchema.partial();

export type CreateLeadDto = z.infer<typeof createLeadSchema>;
export type UpdateLeadDto = z.infer<typeof updateLeadSchema>;
