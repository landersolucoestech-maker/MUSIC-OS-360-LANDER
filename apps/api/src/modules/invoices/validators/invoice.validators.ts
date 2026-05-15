import { z } from 'zod';

export const createInvoiceSchema = z.object({
  // Define fields here
});

export const updateInvoiceSchema = createInvoiceSchema.partial();

export type CreateInvoiceDto = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceDto = z.infer<typeof updateInvoiceSchema>;
