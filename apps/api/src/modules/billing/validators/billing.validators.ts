import { z } from 'zod';

export const createBillingSchema = z.object({
  // Define fields here
});

export const updateBillingSchema = createBillingSchema.partial();

export type CreateBillingDto = z.infer<typeof createBillingSchema>;
export type UpdateBillingDto = z.infer<typeof updateBillingSchema>;
