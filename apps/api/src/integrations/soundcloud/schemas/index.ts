import { z } from 'zod';

export const soundcloudSearchSchema = z.object({
  q:     z.string().min(1),
  kind:  z.enum(['tracks', 'users', 'playlists']).default('tracks'),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const soundcloudUserTracksSchema = z.object({
  userId: z.coerce.number().int().positive(),
  limit:  z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type SoundCloudSearchQuery     = z.infer<typeof soundcloudSearchSchema>;
export type SoundCloudUserTracksQuery = z.infer<typeof soundcloudUserTracksSchema>;
