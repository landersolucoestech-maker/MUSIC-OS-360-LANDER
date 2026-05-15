import { z } from 'zod';

export const createPhonogramSchema = z.object({
  // Define fields here
});

export const updatePhonogramSchema = createPhonogramSchema.partial();

export type CreatePhonogramDto = z.infer<typeof createPhonogramSchema>;
export type UpdatePhonogramDto = z.infer<typeof updatePhonogramSchema>;
