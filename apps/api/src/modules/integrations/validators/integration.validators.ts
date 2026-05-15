import { z } from 'zod';

export const createIntegrationSchema = z.object({
  // Define fields here
});

export const updateIntegrationSchema = createIntegrationSchema.partial();

export type CreateIntegrationDto = z.infer<typeof createIntegrationSchema>;
export type UpdateIntegrationDto = z.infer<typeof updateIntegrationSchema>;
