import { z } from 'zod';

export const createArtistSchema = z.object({
  // Define fields here
});

export const updateArtistSchema = createArtistSchema.partial();

export type CreateArtistDto = z.infer<typeof createArtistSchema>;
export type UpdateArtistDto = z.infer<typeof updateArtistSchema>;
