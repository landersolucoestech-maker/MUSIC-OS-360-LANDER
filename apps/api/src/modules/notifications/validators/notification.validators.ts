import { z } from 'zod';

export const createNotificationSchema = z.object({
  // Define fields here
});

export const updateNotificationSchema = createNotificationSchema.partial();

export type CreateNotificationDto = z.infer<typeof createNotificationSchema>;
export type UpdateNotificationDto = z.infer<typeof updateNotificationSchema>;
