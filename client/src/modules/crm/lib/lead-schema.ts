import { z } from "zod";

export const leadSchema = z.object({
  nome_contratante: z.string()
    .min(1, "Nome do contato é obrigatório")
    .max(150, "Nome deve ter no máximo 150 caracteres")
    .trim(),
  telefone: z.string()
    .min(1, "Telefone é obrigatório")
    .max(20, "Telefone deve ter no máximo 20 caracteres"),
  email: z.string()
    .email("Email inválido")
    .max(100, "Email deve ter no máximo 100 caracteres")
    .optional()
    .nullable()
    .or(z.literal("")),
  nome_empresa: z.string()
    .max(150, "Nome da empresa deve ter no máximo 150 caracteres")
    .trim()
    .optional()
    .nullable()
    .or(z.literal("")),
  documento: z.string()
    .max(20, "Documento deve ter no máximo 20 caracteres")
    .optional()
    .nullable()
    .or(z.literal("")),
  cargo: z.string()
    .max(100, "Cargo deve ter no máximo 100 caracteres")
    .trim()
    .optional()
    .nullable()
    .or(z.literal("")),
  sobrenome: z.string()
    .max(100, "Sobrenome deve ter no máximo 100 caracteres")
    .trim()
    .optional()
    .nullable()
    .or(z.literal("")),
  instagram: z.string()
    .max(100, "Instagram deve ter no máximo 100 caracteres")
    .optional()
    .nullable()
    .or(z.literal("")),
  website: z.string()
    .max(200, "Website deve ter no máximo 200 caracteres")
    .optional()
    .nullable()
    .or(z.literal("")),
  tipo_lead: z.string()
    .optional()
    .nullable()
    .or(z.literal("")),
  servicos_interesse: z.array(z.string())
    .optional()
    .nullable(),
  descricao_demanda: z.string()
    .max(2000, "Descrição deve ter no máximo 2000 caracteres")
    .trim()
    .optional()
    .nullable()
    .or(z.literal("")),
  nome_artista_banda: z.string()
    .max(150, "Nome do artista deve ter no máximo 150 caracteres")
    .trim()
    .optional()
    .nullable()
    .or(z.literal("")),
  genero_musical: z.string()
    .optional()
    .nullable()
    .or(z.literal("")),
  cidade_artista: z.string()
    .max(100, "Cidade deve ter no máximo 100 caracteres")
    .trim()
    .optional()
    .nullable()
    .or(z.literal("")),
  estado_artista: z.string()
    .max(2, "Estado deve ter 2 caracteres")
    .optional()
    .nullable()
    .or(z.literal("")),
  artista_interesse: z.string()
    .max(150, "Artista deve ter no máximo 150 caracteres")
    .trim()
    .optional()
    .nullable()
    .or(z.literal("")),
  tipo_evento: z.string()
    .optional()
    .nullable()
    .or(z.literal("")),
  data_evento: z.string()
    .optional()
    .nullable()
    .or(z.literal("")),
  cidade_evento: z.string()
    .max(100, "Cidade deve ter no máximo 100 caracteres")
    .trim()
    .optional()
    .nullable()
    .or(z.literal("")),
  estado_evento: z.string()
    .max(2, "Estado deve ter 2 caracteres")
    .optional()
    .nullable()
    .or(z.literal("")),
  nome_local_evento: z.string()
    .max(200, "Nome do local deve ter no máximo 200 caracteres")
    .trim()
    .optional()
    .nullable()
    .or(z.literal("")),
  endereco_evento: z.string()
    .max(300, "Endereço deve ter no máximo 300 caracteres")
    .trim()
    .optional()
    .nullable()
    .or(z.literal("")),
  capacidade_publico: z.number()
    .min(0, "Capacidade deve ser positiva")
    .optional()
    .nullable(),
  orcamento_estimado: z.number()
    .min(0, "Orçamento não pode ser negativo")
    .optional()
    .nullable(),
  origem_lead: z.string()
    .min(1, "Selecione a origem do lead"),
  status_lead: z.string()
    .min(1, "Selecione um status válido"),
  prioridade: z.enum(["alta", "media", "baixa"], {
    errorMap: () => ({ message: "Selecione uma prioridade válida" })
  }),
  probabilidade_fechamento: z.number()
    .min(0, "Probabilidade deve ser entre 0 e 100")
    .max(100, "Probabilidade deve ser entre 0 e 100"),
  valor_estimado_cache: z.number()
    .min(0, "Valor não pode ser negativo")
    .optional()
    .nullable(),
  comissao_percentual: z.number()
    .min(0, "Comissão deve ser entre 0 e 100")
    .max(100, "Comissão deve ser entre 0 e 100")
    .optional()
    .nullable(),
  tipo_contrato: z.string()
    .optional()
    .nullable()
    .or(z.literal("")),
  data_limite_retorno: z.string()
    .optional()
    .nullable()
    .or(z.literal("")),
  responsavel_id: z.string()
    .optional()
    .nullable()
    .or(z.literal("")),
  observacoes_internas: z.string()
    .max(2000, "Observações deve ter no máximo 2000 caracteres")
    .trim()
    .optional()
    .nullable()
    .or(z.literal("")),
  tags: z.array(z.string())
    .optional()
    .nullable(),
  temperatura_lead: z.string()
    .optional()
    .nullable()
    .or(z.literal("")),
  forma_pagamento: z.string()
    .optional()
    .nullable()
    .or(z.literal("")),
  validade_proposta: z.string()
    .optional()
    .nullable()
    .or(z.literal("")),
  campanha_marketing: z.string()
    .max(150, "Nome da campanha deve ter no máximo 150 caracteres")
    .trim()
    .optional()
    .nullable()
    .or(z.literal("")),
  metadata: z.record(z.unknown())
    .optional()
    .nullable(),
});

export type LeadFormData = z.infer<typeof leadSchema>;

export function formatZodErrors(errors: z.ZodError): Record<string, string> {
  const formattedErrors: Record<string, string> = {};
  errors.errors.forEach((error) => {
    const path = error.path.join(".");
    if (path && !formattedErrors[path]) {
      formattedErrors[path] = error.message;
    }
  });
  return formattedErrors;
}
