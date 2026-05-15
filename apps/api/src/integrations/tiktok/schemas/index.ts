import { z } from 'zod';

export const tiktokVideoListSchema = z.object({
  openId:   z.string().min(1),
  maxCount: z.coerce.number().int().min(1).max(20).default(10),
  cursor:   z.coerce.number().int().min(0).default(0),
});

export const tiktokAdInsightsSchema = z.object({
  advertiserId: z.string().min(1),
  startDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  groupBy:      z.array(z.string()).default(['STAT_GROUP_BY_CAMPAIGN_ID']),
});

export type TikTokVideoListQuery  = z.infer<typeof tiktokVideoListSchema>;
export type TikTokAdInsightsQuery = z.infer<typeof tiktokAdInsightsSchema>;
