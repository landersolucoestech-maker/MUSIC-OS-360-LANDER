import { z } from 'zod';

export const createAiSchema = z.object({
  // Define fields here
});

export const updateAiSchema = createAiSchema.partial();

export type CreateAiDto = z.infer<typeof createAiSchema>;
export type UpdateAiDto = z.infer<typeof updateAiSchema>;
