import { z } from 'zod';

export const createAuthSchema = z.object({
  // Define fields here
});

export const updateAuthSchema = createAuthSchema.partial();

export type CreateAuthDto = z.infer<typeof createAuthSchema>;
export type UpdateAuthDto = z.infer<typeof updateAuthSchema>;
