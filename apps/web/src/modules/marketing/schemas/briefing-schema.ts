import { z } from "zod";

export const briefingSchema = z.object({
  titulo: z.string()
    .min(1, "Título é obrigatório")
    .max(200, "Título deve ter no máximo 200 caracteres")
    .trim(),
  campanhaRelacionada: z.string().optional().or(z.literal("")),
  prioridade: z.string().optional().or(z.literal("")),
  status: z.string().optional().or(z.literal("")),
  budget: z.string().optional().or(z.literal("")),
  prazoEntrega: z.string().optional().or(z.literal("")),
  objetivo: z.string()
    .max(1000, "Objetivo deve ter no máximo 1000 caracteres")
    .optional()
    .or(z.literal("")),
  publicoAlvo: z.string()
    .max(1000, "Público-alvo deve ter no máximo 1000 caracteres")
    .optional()
    .or(z.literal("")),
  descricao: z.string()
    .max(5000, "Descrição deve ter no máximo 5000 caracteres")
    .optional()
    .or(z.literal("")),
  entregaveis: z.array(z.string()).optional(),
});

export type BriefingFormData = z.infer<typeof briefingSchema>;
