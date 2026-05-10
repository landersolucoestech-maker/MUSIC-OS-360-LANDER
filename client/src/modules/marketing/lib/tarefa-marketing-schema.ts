import { z } from "zod";

export const tarefaMarketingSchema = z.object({
  titulo: z.string()
    .min(1, "Título é obrigatório")
    .max(200, "Título deve ter no máximo 200 caracteres")
    .trim(),
  descricao: z.string()
    .max(2000, "Descrição deve ter no máximo 2000 caracteres")
    .optional()
    .or(z.literal("")),
  campanhaRelacionada: z.string().optional().or(z.literal("")),
  responsavel: z.string().max(150, "Nome deve ter no máximo 150 caracteres").optional().or(z.literal("")),
  prioridade: z.string().optional().or(z.literal("")),
  status: z.string().optional().or(z.literal("")),
  categoria: z.string().optional().or(z.literal("")),
  dataEntrega: z.date().optional().nullable(),
});

export type TarefaMarketingFormData = z.infer<typeof tarefaMarketingSchema>;
