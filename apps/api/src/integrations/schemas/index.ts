/**
 * integrations/schemas/index.ts
 * Shared Zod schemas for integration payloads.
 */

import { z } from 'zod';

export const oauthCallbackSchema = z.object({
  code:  z.string().min(1),
  state: z.string().min(1),
});

export const platformMetricsQuerySchema = z.object({
  artistId: z.string().optional(),
  period:   z.enum(['7d', '30d', '90d', '1y']).default('30d'),
  from:     z.string().optional(),
  to:       z.string().optional(),
});

export const integrationConfigureSchema = z.object({
  tenantId: z.string().uuid(),
  userId:   z.string().min(1).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type OAuthCallbackDto      = z.infer<typeof oauthCallbackSchema>;
export type PlatformMetricsQuery  = z.infer<typeof platformMetricsQuerySchema>;
export type IntegrationConfigureDto = z.infer<typeof integrationConfigureSchema>;
