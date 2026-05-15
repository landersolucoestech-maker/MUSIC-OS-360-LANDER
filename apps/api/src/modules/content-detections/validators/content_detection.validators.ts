import { z } from 'zod';

export const createContent_detectionSchema = z.object({
  // Define fields here
});

export const updateContent_detectionSchema = createContent_detectionSchema.partial();

export type CreateContent_detectionDto = z.infer<typeof createContent_detectionSchema>;
export type UpdateContent_detectionDto = z.infer<typeof updateContent_detectionSchema>;
