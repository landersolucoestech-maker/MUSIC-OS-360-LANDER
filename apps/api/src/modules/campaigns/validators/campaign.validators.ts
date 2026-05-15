import { z } from 'zod';

export const createCampaignSchema = z.object({
  // Define fields here
});

export const updateCampaignSchema = createCampaignSchema.partial();

export type CreateCampaignDto = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignDto = z.infer<typeof updateCampaignSchema>;
