import { z } from 'zod';

export const createAudit_logSchema = z.object({
  // Define fields here
});

export const updateAudit_logSchema = createAudit_logSchema.partial();

export type CreateAudit_logDto = z.infer<typeof createAudit_logSchema>;
export type UpdateAudit_logDto = z.infer<typeof updateAudit_logSchema>;
