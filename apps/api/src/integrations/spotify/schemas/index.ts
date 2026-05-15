import { z } from 'zod';

export const spotifySearchSchema = z.object({
  q:     z.string().min(1),
  type:  z.enum(['artist', 'track', 'album']).default('artist'),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const spotifyArtistMetricsSchema = z.object({
  artistId: z.string().min(1),
  period:   z.enum(['7d', '30d', '90d']).default('30d'),
});

export type SpotifySearchQuery        = z.infer<typeof spotifySearchSchema>;
export type SpotifyArtistMetricsQuery = z.infer<typeof spotifyArtistMetricsSchema>;
