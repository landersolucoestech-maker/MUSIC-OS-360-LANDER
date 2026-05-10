import { z } from "zod";

export const conteudoSchema = z.object({
  titulo: z.string()
    .min(1, "Título é obrigatório")
    .max(200, "Título deve ter no máximo 200 caracteres")
    .trim(),
  status: z.string().optional().or(z.literal("")),
  campanhaRelacionada: z.string().optional().or(z.literal("")),
  lancamentoId: z.string().optional().or(z.literal("")),
  descricao: z.string()
    .max(5000, "Descrição deve ter no máximo 5000 caracteres")
    .optional()
    .or(z.literal("")),
  legenda: z.string()
    .max(2200, "Legenda deve ter no máximo 2200 caracteres")
    .optional()
    .or(z.literal("")),
  horarioPublicacao: z.string().optional().or(z.literal("")),
});

export type ConteudoFormData = z.infer<typeof conteudoSchema>;
