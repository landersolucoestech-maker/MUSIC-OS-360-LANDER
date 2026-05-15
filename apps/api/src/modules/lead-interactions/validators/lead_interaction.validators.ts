import { z } from 'zod';

export const createLead_interactionSchema = z.object({
  // Define fields here
});

export const updateLead_interactionSchema = createLead_interactionSchema.partial();

export type CreateLead_interactionDto = z.infer<typeof createLead_interactionSchema>;
export type UpdateLead_interactionDto = z.infer<typeof updateLead_interactionSchema>;
