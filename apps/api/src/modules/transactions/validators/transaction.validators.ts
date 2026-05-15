import { z } from 'zod';

export const createTransactionSchema = z.object({
  // Define fields here
});

export const updateTransactionSchema = createTransactionSchema.partial();

export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionDto = z.infer<typeof updateTransactionSchema>;
