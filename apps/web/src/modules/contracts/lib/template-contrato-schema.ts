import { z } from "zod";

export const templateContratoSchema = z.object({
  nome: z.string()
    .min(1, "Nome é obrigatório")
    .max(150, "Nome deve ter no máximo 150 caracteres")
    .trim(),
  tipo_servico: z.string()
    .min(1, "Tipo de contrato é obrigatório"),
  ativo: z.boolean().default(true),
});

export type TemplateContratoFormData = z.infer<typeof templateContratoSchema>;
