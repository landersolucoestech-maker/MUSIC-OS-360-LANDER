import { z } from 'zod';

export const createEcad_reportSchema = z.object({
  // Define fields here
});

export const updateEcad_reportSchema = createEcad_reportSchema.partial();

export type CreateEcad_reportDto = z.infer<typeof createEcad_reportSchema>;
export type UpdateEcad_reportDto = z.infer<typeof updateEcad_reportSchema>;
