import { z } from 'zod';

export const metaInsightsSchema = z.object({
  pageId:  z.string().min(1),
  period:  z.enum(['day', 'week', 'days_28', 'month']).default('days_28'),
  metrics: z.array(z.string()).default(['page_impressions', 'page_reach', 'page_engaged_users']),
});

export const metaAdCampaignQuerySchema = z.object({
  adAccountId: z.string().min(1),
  status:      z.enum(['ACTIVE', 'PAUSED', 'ALL']).default('ALL'),
  limit:       z.coerce.number().int().min(1).max(100).default(25),
});

export type MetaInsightsQuery      = z.infer<typeof metaInsightsSchema>;
export type MetaAdCampaignQuery    = z.infer<typeof metaAdCampaignQuerySchema>;
