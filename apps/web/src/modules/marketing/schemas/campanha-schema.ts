import { z } from "zod";

export const campanhaSchema = z.object({
  nome: z.string()
    .min(1, "Nome da campanha é obrigatório")
    .max(200, "Nome deve ter no máximo 200 caracteres")
    .trim(),
  artista_id: z.string().optional().or(z.literal("")),
  lancamento_id: z.string().optional().or(z.literal("")),
  plataformas: z.array(z.string()).min(1, "Selecione ao menos uma plataforma"),
  orcamentoDiario: z.number()
    .min(1, "Orçamento diário mínimo é R$ 1,00")
    .max(999999, "Orçamento muito alto"),
  duracao: z.number()
    .min(1, "Duração mínima é 1 dia")
    .max(365, "Duração máxima é 365 dias"),
  objetivo: z.string()
    .min(1, "Objetivo é obrigatório"),
  status: z.enum(["planejada", "ativa", "pausada", "concluida", "rascunho"]).default("planejada"),
  observacoes: z.string()
    .max(2000, "Observações deve ter no máximo 2000 caracteres")
    .optional()
    .or(z.literal("")),
});

export type CampanhaFormData = z.infer<typeof campanhaSchema>;
