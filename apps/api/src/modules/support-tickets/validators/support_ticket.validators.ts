import { z } from 'zod';

export const createSupport_ticketSchema = z.object({
  // Define fields here
});

export const updateSupport_ticketSchema = createSupport_ticketSchema.partial();

export type CreateSupport_ticketDto = z.infer<typeof createSupport_ticketSchema>;
export type UpdateSupport_ticketDto = z.infer<typeof updateSupport_ticketSchema>;
