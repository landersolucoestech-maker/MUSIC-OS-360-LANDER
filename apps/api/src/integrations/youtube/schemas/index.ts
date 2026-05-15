import { z } from 'zod';

export const youtubeChannelQuerySchema = z.object({
  channelId: z.string().min(1),
});

export const youtubeAnalyticsSchema = z.object({
  channelId:  z.string().min(1),
  startDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  metrics:    z.array(z.string()).default(['views', 'estimatedMinutesWatched', 'subscribersGained']),
});

export type YouTubeChannelQuery  = z.infer<typeof youtubeChannelQuerySchema>;
export type YouTubeAnalyticsQuery = z.infer<typeof youtubeAnalyticsSchema>;
