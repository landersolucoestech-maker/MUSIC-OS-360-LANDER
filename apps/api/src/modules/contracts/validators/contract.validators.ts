import { z } from 'zod';

export const createContractSchema = z.object({
  // Define fields here
});

export const updateContractSchema = createContractSchema.partial();

export type CreateContractDto = z.infer<typeof createContractSchema>;
export type UpdateContractDto = z.infer<typeof updateContractSchema>;
