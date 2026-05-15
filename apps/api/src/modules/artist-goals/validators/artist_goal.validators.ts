import { z } from 'zod';

export const createArtist_goalSchema = z.object({
  // Define fields here
});

export const updateArtist_goalSchema = createArtist_goalSchema.partial();

export type CreateArtist_goalDto = z.infer<typeof createArtist_goalSchema>;
export type UpdateArtist_goalDto = z.infer<typeof updateArtist_goalSchema>;
