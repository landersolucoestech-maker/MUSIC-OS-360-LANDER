import { z } from "zod";

export const tenantIdSchema = z
  .string()
  .uuid({ message: "tenant_id deve ser um UUID válido" });

export const tenantScopedSchema = z.object({
  tenant_id: tenantIdSchema,
});

export const tenantSlugSchema = z
  .string()
  .min(3)
  .max(63)
  .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens");
