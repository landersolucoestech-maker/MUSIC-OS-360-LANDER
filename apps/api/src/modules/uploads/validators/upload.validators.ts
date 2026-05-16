/**
 * modules/uploads/validators/upload.validators.ts
 *
 * Schemas Zod espelhando o PresignUploadDto para validação programática
 * e documentação de tipos independente do class-validator.
 */

import { z } from 'zod';

const UPLOAD_CATEGORIES = ['documents', 'images', 'audio', 'spreadsheets'] as const;

export const presignUploadSchema = z.object({
  fileName:  z.string().min(1).max(500),
  mimeType:  z.string().min(1).max(255),
  sizeBytes: z.number().int().positive(),
  category:  z.enum(UPLOAD_CATEGORIES),
  entity:    z.string().max(100).optional(),
  entityId:  z.string().max(255).optional(),
});

export const confirmUploadSchema = z.object({
  fileId: z.string().uuid(),
});

export type PresignUploadInput  = z.infer<typeof presignUploadSchema>;
export type ConfirmUploadInput  = z.infer<typeof confirmUploadSchema>;
export type UploadCategory      = (typeof UPLOAD_CATEGORIES)[number];
