import { z } from 'zod';

export const createContract_templateSchema = z.object({
  // Define fields here
});

export const updateContract_templateSchema = createContract_templateSchema.partial();

export type CreateContract_templateDto = z.infer<typeof createContract_templateSchema>;
export type UpdateContract_templateDto = z.infer<typeof updateContract_templateSchema>;
