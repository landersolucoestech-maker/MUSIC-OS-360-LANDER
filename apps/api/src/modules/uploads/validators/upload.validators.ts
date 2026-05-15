import { z } from 'zod';

export const createUploadSchema = z.object({
  // Define fields here
});

export const updateUploadSchema = createUploadSchema.partial();

export type CreateUploadDto = z.infer<typeof createUploadSchema>;
export type UpdateUploadDto = z.infer<typeof updateUploadSchema>;
